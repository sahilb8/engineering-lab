# Chapter 1 — Reliable, Scalable, and Maintainable Applications

## Key Concepts

- **Reliability**: The system continues to work correctly even when things go wrong (faults).
- **Scalability**: The system can handle growth (data volume, traffic, complexity).
- **Maintainability**: The system is easy to operate, understand, and evolve over time.

## Trade-Off Table

| Concern | Approach | Pros | Cons | Real-World Example |
|---------|----------|------|------|--------------------|
| **Hardware Faults** |
| **Hardware Faults** |
| **Software Faults** |
| **Software Faults** |
| **Scalability** |
| **Scalability** |
| **Load Handling** |
| **Load Handling** | 
| **Latency** |
| **Latency** |
| **Maintainability** |
| **Maintainability** |
| **Measuring Load** | 
| **Measuring Load** | 

## Key Insights

- **Faults ≠ Failures**:
- **Percentiles > Averages**:
- **Twitter Fan-Out**:
- **No silver bullet for scalability**:
















---------------------------------
# Chapter 1 — Reliable, Scalable, and Maintainable Applications

## Key Concepts

- **Reliability**: The system continues to work correctly even when things go wrong (faults).
- **Scalability**: The system can handle growth (data volume, traffic, complexity).
- **Maintainability**: The system is easy to operate, understand, and evolve over time.

## Trade-Off Table

| Concern | Approach | Pros | Cons | Real-World Example |
|---------|----------|------|------|--------------------|
| **Hardware Faults** | Redundancy (RAID, dual power, hot-swap) | Simple, well-understood | Doesn't help with software bugs or correlated failures | Traditional on-prem databases |
| **Hardware Faults** | Software fault-tolerance (replicated state machines) | Handles rolling upgrades, cloud VM failures | Added complexity in application layer | Cloud-native systems (e.g., Kubernetes pods) |
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
| **Measuring Load** | Response time percentiles (p50, p95, p99) | Captures tail latency, reflects real UX | Harder to aggregate across nodes | SLA definitions (e.g., p99 < 200ms) |

## Key Insights

- **Faults ≠ Failures**: A fault is one component deviating from spec; a failure is the whole system stopping. Good design tolerates faults to prevent failures.
- **Percentiles > Averages**: Averages hide outliers. Tail latencies (p99, p999) often affect your most valuable users (heavy data = big customers).
- **Twitter Fan-Out**: Classic DDIA example — fan-out on write (precompute timelines) works for most users, but high-follower accounts need fan-out on read. Hybrid approach wins.
- **No silver bullet for scalability**: Architecture that handles 100K req/s is very different from one for 3 req/s with 2TB payloads. Design for *your* load parameters.
