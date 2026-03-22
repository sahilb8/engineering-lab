# store/ — Data Storage Implementations

## What this package does
Provides three storage implementations: in-memory (dev), PostgreSQL (prod), and cached (Redis + Postgres). None of these files import `handler` — they just have methods that happen to satisfy `handler.Store`.

## Files

### memory.go — In-Memory Store
```go
type MemoryStore struct {
    mu   sync.RWMutex
    data map[string]*urlData
}
```

**Key concept: sync.RWMutex**
- Go maps are NOT safe for concurrent access. `net/http` serves each request in its own goroutine, so multiple goroutines hit the map simultaneously.
- `RWMutex` allows multiple concurrent readers (`RLock`) but exclusive writers (`Lock`).
- `Lookup` uses `RLock` (many reads at once). `Save` uses `Lock` (one write at a time).
- Always `defer Unlock()` to prevent deadlocks if the function returns early.

**Key concept: nil-check ordering**
```go
val, exists := s.data[code]
if !exists {        // check existence FIRST
    return nil, nil
}
if val.expiresAt != nil && ...  // THEN access fields
```
- If you access `val.expiresAt` before checking `exists`, you get a nil pointer panic.

### postgres.go — PostgreSQL Store
```go
type PgStore struct {
    db *pgxpool.Pool
}
```

**Key concept: sql.NullTime for nullable columns**
```go
var expiresAt sql.NullTime
// After scan:
if expiresAt.Valid {
    // has a value
}
```
- Postgres `NULL` doesn't map to Go's zero value. `sql.NullTime` has `.Valid bool` and `.Time time.Time`.
- For inserts, construct `sql.NullTime{Time: t, Valid: true}` when you have a value, or leave it zero-valued (Valid=false) for NULL.

**Key concept: distinguishing "not found" from "error"**
```go
if err == pgx.ErrNoRows {
    return nil, nil  // not found — normal
}
if err != nil {
    return nil, err  // real DB error — 500
}
```
- `pgx.ErrNoRows` is a sentinel error meaning the query returned no results.
- This is NOT a system error. Returning `(nil, nil)` lets the handler distinguish 404 from 500.

**Key concept: expiry check in the store**
```go
if expiresAt.Valid && time.Now().After(expiresAt.Time) {
    return nil, ErrExpired
}
```
- Expiry is a data concern, not an HTTP concern. Every consumer of the store benefits from this check.
- `ErrExpired` is a sentinel error the handler checks with `errors.Is`.

### cached.go — Redis Cache Layer (Cache-Aside Pattern)
```go
type CachedStore struct {
    redis   *redis.Client
    primary primaryStore  // local interface, NOT handler.Store
    ttl     time.Duration
    metrics CacheMetrics  // local interface, NOT handler.Metrics
}
```

**Key concept: local interfaces to avoid import cycles**
```go
type primaryStore interface {
    Save(code, url string, expiresAt *time.Time) error
    Lookup(code string) (*types.LookupResult, error)
}

type CacheMetrics interface {
    IncCacheHit()
    IncCacheMiss()
}
```
- `CachedStore` needs a store and metrics, but can't import `handler` (would create a cycle).
- Solution: define small interfaces locally. `handler.Metrics` satisfies `CacheMetrics` because it has the right methods — implicit satisfaction.
- Two identical-looking interfaces in different packages is fine in Go. They're structurally typed.

**Key concept: cache-aside pattern**
```
Read path (Lookup):
  Redis hit?  → return immediately, IncCacheHit
  Redis miss? → query Postgres, IncCacheMiss
             → if found, async backfill Redis
             → return result

Write path (Save):
  Write to Postgres (source of truth) FIRST
  Then write to Redis (pre-warm cache)
  If Redis write fails → log and ignore (self-healing on next read)
```
- Postgres is always the source of truth. Redis is disposable.
- If Redis goes down, traffic falls through to Postgres. Service stays up, just slower.

**Key concept: async backfill with goroutine**
```go
go cs.redis.Set(ctx, code, data, ttl)
```
- On cache miss + DB hit, write to Redis in a background goroutine.
- Uses `context.Background()`, NOT the request context — request context could cancel before Redis write completes.

**Key concept: TTL alignment with expiry**
```go
if expiresAt != nil {
    ttl = time.Until(*expiresAt)
}
```
- If a URL has an expiry, set Redis TTL to match. Redis auto-evicts when the URL expires — no manual check needed on cache reads.

### errors.go — Sentinel Errors
```go
var ErrExpired = errors.New("link has expired")
```
- Package-level sentinel error. Checked with `errors.Is(err, store.ErrExpired)`.
- Lives in `store` because expiry is a storage concern.

## Architecture pattern: no package imports its siblings
```
main → handler (interfaces)
main → store   (implementations)
main → middleware
main → analytics

handler does NOT import store (except for ErrExpired sentinel)
store does NOT import handler
middleware does NOT import handler
analytics does NOT import handler
```
`main` is the only place that knows about everything and wires them together.
