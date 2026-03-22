# Docker & Docker Compose — Containerization

## Dockerfile — Multi-Stage Build

### Stage 1: Build
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download        # cached unless go.mod changes
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .
```

**Key concept: CGO_ENABLED=0**
- Produces a fully static binary with no C library dependencies.
- Can run on minimal images (alpine, scratch) that don't have libc.

**Key concept: layer caching**
- Docker caches each layer. If a layer's inputs haven't changed, it's reused.
- `COPY go.mod go.sum` + `RUN go mod download` is cached as long as dependencies don't change.
- `COPY . .` only invalidates when source code changes — dependencies aren't re-downloaded.
- Without this optimization, every code change re-downloads all dependencies.

### Stage 2: Run
```dockerfile
FROM alpine:3.19
COPY --from=builder /app/myapp /myapp
ENTRYPOINT ["/myapp"]
```

**Key concept: multi-stage builds**
- Build stage has Go compiler, source code, build tools (~1GB).
- Run stage has only the binary (~10MB).
- Final image is tiny, has minimal attack surface.
- `alpine` over `scratch` because alpine has CA certs (for HTTPS) and a shell (for debugging).

## docker-compose.yml — Full Stack

### Service dependency with health checks
```yaml
depends_on:
  postgres:
    condition: service_healthy
```
- `depends_on` alone only waits for the container to START, not for the service to be READY.
- Postgres takes seconds to initialize. Without `service_healthy`, the app would crash on first DB connection.
- `pg_isready` is a Postgres utility that checks if the server accepts connections.
- `redis-cli ping` does the same for Redis.

### Docker networking
```yaml
DATABASE_URL=postgres://user:password@postgres:5432/shortener
REDIS_URL=redis:6379
```
- Docker Compose creates a network where service names ARE hostnames.
- `postgres` in the URL resolves to the postgres container's IP.
- No `localhost` — containers are separate network namespaces.

### Volumes
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data      # persist data across restarts
  - ./migrations:/docker-entrypoint-initdb.d    # auto-run SQL on first start
```
- Named volume `postgres_data` survives `docker compose down` (but not `down -v`).
- `docker-entrypoint-initdb.d` is a Postgres convention — any `.sql` files there run on first database creation.

### Port mapping
```yaml
ports:
  - "8080:8080"  # host:container
```
- Only the app exposes ports. Postgres and Redis are internal-only — not accessible from the host.
- This is a security best practice — database ports should never be publicly exposed.
