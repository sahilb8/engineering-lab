# health/ — Health Check Logic

## What this package does
Evaluates system health by comparing latency percentiles and error rates against configurable thresholds. Returns a status: Healthy, Degraded, or Unhealthy.

## DDIA connection
Chapter 1 argues that percentiles (p50, p95, p99) are better than averages for measuring performance. This package implements that — health is determined by tail latency, not average latency.

## Key Go concepts used

### Maps as configuration
```go
type HealthConfig struct {
    Thresholds   map[float64]float64  // percentile → max acceptable ms
    MaxErrorRate float64
}
```
- `map[float64]float64` maps percentile numbers to thresholds: `{50: 100, 95: 300, 99: 500}`.
- Meaning: p50 should be under 100ms, p95 under 300ms, p99 under 500ms.
- Maps are flexible — you can add p999 without changing the code.

### Iterating over map keys
```go
for percentile, threshold := range cfg.Thresholds {
    p, err := histogram.Percentile(percentile)
    if p > threshold {
        health["status"] = "Degraded"
    }
}
```
- `range` on a map gives `key, value` pairs.
- Map iteration order is **random** in Go — don't depend on order.
- Each percentile is checked independently. If ANY exceeds its threshold, status becomes Degraded.

### Three-tier health status
```
Healthy   → all percentiles within thresholds AND error rate below max
Degraded  → one or more percentiles exceed thresholds
Unhealthy → error rate exceeds MaxErrorRate (overrides Degraded)
```
- Status starts at "Healthy" and can only get worse.
- Error rate check runs last and overrides everything — high errors = unhealthy regardless of latency.

### Error discrimination with errors.Is
```go
p, err := histogram.Percentile(percentile)
if err != nil {
    if errors.Is(err, metrics.ErrNoData) {
        health[percentileKey(percentile)] = "No data"
        continue
    } else {
        return nil, fmt.Errorf("failed to calculate percentile: %w", err)
    }
}
```
- Two different error outcomes from one call:
  - `ErrNoData` — no requests yet, normal at startup. Show "No data", keep checking.
  - Any other error — something unexpected. Bail out, return error to caller.
- `errors.Is` checks by identity — the `ErrNoData` here must be the same variable defined in `metrics` package.
- `%w` in `fmt.Errorf` wraps the original error — preserves the chain so callers can inspect it.

### fmt.Sprintf for formatting
```go
health["error_rate"] = fmt.Sprintf("%.2f%%", errorRate*100)
health[percentileKey(percentile)] = fmt.Sprintf("%.2fms", p)
```
- `%.2f` — float with 2 decimal places.
- `%%` — literal `%` sign (escaped, because `%` is special in format strings).
- `0.3 * 100` → `"30.00%"`.

### Function vs method
```go
func GetHealth(cfg HealthConfig, histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker) (map[string]string, error)
```
- This is a plain function, not a method on a struct.
- Dependencies are passed as parameters each time.
- The handler's `Checker` struct stores these dependencies and calls `GetHealth` from its method — see handler/NOTES.md for why.
