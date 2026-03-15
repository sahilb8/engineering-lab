package store

import (
	"context"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type PgStore struct {
	db *pgxpool.Pool
}

func (pgs *PgStore) Save(code, url string) error {
	query := `INSERT INTO urls (short_code, original_url) VALUES ($1, $2)`

	_, err := pgs.db.Exec(context.Background(), query, code, url)
	return err
}

func (pgs *PgStore) Lookup(code string) (string, bool, error) {
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

// NewPGStore is a helper to initialize the struct
func NewPGStore(pool *pgxpool.Pool) *PgStore {
	return &PgStore{db: pool}
}
