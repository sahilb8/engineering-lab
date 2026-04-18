# fault/ — Fault Injection Middleware

## What this package does
An HTTP middleware that randomly injects failures into requests — errors, latency, and hangs. This simulates real-world faults (network issues, service crashes, deadlocks) so you can test how the system degrades. Inspired by Netflix's Chaos Monkey philosophy.

## DDIA connection
Chapter 1 distinguishes **faults** (one component deviating from spec) from **failures** (system-level breakdown). This package creates faults — the rest of the system must tolerate them without failing.

## Key Go concepts used

### Middleware pattern — function returning a function
```go
func NewInjector(cfg FaultConfig) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // inject faults here
            next.ServeHTTP(w, r)  // call original handler
        })
    }
}
```
- `NewInjector` returns a middleware: `func(http.Handler) http.Handler`.
- The middleware takes the "next" handler and returns a new handler that wraps it.
- The inner function is the actual request handler — it decides to inject faults or pass through.
- Three levels of nesting: config → middleware → request handler.

### Why the function signature is `func(http.Handler) http.Handler`
```go
// Usage in main.go:
faultMiddleware := fault.NewInjector(cfg)           // returns middleware
wrapped := faultMiddleware(http.HandlerFunc(handler)) // apply to a handler
mux.Handle("/process", wrapped)
```
- This signature is the standard Go middleware convention.
- It composes: `middlewareA(middlewareB(handler))` — A wraps B wraps handler.

### Closures capture variables by reference
```go
func NewInjector(cfg FaultConfig) func(http.Handler) http.Handler {
    cfg.mu = &sync.Mutex{}  // created ONCE
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            cfg.mu.Lock()  // every request uses the SAME mutex
```
- The returned function "closes over" `cfg` — it captures the variable, not a copy.
- Every request handler sees the same `cfg` instance.
- `cfg.mu` is a pointer (`*sync.Mutex`), so all closures point to the same mutex in memory. Copying a pointer doesn't create a new mutex.

### Why the mutex exists — protecting the PRNG
```go
cfg.mu.Lock()
hangFail := cfg.Rand.Float64() < cfg.HangRate && cfg.HangRate > 0
errorFail := cfg.Rand.Float64() < cfg.ErrorRate && cfg.ErrorRate > 0
sleepDuration := 0
if cfg.LatencyMs > 0 {
    sleepDuration = cfg.Rand.IntN(cfg.LatencyMs)
}
cfg.mu.Unlock()
```
- `rand.Rand` is NOT thread-safe. Multiple goroutines calling it simultaneously corrupt its internal state.
- The mutex serializes access to the random generator only — the rest of the request runs freely outside the lock.
- Minimal lock scope: generate all random values, unlock, then act on them.

### Seeded PRNG for reproducibility
```go
cfg.Rand = rand.New(rand.NewPCG(42, 1024))
```
- `math/rand/v2` with `PCG` (Permuted Congruential Generator).
- Same seed (42, 1024) = same sequence of random numbers every run.
- This makes fault injection **deterministic** — if a test fails, you get the exact same fault pattern on re-run.
- Two parameters: seed (starting state) + stream (which sequence).

### Three fault types

**Error injection:**
```go
if errorFail {
    http.Error(w, "Injected fault", http.StatusInternalServerError)
    return  // short-circuit — handler never runs
}
```
- Returns 500 immediately. `return` prevents `next.ServeHTTP` from running.

**Latency injection:**
```go
if sleepDuration > 0 {
    time.Sleep(time.Duration(sleepDuration) * time.Millisecond)
}
next.ServeHTTP(w, r)  // handler still runs, just delayed
```
- Adds random delay, then passes through. The handler runs normally, just late.

**Hang injection:**
```go
if hangFail {
    <-r.Context().Done()  // blocks until client cancels
    return
}
```
- `r.Context().Done()` returns a channel that closes when the request is cancelled (client disconnects, timeout, etc.).
- `<-` blocks forever until that happens — simulates a deadlock or stuck process.
- The handler never runs. The connection stays open, consuming resources.

### Never copy a mutex
```go
type FaultConfig struct {
    mu *sync.Mutex  // pointer, not value
}
```
- `mu` is `*sync.Mutex` (pointer), not `sync.Mutex` (value).
- If it were a value, passing `FaultConfig` by value would copy the mutex — the copy gets its own independent lock state, defeating the purpose.
- Go's vet tool warns: "passes lock by value" if you get this wrong.
