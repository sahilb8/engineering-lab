package metrics

import (
	"errors"
	"fmt"
	"sort"
	"sync"
)

type Histogram struct {
	latencyRecords []float64
	mu             sync.RWMutex
}

func NewHistogram() *Histogram {
	return &Histogram{
		latencyRecords: make([]float64, 0),
	}
}

// Record adds a latency observation in milliseconds
func (h *Histogram) Record(ms float64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.latencyRecords = append(h.latencyRecords, ms)
}

var ErrNoData = errors.New("no data points recorded")

// Percentile returns the Nth percentile (e.g. 95.0 for p95)
func (h *Histogram) Percentile(n float64) (float64, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if n < 0 || n > 100 {
		return 0, fmt.Errorf("percentile must be between 0 and 100, got %.2f", n)
	}
	if len(h.latencyRecords) == 0 {
		return 0, ErrNoData
	}

	latencyRecordsCopy := make([]float64, len(h.latencyRecords))
	copy(latencyRecordsCopy, h.latencyRecords)

	sort.Float64s(latencyRecordsCopy)

	return latencyRecordsCopy[int(float64(len(latencyRecordsCopy)-1)*n/100)], nil
}

// Count returns total observations recorded
func (h *Histogram) Count() int64 {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return int64(len(h.latencyRecords))
}
