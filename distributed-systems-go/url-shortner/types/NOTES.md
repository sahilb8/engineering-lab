# types/ — Shared Data Types

## What this package does
Defines data structures shared across multiple packages. This is the only package that nearly everyone imports — it has zero dependencies of its own.

## Types

### LookupResult
```go
type LookupResult struct {
    URL       string
    ExpiresAt *time.Time  // pointer = optional (nil means no expiry)
}
```
- Returned by `Store.Lookup()`.
- `ExpiresAt` is a pointer so `nil` represents "no expiry" cleanly, rather than using a zero time.
- Used for both the response to the handler AND the Redis cache value (JSON marshaled).

### ClickEvent
```go
type ClickEvent struct {
    Code      string
    IP        string
    Timestamp time.Time
}
```
- Sent through the analytics buffered channel.
- Immutable after creation — no pointers, no mutation. Safe to pass between goroutines.

## Why a shared types package
- `handler` and `store` both need `LookupResult`, but `handler` can't import `store` (the interface lives in handler) and `store` can't import `handler` (import cycle).
- `types` is a leaf package — it imports nothing from this project, so everyone can safely import it.
- Keep it small. Only put types here that genuinely need to cross package boundaries.
