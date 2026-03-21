package store

import (
	"context"
	"database/sql"
	"time"
	"url-shortner/types"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type PgStore struct {
	db *pgxpool.Pool
}

func (pgs *PgStore) Save(code, url string, expiresAt *time.Time) error {
	var expiresAtSqlData sql.NullTime
	if expiresAt != nil {
		expiresAtSqlData = sql.NullTime{Time: *expiresAt, Valid: true}
	}
	query := `INSERT INTO urls (short_code, original_url, expires_at) VALUES ($1, $2, $3)`

	_, err := pgs.db.Exec(context.Background(), query, code, url, expiresAtSqlData)
	return err
}

func (pgs *PgStore) Lookup(code string) (*types.LookupResult, error) {
	var longURL string
	var expiresAt sql.NullTime
	query := `SELECT original_url, expires_at FROM urls WHERE short_code = $1`
	err := pgs.db.QueryRow(context.Background(), query, code).Scan(&longURL, &expiresAt)
	if err == pgx.ErrNoRows {
		return nil, nil // not found, but no error
	}
	if err != nil {
		return nil, err // real database error
	}
	if expiresAt.Valid && time.Now().After(expiresAt.Time) {
		return nil, ErrExpired
	}

	return &types.LookupResult{
		URL:       longURL,
		ExpiresAt: &expiresAt.Time,
	}, nil
}

// NewPGStore is a helper to initialize the struct
func NewPGStore(pool *pgxpool.Pool) *PgStore {
	return &PgStore{db: pool}
}
