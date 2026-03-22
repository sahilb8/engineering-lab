package store

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"
	"url-shortner/types"

	"github.com/redis/go-redis/v9"
)

type primaryStore interface {
	Save(code, url string, expiresAt *time.Time) error
	Lookup(code string) (*types.LookupResult, error)
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

func (cs *CachedStore) Save(code, url string, expiresAt *time.Time) error {
	if err := cs.primary.Save(code, url, expiresAt); err != nil {
		return err
	}

	ttl := cs.ttl // default
	if expiresAt != nil {
		ttl = time.Until(*expiresAt)
	}

	data, _ := json.Marshal(types.LookupResult{URL: url, ExpiresAt: expiresAt})

	if err := cs.redis.Set(context.Background(), code, data, ttl).Err(); err != nil {
		slog.Error("redis_set_failed", "code", code, "error", err)
	}
	return nil
}

func (cs *CachedStore) Lookup(code string) (*types.LookupResult, error) {
	ctx := context.Background()
	redisVal, err := cs.redis.Get(ctx, code).Result()

	if err == nil {
		cs.metrics.IncCacheHit()
		var result types.LookupResult
		json.Unmarshal([]byte(redisVal), &result)
		return &result, nil
	}
	if !errors.Is(err, redis.Nil) {
		slog.Error("redis_error", "error", err)
	}
	cs.metrics.IncCacheMiss()

	sqlVal, err := cs.primary.Lookup(code)
	if err != nil || sqlVal == nil {
		return sqlVal, err
	}
	ttl := cs.ttl // default
	if sqlVal.ExpiresAt != nil {
		ttl = time.Until(*sqlVal.ExpiresAt)
	}
	data, _ := json.Marshal(sqlVal)
	go cs.redis.Set(ctx, code, data, ttl)
	return sqlVal, nil
}

// NewCachedStore is a helper to initialize the struct
func NewCachedStore(client *redis.Client, primary primaryStore, ttl time.Duration, m CacheMetrics) *CachedStore {
	return &CachedStore{redis: client, primary: primary, ttl: ttl, metrics: m}
}
