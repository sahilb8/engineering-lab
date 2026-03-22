# main.go — Application Wiring & Lifecycle

## What this file does
`main.go` is the entry point. It creates all dependencies, wires them together, starts the server, and handles shutdown. No business logic lives here.

## Key Go concepts used

### signal.NotifyContext
```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
```
- Creates a context that cancels automatically when the process receives SIGINT (Ctrl+C) or SIGTERM (docker stop).
- `<-ctx.Done()` blocks until the signal arrives — this is how the server stays alive.

### Dependency injection via struct fields
```go
app := &handler.App{Store: s, Metrics: m, Tracker: tracker, AnalyticsStore: analyticsStore}
```
- `main` is the only place that knows about all packages. It constructs concrete types and passes them as interfaces.
- `handler` never imports `store`. `store` never imports `handler`. `main` bridges them.
- This is why tests can substitute fakes — they construct their own `App` with different implementations.

### Variable scoping for shutdown
```go
var db *pgxpool.Pool        // declared BEFORE the if block
var redisClient *redis.Client

if os.Getenv("ENV") == "PROD" {
    db = ...   // assigned inside
}

// accessible here for cleanup
if db != nil { db.Close() }
```
- Variables that need to be closed on shutdown must be declared in the outer scope.
- nil-check before closing handles the non-PROD case where they were never created.

### Graceful shutdown sequence
```
SIGTERM received
  → srv.Shutdown(ctx)     // stop accepting, wait for in-flight requests (max 10s)
  → trackerCancel()       // tell analytics worker to drain
  → <-tracker.Done        // wait for drain to complete
  → db.Close()            // now safe — no more writes happening
  → redisClient.Close()
```
- Order matters. If you close DB before the tracker finishes draining, the drain writes fail.
- The tracker has its own context (not the signal context) so it doesn't race with the server.

### http.Server struct vs http.ListenAndServe
```go
srv := &http.Server{Addr: ":" + port, Handler: wrappedMux}
```
- Using the struct directly gives you `srv.Shutdown()` for graceful shutdown.
- `http.ListenAndServe` is a convenience wrapper that doesn't expose shutdown control.

## Design decisions
- **ENV-based wiring**: non-PROD uses MemoryStore (no external deps needed for development). PROD uses Postgres + Redis + analytics.
- **Single Metrics instance**: passed to `App`, `CachedStore` (as CacheMetrics), and `Logger` middleware (as RequestMetrics). One source of truth, three consumers via different interfaces.
- **Middleware chain**: `Logger(RateLimiter(mux))` — Logger is outermost so it captures every request including rate-limited 429s.
