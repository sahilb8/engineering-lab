package main

import (
	"ch01-reliability/internal/fault"
	"ch01-reliability/internal/handler"
	"ch01-reliability/internal/health"
	"ch01-reliability/internal/metrics"
	"ch01-reliability/internal/middleware"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
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

	server := &http.Server{Addr: ":8080", Handler: mux}

	go func() {
		slog.Info("server_started", "port", ":8080")
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server_failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("server_shutting_down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server_shutdown", "error", err)
		os.Exit(1)
	}
}
