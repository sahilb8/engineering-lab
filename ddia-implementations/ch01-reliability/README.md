# Chapter 1 - Reliability

A hands-on implementation of reliability concepts from DDIA (Designing Data-Intensive Applications) Chapter 1: "Reliable, Scalable, and Maintainable Applications."

This project simulates real-world system behavior by injecting faults (errors, latency, hangs) and measuring system health through percentile-based latency metrics and error tracking.

## Architecture

```
Request → LatencyCalculator (middleware) → FaultInjector (middleware) → Handler
                  ↓                              ↓
            Records latency              Injects errors/latency/hangs
            in Histogram                 based on config
                  ↓
         Health endpoint reads
         metrics and reports status
```

## Project Structure

```
ch01-reliability/
├── main.go                          # Server entry point (port 8080)
├── Makefile                         # Build/run targets
├── .env                             # Environment configuration
├── cmd/
│   └── loadgen/
│       └── main.go                  # Load testing client
└── internal/
    ├── fault/
    │   ├── injector.go              # Fault injection middleware
    │   └── injector_test.go
    ├── handler/
    │   └── handler.go               # HTTP handlers (/health, /process)
    ├── health/
    │   └── checker.go               # Health check logic
    ├── metrics/
    │   ├── error_tracker.go         # Error rate tracking
    │   ├── percentile.go            # Histogram for latency percentiles
    │   └── percentile_test.go
    └── middleware/
        └── latencyCalculator.go     # Latency measurement middleware
```

## Endpoints

| Endpoint   | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| `/process` | Simulates work (10-50ms). Wrapped with fault injection and latency tracking |
| `/health`  | Returns system health status based on latency percentiles and error rate    |

### Health Response Example

```json
{
  "status": "Degraded",
  "p50": "32ms",
  "p95": "145ms",
  "p99": "890ms",
  "error_rate": "30.00%"
}
```

Health status is determined by comparing metrics against thresholds:
- **Healthy** - All percentiles within thresholds and error rate below max
- **Degraded** - Some percentiles exceed thresholds
- **Unhealthy** - Error rate exceeds max threshold

## Configuration

Environment variables (or `.env` file):

| Variable     | Description                        | Default |
|--------------|------------------------------------|---------|
| `ERROR_RATE` | Probability of injected errors     | `0.0`   |
| `LATENCY_MS` | Max random latency to inject (ms)  | `0`     |
| `HANG_RATE`  | Probability a request hangs        | `0.0`   |

## Running

```bash
# Start the server
make run

# Run tests
make test

# Run load test (50 RPS for 10 seconds)
make loadtest
```

### Load Test with Custom Parameters

```bash
go run ./cmd/loadgen/main.go -rps 100 -duration 30 -url http://localhost:8080/process
```

### Example Load Test Output

```
--- Load Test Results ---
Total requests: 500
Errors:         4.6%
p50:            32ms
p95:            145ms
p99:            890ms
```

## DDIA Concepts Demonstrated

- **Fault tolerance** - Fault injector simulates hardware/software faults; system degrades gracefully
- **Percentiles over averages** - Health checks use p50, p95, p99 instead of mean latency
- **Graceful degradation** - Health status transitions: Healthy -> Degraded -> Unhealthy
- **Graceful shutdown** - Server handles SIGTERM/SIGINT and waits for in-flight requests
- **Concurrency safety** - All metrics use `sync.RWMutex` for thread-safe access
