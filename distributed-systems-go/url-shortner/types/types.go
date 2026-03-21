package types

import "time"

type LookupResult struct {
	URL       string
	ExpiresAt *time.Time
}
