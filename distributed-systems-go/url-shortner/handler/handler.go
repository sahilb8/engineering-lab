package handler

import (
	"encoding/json"
	"net/http"

	"url-shortner/shortcode"
)

type Store interface {
	Save(code, url string) error
	Lookup(code string) (string, bool, error)
}

type App struct {
	Store Store
}

type urlShortenRequest struct {
	URL string `json:"url"`
}

type urlShortResponse struct {
	ShortURL string `json:"short_url"`
}

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
		http.Redirect(w, r, longURL, http.StatusFound)
	} else {
		http.Error(w, "Short URL not found", http.StatusNotFound)
		return
	}
}
