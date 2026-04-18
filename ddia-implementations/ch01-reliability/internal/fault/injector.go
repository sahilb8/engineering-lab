package fault

import (
	"math/rand/v2"
	"net/http"
	"sync"
	"time"
)

type FaultConfig struct {
	LatencyMs int
	ErrorRate float64
	HangRate  float64
	Rand      *rand.Rand
	mu        *sync.Mutex
}

func NewInjector(cfg FaultConfig) func(http.Handler) http.Handler {
	if cfg.Rand == nil {
		cfg.Rand = rand.New(rand.NewPCG(42, 1024))
	}
	cfg.mu = &sync.Mutex{}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cfg.mu.Lock()
			hangFail := cfg.Rand.Float64() < cfg.HangRate && cfg.HangRate > 0
			errorFail := cfg.Rand.Float64() < cfg.ErrorRate && cfg.ErrorRate > 0
			sleepDuration := 0
			if cfg.LatencyMs > 0 {
				sleepDuration = cfg.Rand.IntN(cfg.LatencyMs)
			}

			cfg.mu.Unlock()
			if hangFail {
				<-r.Context().Done()
				return
			}
			if errorFail {
				// Simulate an error response
				http.Error(w, "Injected fault", http.StatusInternalServerError)
				return
			}
			if sleepDuration > 0 {
				// Simulate latency
				time.Sleep(time.Duration(sleepDuration) * time.Millisecond)
			}

			next.ServeHTTP(w, r)
		})
	}
}
