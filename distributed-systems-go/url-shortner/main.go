package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"url-shortner/handler"
	"url-shortner/store"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
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
		var pgStore handler.Store = store.NewPGStore(pool)
		app = &handler.App{
			Store: pgStore,
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
