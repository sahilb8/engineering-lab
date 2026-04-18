# metrics/ — Latency Histogram & Error Tracking

## What this package does
Provides thread-safe data structures for recording latency observations (Histogram) and tracking error rates (ErrorTracker). These are the core measurement primitives — middleware writes to them, health checker reads from them.

## Key Go concepts used

### sync.RWMutex — Read-Write Lock
```go
type Histogram struct {
    latencyRecords []float64
    mu             sync.RWMutex
}
```
- Go slices are NOT safe for concurrent access. `net/http` serves each request in its own goroutine, so multiple goroutines hit the slice simultaneously.
- `RWMutex` is better than `Mutex` when reads are more frequent than writes:
  - `Lock()` / `Unlock()` — exclusive. One writer at a time, blocks everyone.
  - `RLock()` / `RUnlock()` — shared. Multiple readers at once, only blocks writers.
- `Record()` uses `Lock` (mutates the slice). `Percentile()` and `Count()` use `RLock` (read-only).
- Always `defer Unlock()` to prevent deadlocks if the function returns early or panics.

### Defensive copy before sorting
```go
func (h *Histogram) Percentile(n float64) (float64, error) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    latencyRecordsCopy := make([]float64, len(h.latencyRecords))
    copy(latencyRecordsCopy, h.latencyRecords)
    sort.Float64s(latencyRecordsCopy)

    return latencyRecordsCopy[int(float64(len(latencyRecordsCopy)-1)*n/100)], nil
}
```
- `sort.Float64s` sorts **in place** — it mutates the slice.
- If we sorted `h.latencyRecords` directly, the original data would be reordered. Future `Record()` calls would append to a sorted slice, breaking the insertion order.
- `copy()` creates a separate slice in memory. Sorting the copy leaves the original untouched.
- We hold `RLock` (not `Lock`) because we're only reading `h.latencyRecords` — the mutation happens on the copy.

### Percentile calculation — nearest-rank method
```go
return latencyRecordsCopy[int(float64(len(latencyRecordsCopy)-1)*n/100)], nil
```
```
Formula: index = (percentile / 100) * (n - 1)

With [10, 20, 30, 40, 50]:
  p50 → 0.50 * 4 = 2.0 → sorted[2] = 30  (median)
  p95 → 0.95 * 4 = 3.8 → int(3.8) = 3 → sorted[3] = 40
  p99 → 0.99 * 4 = 3.96 → int(3.96) = 3 → sorted[3] = 40
```
- Truncation via `int()` picks the nearest rank below. For small datasets, p95 and p99 may return the same value. With 100+ data points, they diverge meaningfully.

### Sentinel errors — package-level error values
```go
var ErrNoData = errors.New("no data points recorded")
```
- Exported (`E` uppercase) so other packages can check: `errors.Is(err, metrics.ErrNoData)`.
- `errors.Is` compares by **identity** (same pointer in memory), NOT by string content.
- If `Percentile()` created `errors.New("no data...")` inline each time, `errors.Is` would fail — each call creates a different object. The sentinel must be defined once and reused.

### Return (value, error) — Go's error pattern
```go
func (h *Histogram) Percentile(n float64) (float64, error) {
    if n < 0 || n > 100 {
        return 0, fmt.Errorf("percentile must be between 0 and 100, got %.2f", n)
    }
    if len(h.latencyRecords) == 0 {
        return 0, ErrNoData
    }
    return result, nil  // nil = success
}
```
- Go has no exceptions. Functions that can fail return `error` as the last value.
- Caller MUST check: `val, err := histogram.Percentile(99); if err != nil { ... }`
- `fmt.Errorf` for descriptive one-off errors. Sentinel vars for errors the caller needs to distinguish.

### ErrorTracker — atomic counting with mutex
```go
func (e *ErrorTracker) RecordError() {
    e.mu.Lock()
    defer e.mu.Unlock()
    e.totalRequests++
    e.errorCount++
}

func (e *ErrorTracker) ErrorRate() float64 {
    e.mu.RLock()
    defer e.mu.RUnlock()
    if e.totalRequests == 0 {
        return 0  // avoid division by zero
    }
    return float64(e.errorCount) / float64(e.totalRequests)
}
```
- `RecordError` increments BOTH counters — an error is also a request.
- `ErrorRate` returns a float between 0.0 and 1.0. Multiply by 100 for percentage.
- Division by zero check: without it, `0/0` would be NaN in Go.
