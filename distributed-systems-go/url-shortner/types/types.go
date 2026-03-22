package types

import "time"

type LookupResult struct {
	URL       string
	ExpiresAt *time.Time
}

type ClickEvent struct {
	Code      string
	IP        string
	Timestamp time.Time
}
