package handler

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"url-shortner/shortcode"
	"url-shortner/store"
	"url-shortner/types"
)

type Store interface {
	Save(code, url string, expiresAt *time.Time) error
	Lookup(code string) (*types.LookupResult, error)
}

type Metrics struct {
	TotalRequests  atomic.Int64
	TotalShortened atomic.Int64
	TotalRedirects atomic.Int64
	CacheHits      atomic.Int64
	CacheMisses    atomic.Int64
}

type Tracker interface {
	Track(event types.ClickEvent)
}

type AnalyticsStore interface {
	AnalyticsLookup(code string) (int, error)
}

type App struct {
	Store          Store
	Metrics        *Metrics
	Tracker        Tracker
	AnalyticsStore AnalyticsStore
}

type urlShortenRequest struct {
	URL       string     `json:"url"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type urlShortResponse struct {
	ShortURL string `json:"short_url"`
}

func (m *Metrics) IncCacheHit()      { m.CacheHits.Add(1) }
func (m *Metrics) IncCacheMiss()     { m.CacheMisses.Add(1) }
func (m *Metrics) IncTotalRequests() { m.TotalRequests.Add(1) }

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok"}`))
}

func (app *App) Shorten(w http.ResponseWriter, r *http.Request) {
	var req urlShortenRequest
	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.URL == "" {
		http.Error(w, "URL empty", http.StatusBadRequest)
		return
	}

	var shortKey string
	var shortKeyError error
	for i := 0; i < 5; i++ {
		shortKey, shortKeyError = shortcode.GenerateShortKey()
		if shortKeyError != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		val, err := app.Store.Lookup(shortKey)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		if val == nil {
			if err := app.Store.Save(shortKey, req.URL, req.ExpiresAt); err != nil {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			break
		}
		shortKey = ""
	}

	if shortKey != "" {
		app.Metrics.TotalShortened.Add(1)
		resp := urlShortResponse{
			ShortURL: "http://localhost:8000/" + shortKey,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(resp)
	} else {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}

}

func (app *App) RedirectHandler(w http.ResponseWriter, r *http.Request) {
	// "code" matches the {code} in the route pattern
	code := r.PathValue("code")
	clientIP, _, _ := net.SplitHostPort(r.RemoteAddr)

	if code == "" {
		http.Error(w, "code missing", http.StatusBadRequest)
		return
	}

	val, err := app.Store.Lookup(code)
	if errors.Is(err, store.ErrExpired) {
		http.Error(w, "Link Expired", http.StatusGone) // 410
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	} else if val != nil {
		app.Metrics.TotalRedirects.Add(1)
		if app.Tracker != nil {
			app.Tracker.Track(types.ClickEvent{Code: code, IP: clientIP, Timestamp: time.Now()})
		}
		http.Redirect(w, r, val.URL, http.StatusFound)
	} else {
		http.Error(w, "Short URL not found", http.StatusNotFound)
		return
	}
}

func (app *App) MetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{
		"total_requests":  app.Metrics.TotalRequests.Load(),
		"total_shortened": app.Metrics.TotalShortened.Load(),
		"total_redirects": app.Metrics.TotalRedirects.Load(),
		"cache_hits":      app.Metrics.CacheHits.Load(),
		"cache_misses":    app.Metrics.CacheMisses.Load(),
	})
}

func (app *App) StatsHandler(w http.ResponseWriter, r *http.Request) {
	// "code" matches the {code} in the route pattern
	code := r.PathValue("code")

	if code == "" {
		http.Error(w, "code missing", http.StatusBadRequest)
		return
	}

	if app.AnalyticsStore != nil {
		totalClicks, err := app.AnalyticsStore.AnalyticsLookup(code)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{
			"total_clicks": totalClicks,
		})
	} else {
		http.Error(w, "analytics not defined", http.StatusBadRequest)
		return
	}

}
