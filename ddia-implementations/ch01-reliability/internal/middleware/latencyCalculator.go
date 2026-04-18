package middleware

import (
	"ch01-reliability/internal/metrics"
	"log/slog"
	"net/http"
	"time"
)

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.statusCode = code
	sr.ResponseWriter.WriteHeader(code)
}

func LatencyCalculator(histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rr := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rr, r)
		histogram.Record(float64(time.Since(start).Milliseconds()))
		if rr.statusCode >= 500 {
			errorTracker.RecordError()
		} else {
			errorTracker.RecordSuccess()
		}
		slog.Info("request_completed", "method", r.Method, "path", r.URL.Path, "status", rr.statusCode, "duration", time.Since(start))
	})
}
