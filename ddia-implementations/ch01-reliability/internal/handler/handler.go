package handler

import (
	"ch01-reliability/internal/health"
	"ch01-reliability/internal/metrics"
	"encoding/json"
	"math/rand/v2"
	"net/http"
	"time"
)

type Checker struct {
	cfg          health.HealthConfig
	histogram    *metrics.Histogram
	errorTracker *metrics.ErrorTracker
}

func (c *Checker) HealthHandler(w http.ResponseWriter, r *http.Request) {
	health, err := health.GetHealth(c.cfg, c.histogram, c.errorTracker)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(health)
}

func ProcessHandler(w http.ResponseWriter, r *http.Request) {
	time.Sleep(time.Duration(rand.IntN(41)+10) * time.Millisecond)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}

func NewChecker(cfg health.HealthConfig, histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker) *Checker {
	return &Checker{cfg: cfg, histogram: histogram, errorTracker: errorTracker}
}
