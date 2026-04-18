# cmd/loadgen/ — Load Test Client

## What this package does
Generates HTTP load against the server at a configurable rate and duration. After the test, prints latency percentiles and error rate — the same metrics DDIA Chapter 1 says you should measure.

## DDIA connection
"Before discussing scalability, you must first describe the load parameters." This tool lets you define load (RPS, duration) and observe performance (p50, p95, p99, error rate).

## Key Go concepts used

### package main — executable entry point
```go
package main

func main() { ... }
```
- Only `package main` with `func main()` creates an executable.
- Any other package name is a library — `func main()` would just be a regular function nobody calls.
- This project has TWO `main` packages: root `main.go` (server) and `cmd/loadgen/main.go` (client).

### flag package — command-line arguments
```go
url := flag.String("url", "http://localhost:8080/process", "URL to send requests to")
rps := flag.Int("rps", 50, "Requests per second")
duration := flag.Int("duration", 10, "Duration of the load test in seconds")
flag.Parse()
```
- `flag.String` returns a `*string` (pointer), not a `string`. Access the value with `*url`.
- `flag.Parse()` must be called after defining flags, before reading them.
- Run with: `go run ./cmd/loadgen/main.go -rps 100 -duration 30`.
- Third argument is the help text: `go run ./cmd/loadgen/main.go -help`.

### sync.WaitGroup — waiting for goroutines
```go
var wg sync.WaitGroup
wg.Add(*rps * *duration)  // total goroutines we'll launch

for i := 0; i < *duration; i++ {
    for j := 0; j < *rps; j++ {
        go func() {
            defer wg.Done()
            // send request...
        }()
    }
    time.Sleep(1 * time.Second)  // pace: one batch per second
}
wg.Wait()  // block until all goroutines finish
```
- `wg.Add(n)` — "n goroutines are coming"
- `defer wg.Done()` — "this one is done" (decrements counter)
- `wg.Wait()` — parks the goroutine (zero CPU) until counter hits 0
- Without `wg.Wait()`, `main()` would exit before goroutines finish — no results printed.

### Rate control pattern
```
Second 1: launch 50 goroutines → sleep 1s
Second 2: launch 50 goroutines → sleep 1s
...
Second 10: launch 50 goroutines → sleep 1s
wg.Wait() → wait for all 500 to finish
```
- The outer loop controls duration (seconds).
- The inner loop controls RPS (goroutines per second).
- `time.Sleep(1 * time.Second)` paces the load — without it, all goroutines launch at once.

### resp.Body.Close — preventing connection leaks
```go
resp, err := http.Get(*url)
if err != nil {
    errorTracker.RecordError()
    return
}
defer resp.Body.Close()
```
- Every `http.Get` response holds an open TCP connection in `resp.Body`.
- `Close()` releases the connection back to Go's connection pool for reuse.
- Without it: connections accumulate. The OS has a file descriptor limit (often 256-1024). Hit it and you get: `dial tcp: too many open files`.
- `defer` ensures it's closed even if the function returns early.
- Check `err` BEFORE `resp.Body.Close()` — if `err != nil`, `resp` is nil and `resp.Body.Close()` would panic.

### Error detection — connection vs HTTP errors
```go
resp, err := http.Get(*url)
if err != nil {
    errorTracker.RecordError()  // connection failed entirely
    return
}
defer resp.Body.Close()
if resp.StatusCode >= 500 {
    errorTracker.RecordError()  // server returned an error
} else {
    errorTracker.RecordSuccess()
}
```
- Two kinds of errors:
  - `err != nil` — couldn't connect at all (server down, DNS failure, timeout).
  - `StatusCode >= 500` — connected successfully but server returned an error (injected fault, bug).
- Both count as errors for our metrics.

### Printing results
```go
fmt.Printf("Errors:         %.1f%%\n", errorRate*100)
fmt.Printf("p50:            %.0fms\n", p50)
```
- `%.1f` — one decimal place: `4.6`.
- `%.0f` — no decimals: `32`.
- `%%` — literal `%` sign.
- Results use the same Histogram and ErrorTracker as the server — same measurement primitives, different context.
