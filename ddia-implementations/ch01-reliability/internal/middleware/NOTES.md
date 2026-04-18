# middleware/ — Latency Measurement Middleware

## What this package does
Wraps HTTP handlers to measure request latency and track success/error counts. Sits in front of the fault injector and handler, so it captures the total time including any injected faults.

## Request flow
```
Request → LatencyCalculator → FaultInjector → ProcessHandler → Response
              ↓                     ↓                ↓
         start timer          maybe inject fault    do work
              ↓                                      ↓
         record latency ←←←←←←←←←←←←←←←←←← response comes back
         record success/error
         log request
```

## Key Go concepts used

### statusRecorder — intercepting the HTTP status code
```go
type statusRecorder struct {
    http.ResponseWriter  // embedded
    statusCode int
}

func (sr *statusRecorder) WriteHeader(code int) {
    sr.statusCode = code                   // capture
    sr.ResponseWriter.WriteHeader(code)    // pass through
}
```
- Problem: `http.ResponseWriter` doesn't expose the status code after it's written. We need it to distinguish 200 from 500.
- Solution: wrap the ResponseWriter to intercept `WriteHeader`.
- Embedding `http.ResponseWriter` promotes `Header()`, `Write()`, and `WriteHeader()` — so `statusRecorder` satisfies the `http.ResponseWriter` interface automatically.
- We override `WriteHeader` to capture the code. `Header()` and `Write()` delegate to the embedded writer unchanged.
- The handler receives `rr` instead of `w` — it never knows the difference.

### How embedding works
```go
type statusRecorder struct {
    http.ResponseWriter  // not a named field — it's an embedded interface
    statusCode int
}
```
- Embedding is NOT inheritance. It's composition with method promotion.
- All methods of `http.ResponseWriter` are promoted to `statusRecorder`.
- When we define our own `WriteHeader`, it **shadows** the promoted one — our version runs instead.
- `sr.ResponseWriter.WriteHeader(code)` explicitly calls the original (like `super` in other languages).

### Middleware as a function (not `func(Handler) Handler`)
```go
func LatencyCalculator(histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        rr := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
        next.ServeHTTP(rr, r)
        // ... record metrics after handler returns
    })
}
```
- This takes dependencies AND the next handler as parameters, returning a wrapped handler.
- Slightly different from `fault.NewInjector` which returns `func(Handler) Handler`. Both patterns are valid.
- This style is simpler when dependencies are known at wiring time.

### time.Since for measuring duration
```go
start := time.Now()
next.ServeHTTP(rr, r)  // blocks until handler completes
histogram.Record(float64(time.Since(start).Milliseconds()))
```
- `time.Since(start)` = `time.Now().Sub(start)`. Returns a `time.Duration` (nanoseconds internally).
- `.Milliseconds()` converts to int64 ms.
- `float64(...)` because Histogram.Record takes float64.
- `next.ServeHTTP` is synchronous — everything after it runs AFTER the handler completes. That's why the timing works.

### Error detection by status code
```go
if rr.statusCode >= 500 {
    errorTracker.RecordError()
} else {
    errorTracker.RecordSuccess()
}
```
- 5xx = server error (injected fault, bug, etc.).
- 4xx (client errors like 404) are NOT counted as server errors — the system is working correctly.
- This is the standard definition: error rate = server errors / total requests.

### Structured logging with slog
```go
slog.Info("request_completed",
    "method", r.Method,
    "path", r.URL.Path,
    "status", rr.statusCode,
    "duration", time.Since(start),
)
```
- `log/slog` (Go 1.21+) produces structured key-value logs.
- Output: `level=INFO msg=request_completed method=GET path=/process status=200 duration=32ms`
- Much easier to search/filter than `fmt.Printf` style logs.
- Key-value pairs are type-safe — `duration` renders as human-readable "32ms" automatically.
