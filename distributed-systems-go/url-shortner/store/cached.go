package store

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

type primaryStore interface {
	Save(code, url string) error
	Lookup(code string) (string, bool, error)
}

type CacheMetrics interface {
	IncCacheHit()
	IncCacheMiss()
}

type CachedStore struct {
	redis   *redis.Client
	primary primaryStore
	ttl     time.Duration
	metrics CacheMetrics
}

func (cs *CachedStore) Save(code, url string) error {
	if err := cs.primary.Save(code, url); err != nil {
		return err
	}

	if err := cs.redis.Set(context.Background(), code, url, cs.ttl).Err(); err != nil {
		slog.Error("redis_set_failed", "code", code, "error", err)
	}
	return nil
}

func (cs *CachedStore) Lookup(code string) (string, bool, error) {
	ctx := context.Background()
	val, err := cs.redis.Get(ctx, code).Result()

	if err == nil {
		return val, true, nil
	}
	if !errors.Is(err, redis.Nil) {
		slog.Error("redis_error", "error", err)
	}

	val, found, err := cs.primary.Lookup(code)
	if err != nil || !found {
		cs.metrics.IncCacheMiss()
		return "", found, err
	}
	cs.metrics.IncCacheHit()
	go cs.redis.Set(ctx, code, val, cs.ttl)
	return val, true, nil
}

// NewCachedStore is a helper to initialize the struct
func NewCachedStore(client *redis.Client, primary primaryStore, ttl time.Duration, m CacheMetrics) *CachedStore {
	return &CachedStore{redis: client, primary: primary, ttl: ttl, metrics: m}
}
