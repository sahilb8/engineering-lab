package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
	"url-shortner/handler"
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

	var memoryStore handler.Store = store.NewMemoryStore()
	var app = &handler.App{
		Store: memoryStore,
	}

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

		var cachedStore handler.Store = store.NewCachedStore(rdb, pgStore, 10*time.Minute)
		app = &handler.App{
			Store: cachedStore,
		}
	}

	http.HandleFunc("GET /health", handler.HealthHandler)
	http.HandleFunc("POST /shorten", app.Shorten)
	http.HandleFunc("GET /{code}", app.RedirectHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
