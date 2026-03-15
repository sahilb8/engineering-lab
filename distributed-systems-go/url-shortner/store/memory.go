package store

import (
	"sync"
)

type MemoryStore struct {
	mu   sync.RWMutex
	data map[string]string
}

func (s *MemoryStore) Save(code, url string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.data[code] = url

	return nil
}

func (s *MemoryStore) Lookup(code string) (string, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	val, exists := s.data[code]
	return val, exists, nil
}

// NewMemoryStore is a helper to initialize the struct
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{data: make(map[string]string)}
}
