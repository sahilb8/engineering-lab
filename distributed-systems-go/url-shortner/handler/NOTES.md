# handler/ — HTTP Handlers & Interface Definitions

## What this package does
Defines the HTTP handlers (Shorten, Redirect, Metrics, Stats, Health) and the interfaces that the rest of the app must satisfy. This is the "consumer" package — it says what it needs, not how it's implemented.

## Key Go concepts used

### Interfaces defined at the consumer
```go
type Store interface {
    Save(code, url string, expiresAt *time.Time) error
    Lookup(code string) (*types.LookupResult, error)
}

type Tracker interface {
    Track(event types.ClickEvent)
}

type AnalyticsStore interface {
    AnalyticsLookup(code string) (int, error)
}
```
- Interfaces live HERE because this package USES them.
- `store` package just has methods — it never imports `handler`.
- Go's implicit interface satisfaction: if a struct has the right methods, it satisfies the interface. No `implements` keyword.
- This prevents import cycles: handler -> store would cycle if store also imported handler.

### App struct — dependency container
```go
type App struct {
    Store          Store
    Metrics        *Metrics
    Tracker        Tracker
    AnalyticsStore AnalyticsStore
}
```
- Handlers are methods on `App`: `func (app *App) Shorten(w, r)`
- This gives every handler access to dependencies without globals.
- Tests create their own `App` with fakes — completely isolated.

### Metrics with atomic.Int64
```go
type Metrics struct {
    TotalRequests  atomic.Int64
    TotalShortened atomic.Int64
    ...
}
func (m *Metrics) IncCacheHit()  { m.CacheHits.Add(1) }
```
- `atomic.Int64` is safe for concurrent access without a mutex.
- `.Add(1)` to increment, `.Load()` to read.
- The `Inc*` methods satisfy interfaces in other packages (`store.CacheMetrics`, `middleware.RequestMetrics`) without those packages importing `handler`.

### Collision retry loop (Shorten)
```go
for i := 0; i < 5; i++ {
    shortKey, err := shortcode.GenerateShortKey()
    val, err := app.Store.Lookup(shortKey)
    if val == nil {  // code doesn't exist, safe to use
        app.Store.Save(shortKey, req.URL, req.ExpiresAt)
        break
    }
    shortKey = ""  // collision, try again
}
```
- Generate a random code, check if it exists, retry if collision.
- Max 5 attempts to avoid infinite loops.
- With 62^7 possible codes (~3.5 trillion), collisions are extremely rare.

### Error discrimination (RedirectHandler)
```go
val, err := app.Store.Lookup(code)
if errors.Is(err, store.ErrExpired) {
    // 410 Gone — link existed but expired
} else if err != nil {
    // 500 — database/system error
} else if val != nil {
    // 302 redirect — happy path
} else {
    // 404 — never existed
}
```
- Three distinct outcomes from one call, each with different HTTP semantics.
- `errors.Is` checks the error chain — works even if the error is wrapped.
- Sentinel errors (`ErrExpired`) are defined in the store package.

### nil-checks for optional dependencies
```go
if app.Tracker != nil {
    app.Tracker.Track(...)
}
```
- In non-PROD, Tracker and AnalyticsStore are nil.
- Without the nil-check, calling a method on nil panics.

## HTTP concepts
- **410 Gone** vs **404 Not Found**: 410 means "existed but no longer available" (expired). 404 means "never existed".
- **302 Found**: temporary redirect. Browser re-asks the server every time (good for analytics tracking).
- **201 Created**: response for successful POST /shorten (resource was created).
- **Content-Type header**: must be set BEFORE WriteHeader/Write — once headers are flushed to the network buffer, you can't add more.
