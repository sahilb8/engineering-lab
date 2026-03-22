package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"url-shortner/analytics"
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

	trackerCtx, trackerCancel := context.WithCancel(context.Background())

	err := godotenv.Load()
	if err != nil {
		slog.Info("Warning: .env file not found")
	}

	var s handler.Store = store.NewMemoryStore() // default

	jsonHandler := slog.NewJSONHandler(os.Stdout, nil)
	jsonLogger := slog.New(jsonHandler)
	slog.SetDefault(jsonLogger)

	var db *pgxpool.Pool
	var redisClient *redis.Client
	var tracker *analytics.Tracker
	var analyticsStore handler.AnalyticsStore

	m := &handler.Metrics{}

	if os.Getenv("ENV") == "PROD" {
		connStr := os.Getenv("DATABASE_URL")
		db, err = pgxpool.Connect(context.Background(), connStr)
		if err != nil {
			slog.Error("postgres_connection_failed", "error", err)
			os.Exit(1)
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
			slog.Error("redis_connection_failed", "error", err)
		}
		pgStore := store.NewPGStore(db)
		tracker = analytics.NewTracker(1000, pgStore)
		analyticsStore = pgStore

		go tracker.Run(trackerCtx)

		s = store.NewCachedStore(redisClient, pgStore, 10*time.Minute, m)
	}

	app := &handler.App{Store: s, Metrics: m, Tracker: tracker, AnalyticsStore: analyticsStore}
	mux := http.NewServeMux()

	limiter := middleware.NewIPRateLimiter()

	mux.HandleFunc("GET /health", handler.HealthHandler)
	mux.HandleFunc("POST /shorten", app.Shorten)
	mux.HandleFunc("GET /{code}", app.RedirectHandler)
	mux.HandleFunc("GET /stats/{code}", app.StatsHandler)

	mux.Handle("GET /metrics", middleware.IPWhitelist(http.HandlerFunc(app.MetricsHandler), []string{"127.0.0.1", "::1"}))

	wrappedMux := middleware.Logger(m, limiter.RateLimiter(mux))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	srv := &http.Server{Addr: ":" + port, Handler: wrappedMux}

	go func() {
		slog.Info("server_started", "port", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server_failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("server_shutting_down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server_shutdown", "error", err)
		os.Exit(1)
	}

	trackerCancel()
	if tracker != nil {
		<-tracker.Done // wait for analytics drain to finish
	}

	if db != nil {
		db.Close()
	}
	if redisClient != nil {
		redisClient.Close()
	}

	slog.Info("server_exited_cleanly")

}
