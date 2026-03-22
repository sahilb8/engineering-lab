package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

type RequestMetrics interface {
	IncTotalRequests()
}

func (rr *responseRecorder) WriteHeader(code int) {
	rr.statusCode = code                // capture it
	rr.ResponseWriter.WriteHeader(code) // pass through
}

func Logger(requestMetrics RequestMetrics, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rr := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		requestMetrics.IncTotalRequests()
		start := time.Now()
		next.ServeHTTP(rr, r) // everything downstream (ratelimit + handler) uses rr
		slog.Info("request_completed", "method", r.Method, "path", r.URL.Path, "status", rr.statusCode, "duration", time.Since(start))
	})
}
