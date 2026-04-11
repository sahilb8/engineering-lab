package metrics

import (
	"sync"
	"testing"
)

func TestGetPercentile(t *testing.T) {
	tracker := NewHistogram()
	for _, v := range []float64{10, 20, 30, 40, 50} {
		tracker.Record(v)
	}

	t.Run("p50 returns median", func(t *testing.T) {
		result, err := tracker.Percentile(50)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != 30 {
			t.Errorf("expected 30, got %.2f", result)
		}
	})

	t.Run("empty tracker returns error", func(t *testing.T) {
		empty := NewHistogram()
		_, err := empty.Percentile(50)
		if err == nil {
			t.Error("expected error for empty tracker")
		}
	})

	t.Run("p100 returns maximum", func(t *testing.T) {
		result, err := tracker.Percentile(100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != 50 {
			t.Errorf("expected 50, got %.2f", result)
		}
	})

	t.Run("p101 returns invalid percentile", func(t *testing.T) {
		_, err := tracker.Percentile(101)
		if err == nil {
			t.Error("expected error for invalid percentile")
		}
	})

	t.Run("concurrent writes are safe", func(t *testing.T) {
		tracker := NewHistogram()
		goroutines := 10
		recordsPerGoroutine := 100

		// sync.WaitGroup is used to wait for all goroutines to finish before checking the count
		var wg sync.WaitGroup
		wg.Add(goroutines)

		for i := 0; i < goroutines; i++ {
			go func() {
				// wg.Done() is called when the goroutine finishes to signal that it's done
				defer wg.Done()
				for j := 0; j < recordsPerGoroutine; j++ {
					tracker.Record(float64(j))
				}
			}()
		}

		wg.Wait() // wait for all goroutines to finish

		expected := int64(goroutines * recordsPerGoroutine)
		if tracker.Count() != expected {
			t.Errorf("expected %d records, got %d", expected, tracker.Count())
		}
	})

	t.Run("large dataset check", func(t *testing.T) {
		tracker := NewHistogram()
		for i := 1; i <= 100; i++ {
			tracker.Record(float64(i))
		}
		t.Run("p95", func(t *testing.T) {
			result, err := tracker.Percentile(95)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != 95 {
				t.Errorf("expected 95, got %.2f", result)
			}
		})

		t.Run("p99", func(t *testing.T) {
			result, err := tracker.Percentile(99)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != 99 {
				t.Errorf("expected 99, got %.2f", result)
			}
		})
	})
}
