package fault

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFaultInjector(t *testing.T) {

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("Rate 1.0 - Always Fail", func(t *testing.T) {
		faultConfig := FaultConfig{
			LatencyMs: 100,
			ErrorRate: 1,
			HangRate:  0.0,
			Rand:      nil, // Use default random generator
		}

		handlerToTest := NewInjector(faultConfig)(nextHandler)

		rec := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "https://google.com", nil)

		// 3. Directly call the ServeHTTP method
		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", rec.Code)
		}
	})

	t.Run("Test 2: ErrorRate 0.0", func(t *testing.T) {
		faultConfig := FaultConfig{
			LatencyMs: 100,
			ErrorRate: 0.0,
			HangRate:  0.0,
			Rand:      nil, // Use default random generator
		}

		handlerToTest := NewInjector(faultConfig)(nextHandler)

		rec := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "https://google.com", nil)

		// 3. Directly call the ServeHTTP method
		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("Test 3: ErrorRate 0.5", func(t *testing.T) {
		faultConfig := FaultConfig{
			LatencyMs: 0,
			ErrorRate: 0.5,
			HangRate:  0.0,
			Rand:      nil, // Use default random generator
		}

		handlerToTest := NewInjector(faultConfig)(nextHandler)

		errorCount := 0

		for i := 0; i < 1000; i++ {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/", nil)
			handlerToTest.ServeHTTP(rec, req)

			if rec.Code == http.StatusInternalServerError {
				errorCount++
			}
		}

		if errorCount < 400 || errorCount > 600 {
			t.Errorf("expected ~500 errors, got %d", errorCount)
		}

	})

}
