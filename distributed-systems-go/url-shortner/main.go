package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"url-shortner/handler"
	"url-shortner/middleware"
	"url-shortner/store"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	var s handler.Store = store.NewMemoryStore() // default

	var db *pgxpool.Pool
	var redisClient *redis.Client

	if os.Getenv("ENV") == "PROD" {
		connStr := os.Getenv("DATABASE_URL")
		db, err = pgxpool.Connect(context.Background(), connStr)
		if err != nil {
			log.Fatal("Unable to connect to database:", err)
		}
		redisHost := os.Getenv("REDIS_URL")
		redisClient = redis.NewClient(&redis.Options{
			Addr:     redisHost,
			Password: "", // no password set
			DB:       0,  // use default DB
		})

		// Health check: Ping Redis
		backgroundCtx := context.Background()
		if err := redisClient.Ping(backgroundCtx).Err(); err != nil {
			log.Printf("Could not connect to Redis: %v", err)
		}
		pgStore := store.NewPGStore(db)

		s = store.NewCachedStore(redisClient, pgStore, 10*time.Minute)
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

	srv := &http.Server{Addr: ":" + port, Handler: wrappedMux}

	go func() {
		log.Println("Server starting on :" + port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	if db != nil {
		db.Close()
	}
	if redisClient != nil {
		redisClient.Close()
	}

	log.Println("Server exited cleanly")
}
