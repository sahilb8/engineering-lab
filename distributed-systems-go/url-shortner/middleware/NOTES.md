# middleware/ — HTTP Middleware (Logging, Rate Limiting, IP Whitelist)

## What this package does
Wraps HTTP handlers with cross-cutting concerns: request logging, per-IP rate limiting, and IP-based access control. Middleware runs before and/or after the handler without the handler knowing.

## Key Go concepts used

### The middleware pattern
```go
func MyMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // before handler
        next.ServeHTTP(w, r)  // call the next handler — BLOCKS until done
        // after handler
    })
}
```
- A middleware takes an `http.Handler` and returns an `http.Handler`.
- `next.ServeHTTP(w, r)` is synchronous — everything after it runs AFTER the handler completes.
- Middleware chains compose: `Logger(RateLimiter(mux))` — Logger wraps RateLimiter wraps mux.

### http.Handler vs http.HandlerFunc
- `http.Handler` is an interface: `ServeHTTP(w, r)`
- `http.HandlerFunc` is a function type that implements `http.Handler`
- `http.HandlerFunc(fn)` converts a plain function into an `http.Handler`
- `mux.Handle` takes `http.Handler`. `mux.HandleFunc` takes a plain function.

### Middleware ordering matters
```
Request → Logger → RateLimiter → Handler → back to RateLimiter → back to Logger
```
- Logger is OUTERMOST so it sees every request, including rate-limited 429s.
- If RateLimiter were outermost, rejected requests would never be logged — blind spot.

## Files

### logging.go — Request Logging + Metrics

**Key concept: responseRecorder (intercepting the status code)**
```go
type responseRecorder struct {
    http.ResponseWriter  // embedded — promotes all methods
    statusCode int
}

func (rr *responseRecorder) WriteHeader(code int) {
    rr.statusCode = code                 // capture
    rr.ResponseWriter.WriteHeader(code)  // pass through
}
```
- `http.ResponseWriter` doesn't expose the status code after it's written.
- By embedding `http.ResponseWriter`, `responseRecorder` satisfies the interface automatically (all methods promoted).
- Overriding `WriteHeader` intercepts the status code before passing it through.
- The handler receives `rr` instead of `w` — it never knows the difference.

**Key concept: embedding as interface promotion**
- `responseRecorder` embeds `http.ResponseWriter` (an interface).
- This promotes `Header()`, `Write()`, and `WriteHeader()` onto `responseRecorder`.
- We override `WriteHeader` — the other two delegate automatically to the embedded writer.

**Flow when rate limiter returns 429:**
```
Logger: rr = &responseRecorder{statusCode: 200}
  → next.ServeHTTP(rr, r)  // blocks
    → RateLimiter: limiter.Allow() == false
      → rr.WriteHeader(429)  // captured by responseRecorder
      → return (handler is NEVER called)
  → back to Logger
  → log: "POST /shorten 429 2ms"
```

**Key concept: RequestMetrics interface**
```go
type RequestMetrics interface {
    IncTotalRequests()
}
```
- Middleware can't import `handler` (import cycle). Defines its own tiny interface.
- `handler.Metrics` satisfies it. `main` passes the same instance to both.

### ratelimit.go — Per-IP Rate Limiting

**Key concept: sync.Map for concurrent IP storage**
```go
type IPRateLimiter struct {
    ips sync.Map  // map[string]*ipStoreEntry
}
```
- `sync.Map` is a concurrent-safe map from the stdlib.
- `LoadOrStore` atomically checks and inserts — perfect for "get or create" pattern.

**Key concept: token bucket rate limiter**
```go
rate.NewLimiter(10, 20)  // 10 tokens/sec, burst of 20
limiter.Allow()          // returns true if a token is available, false otherwise
```
- Each IP gets its own limiter.
- `Allow()` is non-blocking — it either consumes a token or returns false immediately.
- Tokens refill at 10/sec. Burst of 20 allows short spikes.

**Key concept: minimal lock scope**
```go
ipAdress.mu.Lock()
ipAdress.lastSeen = time.Now()  // nanoseconds
ipAdress.mu.Unlock()
// handler runs freely OUTSIDE the lock
next.ServeHTTP(w, r)
```
- The mutex only protects the `lastSeen` write — not the entire request.
- If you held the lock during `next.ServeHTTP`, all requests from the same IP would serialize (one at a time). Defeats the purpose.

**Key concept: background cleanup goroutine**
```go
func (i *IPRateLimiter) cleanup() {
    for {
        time.Sleep(time.Minute)
        i.ips.Range(func(key, value any) bool {
            if time.Since(e.lastSeen) > 3*time.Minute {
                i.ips.Delete(key)
            }
            return true
        })
    }
}
```
- Without cleanup, the map grows forever (one entry per unique IP, never freed).
- Background goroutine sweeps every minute, deletes IPs not seen in 3 minutes.
- `Range` iterates over `sync.Map` safely.

### ipWhiteList.go — IP-Based Access Control
```go
func IPWhitelist(next http.Handler, allowedIPs []string) http.Handler {
    // check clientIP against allowedIPs
    // if match: next.ServeHTTP(w, r)
    // if not: 403 Forbidden
}
```
- Used for `/metrics` endpoint — only accessible from localhost.
- `net.SplitHostPort` extracts the IP from `r.RemoteAddr` (which includes the port).
- In production, you'd use a separate port instead of IP whitelisting.
