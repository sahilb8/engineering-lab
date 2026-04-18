# handler/ — HTTP Request Handlers

## What this package does
Defines the HTTP handlers for `/health` and `/process` endpoints. The `Checker` struct holds shared dependencies (config, histogram, error tracker) so handlers can access them without globals.

## Key Go concepts used

### Struct with methods — solving the handler signature problem
```go
type Checker struct {
    cfg          health.HealthConfig
    histogram    *metrics.Histogram
    errorTracker *metrics.ErrorTracker
}

func (c *Checker) HealthHandler(w http.ResponseWriter, r *http.Request) {
    // c.histogram, c.cfg, c.errorTracker are available here
}
```
- HTTP handlers must have signature `func(w, r)`. You can't add extra parameters.
- Without a struct, you'd need closures or globals to access dependencies.
- The struct holds dependencies. Methods on the struct have access via the receiver `c`.
- Wire once at startup: `checker := handler.NewChecker(cfg, histogram, errorTracker)`.
- Register: `mux.HandleFunc("/health", checker.HealthHandler)`.

### Constructor function
```go
func NewChecker(cfg health.HealthConfig, histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker) *Checker {
    return &Checker{cfg: cfg, histogram: histogram, errorTracker: errorTracker}
}
```
- `New*` is the Go naming convention for constructors.
- Returns a pointer (`*Checker`) — avoids copying the struct when passing around.
- `&Checker{...}` allocates on the heap and returns the address.

### Standalone function vs method
```go
// Method on Checker — needs dependencies
func (c *Checker) HealthHandler(w http.ResponseWriter, r *http.Request) { ... }

// Standalone function — needs no dependencies
func ProcessHandler(w http.ResponseWriter, r *http.Request) { ... }
```
- `ProcessHandler` doesn't need the histogram or error tracker (middleware handles that).
- It's a plain function, not a method — simpler when no state is needed.
- In main.go: `http.HandlerFunc(handler.ProcessHandler)` converts it to an `http.Handler`.

### JSON response
```go
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusOK)
json.NewEncoder(w).Encode(health)
```
- `json.NewEncoder(w).Encode(health)` does two things: marshals to JSON AND writes to the response.
- `w` implements `io.Writer`, so `NewEncoder(w)` streams JSON directly into the response body.
- Headers must be set BEFORE `WriteHeader` or `Write` — once the status is sent, headers are locked.
- If you don't call `WriteHeader`, `Write` implicitly sets 200 OK.

### Simulating work with random sleep
```go
func ProcessHandler(w http.ResponseWriter, r *http.Request) {
    time.Sleep(time.Duration(rand.IntN(41)+10) * time.Millisecond)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
}
```
- `rand.IntN(41) + 10` = random number from 10 to 50.
- Formula: `rand.IntN(max - min + 1) + min`.
- Simulates realistic variable-latency work. Without this, every request would take ~0ms and percentile metrics would be meaningless.
