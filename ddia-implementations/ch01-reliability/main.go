package main

import (
	"ch01-reliability/internal/fault"
	"ch01-reliability/internal/handler"
	"ch01-reliability/internal/health"
	"ch01-reliability/internal/metrics"
	"ch01-reliability/internal/middleware"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	histogram := metrics.NewHistogram()
	errorTracker := metrics.NewErrorTracker()
	faultMiddleware := fault.NewInjector(fault.FaultConfig{
		LatencyMs: 2,
		ErrorRate: 0.0,
		HangRate:  0.0,
		Rand:      nil,
	})
	checker := handler.NewChecker(health.HealthConfig{
		Thresholds:   map[float64]float64{50: 100, 95: 300, 99: 500},
		MaxErrorRate: 0.5,
	}, histogram, errorTracker)
	mux.HandleFunc("/health", checker.HealthHandler)
	mux.Handle("/process", middleware.LatencyCalculator(histogram, errorTracker, faultMiddleware(http.HandlerFunc(handler.ProcessHandler))))
	http.ListenAndServe(":8080", mux)
}
