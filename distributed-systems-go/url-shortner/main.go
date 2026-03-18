package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
	"url-shortner/handler"
	"url-shortner/middleware"
	"url-shortner/store"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	var s handler.Store = store.NewMemoryStore() // default
	if os.Getenv("ENV") == "PROD" {
		connStr := os.Getenv("DATABASE_URL")
		pool, err := pgxpool.Connect(context.Background(), connStr)
		if err != nil {
			log.Fatal("Unable to connect to database:", err)
		}
		defer pool.Close()
		redisHost := os.Getenv("REDIS_URL")
		rdb := redis.NewClient(&redis.Options{
			Addr:     redisHost,
			Password: "", // no password set
			DB:       0,  // use default DB
		})

		// Health check: Ping Redis
		ctx := context.Background()
		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("Could not connect to Redis: %v", err)
		}
		pgStore := store.NewPGStore(pool)

		s = store.NewCachedStore(rdb, pgStore, 10*time.Minute)
	}

	app := &handler.App{Store: s}

	mux := http.NewServeMux()

	limiter := middleware.NewIPRateLimiter()

	mux.HandleFunc("GET /health", handler.HealthHandler)
	mux.HandleFunc("POST /shorten", app.Shorten)
	mux.HandleFunc("GET /{code}", app.RedirectHandler)

	wrappedMux := middleware.Logger(limiter.RateLimiter(mux))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, wrappedMux))
}
