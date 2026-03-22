# analytics/ — Async Click Tracking

## What this package does
Tracks every redirect event (click) asynchronously using a buffered channel and a single background worker. The user gets their redirect instantly — the DB write happens later.

## Key Go concepts used

### Buffered channel as a work queue
```go
analyticsChan: make(chan types.ClickEvent, 1000)
```
- A buffered channel holds up to 1000 events before blocking.
- The handler sends events to the channel (non-blocking). A single worker goroutine reads and writes to DB.
- This decouples the HTTP response from the DB write — the user never waits for analytics.

### Why a channel instead of `go writeToDb(event)` per click
- Spawning a goroutine per click is lightweight (~2KB per goroutine) but each one needs a DB connection.
- Postgres defaults to 100 max connections. 10,000 clicks/sec = 9,900 goroutines blocked waiting for a connection.
- Channel + single worker = one goroutine, one DB connection, predictable resource usage.
- Enables future optimization: batch-insert multiple events in one SQL statement.

### Non-blocking send with select/default
```go
func (t *Tracker) Track(event types.ClickEvent) {
    select {
    case t.analyticsChan <- event:
        // queued successfully
    default:
        // channel full — DROP the event, don't block the user
        slog.Warn("analytics_dropped", ...)
    }
}
```
- `select` with `default` makes the send non-blocking.
- If the channel is full (worker can't keep up), the event is dropped and logged.
- This is backpressure — the system degrades gracefully under load instead of crashing.
- Analytics loss is acceptable. Blocking user redirects is not.

### Worker loop with graceful drain
```go
func (t *Tracker) Run(ctx context.Context) {
    for {
        select {
        case event := <-t.analyticsChan:
            t.analyticsStore.SaveAnalytics(event)
        case <-ctx.Done():
            close(t.analyticsChan)
            for event := range t.analyticsChan {  // drain remaining
                t.analyticsStore.SaveAnalytics(event)
            }
            close(t.Done)
            return
        }
    }
}
```
- Normal operation: read from channel, write to DB, repeat.
- Shutdown: `ctx.Done()` fires → close the channel (no new sends) → drain remaining events → signal completion via `Done` channel.
- `close(t.analyticsChan)` makes `range` terminate after reading all buffered events.

### Done channel for shutdown coordination
```go
Done: make(chan struct{})
```
- `main.go` does `<-tracker.Done` to wait for the drain to complete before closing the DB.
- `chan struct{}` is the idiomatic "signal-only" channel — carries no data, just open/closed state.
- Without this, `main` would close the DB pool while the worker is still draining — writes would fail.

### Shutdown ordering (coordinated with main.go)
```
1. SIGTERM received
2. srv.Shutdown()      → no new HTTP requests, in-flight finish
3. trackerCancel()     → tells worker to drain (separate context from server)
4. <-tracker.Done      → wait for drain to complete
5. db.Close()          → NOW safe to close
```
- The tracker has its OWN context, not the signal context.
- If it shared the signal context, `ctx.Done()` would fire simultaneously with server shutdown — in-flight requests could still call `Track()` after the channel is closed (panic).

### Local interface — same pattern as everywhere else
```go
type analyticsStore interface {
    SaveAnalytics(clickEvent types.ClickEvent) error
}
```
- Only defines what the tracker needs (write). Doesn't include `AnalyticsLookup` (that's a handler concern).
- Keep interfaces minimal — "the bigger the interface, the weaker the abstraction" (Go proverb).
