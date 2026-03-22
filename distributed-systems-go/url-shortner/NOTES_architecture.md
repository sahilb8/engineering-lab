# Architecture Overview — URL Shortener

## Request flow

```
Client
  ↓
Logger middleware (logs every request + captures status code)
  ↓
RateLimiter middleware (per-IP token bucket, 10 req/s burst 20)
  ↓
Router (mux)
  ├── POST /shorten    → handler.Shorten     → Store.Save
  ├── GET /{code}      → handler.Redirect    → Store.Lookup → Tracker.Track (async)
  ├── GET /health      → handler.Health
  ├── GET /stats/{code}→ handler.Stats       → AnalyticsStore.Lookup
  └── GET /metrics     → handler.Metrics     (IP whitelisted)
```

## Package dependency graph

```
main.go (wiring only)
  ├── handler/     ← defines Store, Tracker, AnalyticsStore interfaces
  ├── store/       ← MemoryStore, PgStore, CachedStore (implements handler.Store)
  ├── middleware/   ← Logger, RateLimiter, IPWhitelist
  ├── analytics/   ← Tracker with buffered channel worker
  ├── shortcode/   ← random code generation
  └── types/       ← shared data types (LookupResult, ClickEvent)
```

**Rule: no package imports a sibling (except types). main is the only bridge.**

## Key patterns used

### 1. Dependency injection
- No globals. All dependencies passed via struct fields on `App`.
- `main` constructs everything and wires it together.
- Tests create their own `App` with fakes.

### 2. Interfaces at the consumer
- `handler.Store` defined in handler (consumer), not in store (implementer).
- Go's implicit interface satisfaction connects them without either side importing the other.
- Prevents import cycles and keeps packages decoupled.

### 3. Small, focused interfaces
- `handler.Store` — Save + Lookup (2 methods)
- `handler.Tracker` — Track (1 method)
- `store.CacheMetrics` — IncCacheHit + IncCacheMiss (2 methods)
- `middleware.RequestMetrics` — IncTotalRequests (1 method)
- One concrete type (`handler.Metrics`) satisfies multiple interfaces.
- "The bigger the interface, the weaker the abstraction."

### 4. Cache-aside pattern
- Read: Redis first → miss → Postgres → async backfill Redis
- Write: Postgres first (source of truth) → Redis (pre-warm)
- Redis failure = slower, not broken. Self-healing on next read miss.

### 5. Async work via buffered channels
- Analytics tracking uses a buffered channel (not goroutine-per-event).
- Single worker goroutine drains the channel and writes to DB.
- Backpressure: if channel is full, drop the event (non-blocking).
- Predictable resource usage vs unbounded goroutine spawning.

### 6. Graceful shutdown with ordered teardown
```
Signal → stop server (finish requests) → drain analytics → close DB → close Redis
```
- Each component has its own context/lifecycle.
- Ordering prevents writes to closed connections.

### 7. Middleware chain
- Functions that wrap `http.Handler` and return `http.Handler`.
- Compose by nesting: `Logger(RateLimiter(mux))`.
- `responseRecorder` intercepts status codes via interface embedding.

## Production concepts covered
| Concept | Where implemented |
|---------|------------------|
| HTTP routing & JSON handling | handler/ |
| Database persistence | store/postgres.go |
| Caching (Redis) | store/cached.go |
| Rate limiting (token bucket) | middleware/ratelimit.go |
| Structured logging | middleware/logging.go + slog throughout |
| Metrics & observability | handler.Metrics + /metrics endpoint |
| URL expiration | Store.Save with *time.Time, ErrExpired sentinel |
| Click analytics | analytics/tracker.go with buffered channel |
| Graceful shutdown | main.go signal handling + ordered teardown |
| IP-based access control | middleware/ipWhiteList.go |
| Containerization | Dockerfile + docker-compose.yml |
