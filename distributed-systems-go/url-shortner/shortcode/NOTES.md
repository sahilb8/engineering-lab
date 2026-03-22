# shortcode/ — Short Code Generation

## What this package does
Generates random 7-character codes using base62 characters (a-z, A-Z, 0-9) for URL shortening.

## Key Go concepts used

### crypto/rand vs math/rand
```go
import "crypto/rand"

num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
```
- `crypto/rand` uses the OS's cryptographic random source. Unpredictable, safe for generating codes users will see.
- `math/rand` is a pseudo-random number generator. Predictable if you know the seed. Fine for simulations, bad for anything user-facing.
- Short codes are in URLs — if they're predictable, someone could enumerate all shortened URLs.

### Base62 encoding
```go
const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
```
- 62 characters = URL-safe without encoding (no special characters).
- 7 characters = 62^7 = ~3.5 trillion possible codes.
- At 1000 new URLs/day, collision probability stays negligible for centuries.

### Error handling on randomness
```go
num, err := rand.Int(rand.Reader, big.NewInt(...))
if err != nil {
    return "", err
}
```
- `crypto/rand` can fail (OS entropy exhaustion, though extremely rare).
- The function returns `(string, error)` — caller decides how to handle failure.
- In the handler, this becomes a 500 response.

## Why this is its own package
- Single responsibility: code generation is independent of HTTP, storage, or any other concern.
- Easy to swap the algorithm later (e.g., base62 → nanoid → hash-based) without touching handlers.
- Easy to benchmark independently: `go test -bench=. ./shortcode/`
