package store

import (
	"sync"
	"time"
	"url-shortner/types"
)

type ExpiryTime struct {
	Time  time.Time
	Valid bool
}

type urlData struct {
	url       string
	expiresAt *ExpiryTime
}

type MemoryStore struct {
	mu   sync.RWMutex
	data map[string]*urlData
}

func (s *MemoryStore) Save(code, url string, expiresAt *time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry := &urlData{url: url}
	if expiresAt != nil {
		entry.expiresAt = &ExpiryTime{Time: *expiresAt, Valid: true}
	}
	s.data[code] = entry

	return nil
}

func (s *MemoryStore) Lookup(code string) (*types.LookupResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	val, exists := s.data[code]
	if !exists {
		return nil, nil
	}
	if val.expiresAt != nil && val.expiresAt.Valid && time.Now().After(val.expiresAt.Time) {
		return nil, ErrExpired
	}
	result := &types.LookupResult{URL: val.url}
	if val.expiresAt != nil {
		result.ExpiresAt = &val.expiresAt.Time
	}
	return result, nil

}

// NewMemoryStore is a helper to initialize the struct
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{data: make(map[string]*urlData)}
}
