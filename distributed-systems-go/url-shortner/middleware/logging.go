package middleware

import (
	"log"
	"net/http"
	"time"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (rr *responseRecorder) WriteHeader(code int) {
	rr.statusCode = code                // capture it
	rr.ResponseWriter.WriteHeader(code) // pass through
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rr := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}

		start := time.Now()
		next.ServeHTTP(rr, r) // everything downstream (ratelimit + handler) uses rr
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rr.statusCode, time.Since(start))
	})
}
