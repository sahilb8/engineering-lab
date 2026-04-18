# Chapter 1 — Reliable, Scalable, and Maintainable Applications

## The Three Concerns

### Reliability
The system continues to work **correctly** even when things go wrong (faults).
- A **fault** is one component deviating from spec (a disk dies, a network packet is lost)
- A **failure** is the whole system stopping service to the user
- Good design **tolerates faults** to prevent them from becoming failures
- You can't prevent all faults — you design so they don't cascade

**Types of faults:**
- **Hardware faults** — disk crash, power outage, memory corruption. Traditional approach: redundancy (RAID, dual power). Modern approach: software-level tolerance (expect VMs to die, replicate state).
- **Software faults** — bugs, cascading failures, resource exhaustion. Harder than hardware faults because they're correlated (one bug affects all nodes simultaneously). No quick fix — monitoring, testing, process isolation.
- **Human errors** — misconfigurations, bad deployments. The leading cause of outages. Combat with good abstractions, sandbox environments, gradual rollouts, and easy rollback.

### Scalability
The system can handle growth (data volume, traffic, complexity).
- Before discussing scalability, you must first describe the **load parameters** of your system
- Load parameters: requests/sec, read/write ratio, simultaneously active users, cache hit rate, etc.
- "The system is scalable" is meaningless. "The system handles 10x current load with p99 < 200ms" is meaningful.

### Maintainability
The system is easy to operate, understand, and evolve over time.
- **Operability** — make it easy for ops to keep the system running (monitoring, automation, docs)
- **Simplicity** — reduce complexity so new engineers can understand the system (good abstractions)
- **Evolvability** — make it easy to change the system (loose coupling, modularity)

---

## Describing Performance

Once you know the load, ask: **what happens when load increases?**

Two ways to look at it:
- **Throughput** — how many records/requests can we process per second (batch systems)
- **Response time** — how long does it take to handle one request (online systems)

### Why Percentiles > Averages

Average latency hides outliers. If 99 requests take 10ms and 1 takes 5000ms, the average is ~59ms — looks fine. But that 1 user waited 5 seconds.

| Metric | What it tells you |
|--------|-------------------|
| **p50** (median) | Half your users see this or better. "Typical" experience |
| **p95** | 95% of users see this or better. Catches most slow requests |
| **p99** | Only 1 in 100 is slower. Often your most valuable users |
| **p999** | 1 in 1000. Amazon tracks this — slowest requests = biggest customers (most data) |

Amazon found: **100ms increase in p99 = 1% revenue loss**.

SLAs are defined in percentiles: "p99 response time must be < 200ms" — not averages.

### Tail latency amplification
In microservices, a single user request might fan out to 5 backend services in parallel. The response time = the slowest of the 5. Even if each service has p99 = 200ms, the chance of hitting at least one slow call grows with fan-out.

---

## Twitter Fan-Out — The Classic DDIA Example

**Problem:** User posts a tweet. 30 million followers need to see it in their home timeline.

**Approach 1 — Fan-out on read:**
- Store tweet in a global tweets table
- When user opens timeline: query all people they follow, merge and sort tweets
- Pro: writes are cheap (one insert)
- Con: reads are expensive (huge join at read time)

**Approach 2 — Fan-out on write:**
- Maintain a "home timeline cache" per user
- When someone tweets: insert into every follower's cache
- Pro: reads are instant (just read the cache)
- Con: writes are expensive (30M inserts for a celebrity tweet)

**Twitter's solution: hybrid**
- Fan-out on write for normal users (fast reads, manageable write load)
- Fan-out on read for celebrities (>1M followers — writing to millions of caches is too slow)
- The distribution of followers per user is the key load parameter

---

## Trade-Off Table

| Concern | Approach | Pros | Cons | Real-World Example |
|---------|----------|------|------|--------------------|
| **Hardware Faults** | Redundancy (RAID, dual power, hot-swap) | Simple, well-understood | Doesn't help with software bugs or correlated failures | Traditional on-prem databases |
| **Hardware Faults** | Software fault-tolerance (replicated state machines) | Handles rolling upgrades, cloud VM failures | Added complexity in application layer | Cloud-native systems (Kubernetes pods) |
| **Software Faults** | Crash-only design (process restart) | Fast recovery, simple reasoning | Not all state survives restarts; need durable storage | Erlang/OTP supervision trees |
| **Software Faults** | Defensive programming (assertions, input validation) | Catches bugs early | Can't prevent all systematic faults | Netflix Chaos Monkey philosophy |
| **Scalability** | Scale up (vertical) | No distributed complexity | Single point of failure, hardware ceiling | Single beefy PostgreSQL server |
| **Scalability** | Scale out (horizontal) | Near-linear capacity growth | Distributed coordination, partial failures, complexity | Cassandra, CockroachDB |
| **Load Handling** | Stateless services + load balancer | Easy horizontal scaling | State must live elsewhere (DB, cache) | REST API behind Nginx/ALB |
| **Load Handling** | Stateful partitioning (sharding) | Data locality, write scaling | Rebalancing is hard, cross-shard queries expensive | Twitter fan-out on write vs. read |
| **Latency** | Cache hot data (in-memory) | Dramatically reduces p99 | Cache invalidation is hard, stale reads | Memcached / Redis in front of DB |
| **Latency** | Precompute (materialized views) | Shifts work from read-time to write-time | Increased write cost, storage, staleness | Twitter home timeline cache |
| **Maintainability** | Simple abstractions (good APIs) | Easier to reason about, onboard new devs | Upfront design cost | Well-designed library interfaces |
| **Maintainability** | Evolvability (loose coupling, small services) | Independent deployment, smaller blast radius | Operational overhead, network boundaries | Microservices architecture |
| **Measuring Load** | Throughput (requests/sec) | Good for batch/offline systems | Doesn't capture user-perceived latency | Hadoop job throughput |
| **Measuring Load** | Response time percentiles (p50, p95, p99) | Captures tail latency, reflects real UX | Harder to aggregate across nodes | SLA definitions (p99 < 200ms) |

---

## How This Project Maps to DDIA

| DDIA Concept | Implementation |
|---|---|
| Faults != Failures | `fault/injector.go` — injects faults (errors, latency, hangs). System degrades gracefully instead of crashing |
| Percentiles > Averages | `metrics/percentile.go` — Histogram tracks p50/p95/p99. Health check uses these, not averages |
| Describing load | `cmd/loadgen/` — configurable RPS and duration. Observe how the system behaves under different loads |
| Describing performance | `/health` endpoint reports percentile latencies and error rate |
| Graceful degradation | `health/checker.go` — status transitions Healthy → Degraded → Unhealthy based on thresholds |
| Chaos engineering | `fault/injector.go` — Netflix Chaos Monkey idea: deliberately inject failures to build confidence |
| Operability | `middleware/latencyCalculator.go` — structured logging, per-request metrics |
