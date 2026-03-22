package analytics

import (
	"context"
	"log/slog"
	"url-shortner/types"
)

type analyticsStore interface {
	SaveAnalytics(clickEvent types.ClickEvent) error
	AnalyticsLookup(code string) (int, error)
}

type Tracker struct {
	analyticsChan  (chan types.ClickEvent)
	analyticsStore analyticsStore
	Done           chan struct{}
}

func (t *Tracker) Track(event types.ClickEvent) {
	select {
	case t.analyticsChan <- event:
		// Successfully queued
	default:
		// The channel is FULL.
		// We "drop" the analytic to keep the website fast for the user.
		slog.Warn("analytics_dropped", "code", event.Code, "IP", event.IP, "timestamp", event.Timestamp, "reason", "buffer_full")
	}
}

// Inside your tracker.go or analytics.go
func (t *Tracker) Run(ctx context.Context) {
	slog.Info("analytics worker started")

	for {
		select {
		case event := <-t.analyticsChan:
			// 1. Insert into Database
			err := t.analyticsStore.SaveAnalytics(event)
			if err != nil {
				slog.Error("failed to save click", "error", err, "code", event.Code)
			}
		case <-ctx.Done():
			slog.Info("analytics worker draining...")
			close(t.analyticsChan)
			for event := range t.analyticsChan {
				t.analyticsStore.SaveAnalytics(event)
			}
			close(t.Done)
			return
		}
	}
}

func NewTracker(bufferSize int, analyticsStore analyticsStore) *Tracker {
	return &Tracker{
		analyticsChan:  make(chan types.ClickEvent, bufferSize),
		analyticsStore: analyticsStore,
		Done:           make(chan struct{}),
	}
}
