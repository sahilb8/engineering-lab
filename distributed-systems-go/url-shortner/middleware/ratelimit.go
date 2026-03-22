package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ipStoreEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
	mu       sync.Mutex
}

type IPRateLimiter struct {
	ips sync.Map
}

func NewIPRateLimiter() *IPRateLimiter {
	i := &IPRateLimiter{}

	// Start the background cleanup goroutine
	go i.cleanup()

	return i
}

func (i *IPRateLimiter) cleanup() {
	for {
		// Sweep every minute
		time.Sleep(time.Minute)

		i.ips.Range(func(key, value any) bool {
			e := value.(*ipStoreEntry)
			e.mu.Lock()
			// If the IP hasn't been seen in 3 minutes, delete it
			if time.Since(e.lastSeen) > 3*time.Minute {
				i.ips.Delete(key)
			}
			e.mu.Unlock()
			return true
		})
	}
}

func (i *IPRateLimiter) RateLimiter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr // Fallback
		}

		val, _ := i.ips.LoadOrStore(ip, &ipStoreEntry{limiter: rate.NewLimiter(10, 20), lastSeen: time.Now()})
		ipAdress := val.(*ipStoreEntry)

		ipAdress.mu.Lock()
		ipAdress.lastSeen = time.Now()
		ipAdress.mu.Unlock()

		if !ipAdress.limiter.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
