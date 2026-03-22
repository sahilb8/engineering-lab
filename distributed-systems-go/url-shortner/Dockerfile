# Build Stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
# Disable CGO for a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .

# Final Stage
FROM alpine:3.19
COPY --from=builder /app/myapp /myapp
# Since there is no OS, we just run the file
ENTRYPOINT ["/myapp"]