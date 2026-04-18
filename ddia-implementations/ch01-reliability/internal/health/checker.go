package health

import (
	"ch01-reliability/internal/metrics"
	"errors"
	"fmt"
)

type HealthConfig struct {
	Thresholds   map[float64]float64 // percentile → max acceptable ms, e.g. {50: 100, 95: 300, 99: 500}
	MaxErrorRate float64             // e.g. 0.5 for 50%
}

func percentileKey(percentile float64) string {
	return fmt.Sprintf("p%.0f", percentile)
}

func GetHealth(cfg HealthConfig, histogram *metrics.Histogram, errorTracker *metrics.ErrorTracker) (map[string]string, error) {
	errorRate := errorTracker.ErrorRate()
	health := map[string]string{
		"error_rate": fmt.Sprintf("%.2f%%", errorRate*100),
		"status":     "Healthy",
	}

	for percentile, threshold := range cfg.Thresholds {
		p, err := histogram.Percentile(percentile)
		if err != nil {
			if errors.Is(err, metrics.ErrNoData) {
				health[percentileKey(percentile)] = "No data"
				continue
			} else {
				return nil, fmt.Errorf("failed to calculate percentile: %w", err)
			}
		}
		health[percentileKey(percentile)] = fmt.Sprintf("%.2fms", p)
		if p > threshold {
			health["status"] = "Degraded"
		}
	}
	if errorRate > cfg.MaxErrorRate {
		health["status"] = "Unhealthy"
	}
	return health, nil
}
