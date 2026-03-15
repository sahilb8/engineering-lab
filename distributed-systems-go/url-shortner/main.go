package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"log"
	"math/big"
	"net/http"
	"os"
	"sync"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
)

type Store interface {
	Save(code, url string) error
	Lookup(code string) (string, bool, error)
}

type App struct {
	store Store
}

type urlShortenRequest struct {
	URL string `json:"url"`
}

type urlShortResponse struct {
	ShortURL string `json:"short_url"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok"}`))
}

func (app *App) shorten(w http.ResponseWriter, r *http.Request) {
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
		shortKey, shortKeyError = generateShortKey()
		if shortKeyError != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		_, exists, err := app.store.Lookup(shortKey)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		if !exists {
			app.store.Save(shortKey, req.URL)
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

func (app *App) redirectHandler(w http.ResponseWriter, r *http.Request) {
	// "code" matches the {code} in the route pattern
	code := r.PathValue("code")

	if code == "" {
		http.Error(w, "code missing", http.StatusBadRequest)
		return
	}

	longURL, exists, err := app.store.Lookup(code)
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

func generateShortKey() (string, error) {
	const n = 7
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[num.Int64()]
	}
	return string(result), nil
}

// in memory store implementation
type inMemoryStore struct {
	mu   sync.RWMutex
	data map[string]string
}

func (s *inMemoryStore) Save(code, url string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.data[code] = url

	return nil
}

func (s *inMemoryStore) Lookup(code string) (string, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	val, exists := s.data[code]
	return val, exists, nil
}

// postgres implementation

type pgStore struct {
	db *pgxpool.Pool
}

func (pgs *pgStore) Save(code, url string) error {
	query := `INSERT INTO urls (short_code, original_url) VALUES ($1, $2)`

	_, err := pgs.db.Exec(context.Background(), query, code, url)
	return err
}

func (pgs *pgStore) Lookup(code string) (string, bool, error) {
	var longURL string
	query := `SELECT original_url FROM urls WHERE short_code = $1`
	err := pgs.db.QueryRow(context.Background(), query, code).Scan(&longURL)
	if err == pgx.ErrNoRows {
		return "", false, nil // not found, but no error
	}
	if err != nil {
		return "", false, err // real database error
	}
	return longURL, true, nil
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	connStr := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.Connect(context.Background(), connStr)
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}
	defer pool.Close()

	var memoryStore Store = &inMemoryStore{data: make(map[string]string)}
	var store Store = &pgStore{db: pool}
	var app = &App{
		store: memoryStore,
	}

	if os.Getenv("ENV") == "DEV" {
		app = &App{
			store: store,
		}
	}

	http.HandleFunc("GET /health", healthHandler)
	http.HandleFunc("POST /shorten", app.shorten)
	http.HandleFunc("GET /{code}", app.redirectHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
