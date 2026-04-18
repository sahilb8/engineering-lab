package metrics

import (
	"sync"
)

type ErrorTracker struct {
	totalRequests int64
	errorCount    int64
	mu            sync.RWMutex
}

func NewErrorTracker() *ErrorTracker {
	return &ErrorTracker{
		totalRequests: 0,
		errorCount:    0,
	}
}

func (e *ErrorTracker) RecordSuccess() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.totalRequests++
}

func (e *ErrorTracker) RecordError() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.totalRequests++
	e.errorCount++
}

func (e *ErrorTracker) ErrorRate() float64 {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.totalRequests == 0 {
		return 0
	}
	return float64(e.errorCount) / float64(e.totalRequests)
}
