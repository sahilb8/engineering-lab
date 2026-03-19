package handler

import (
	"encoding/json"
	"net/http"
	"sync/atomic"

	"url-shortner/shortcode"
)

type Store interface {
	Save(code, url string) error
	Lookup(code string) (string, bool, error)
}

type Metrics struct {
	TotalRequests  atomic.Int64
	TotalShortened atomic.Int64
	TotalRedirects atomic.Int64
	CacheHits      atomic.Int64
	CacheMisses    atomic.Int64
}

type App struct {
	Store   Store
	Metrics *Metrics
}

type urlShortenRequest struct {
	URL string `json:"url"`
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
		_, exists, err := app.Store.Lookup(shortKey)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		if !exists {
			if err := app.Store.Save(shortKey, req.URL); err != nil {
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

	if code == "" {
		http.Error(w, "code missing", http.StatusBadRequest)
		return
	}

	longURL, exists, err := app.Store.Lookup(code)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	} else if exists {
		app.Metrics.TotalRedirects.Add(1)
		http.Redirect(w, r, longURL, http.StatusFound)
	} else {
		http.Error(w, "Short URL not found", http.StatusNotFound)
		return
	}
}

func (a *App) MetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{
		"total_requests":  a.Metrics.TotalRequests.Load(),
		"total_shortened": a.Metrics.TotalShortened.Load(),
		"total_redirects": a.Metrics.TotalRedirects.Load(),
		"cache_hits":      a.Metrics.CacheHits.Load(),
		"cache_misses":    a.Metrics.CacheMisses.Load(),
	})
}
