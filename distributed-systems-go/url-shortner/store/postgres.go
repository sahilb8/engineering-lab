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

func (pgs *PgStore) AnalyticsLookup(code string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM link_analytics WHERE short_code = $1`

	err := pgs.db.QueryRow(context.Background(), query, code).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (pgs *PgStore) SaveAnalytics(clickEvent types.ClickEvent) error {
	query := `INSERT INTO link_analytics (short_code, ip_address, clicked_at) VALUES ($1, $2, $3)`

	_, err := pgs.db.Exec(context.Background(), query, clickEvent.Code, clickEvent.IP, clickEvent.Timestamp)
	return err
}

// NewPGStore is a helper to initialize the struct
func NewPGStore(pool *pgxpool.Pool) *PgStore {
	return &PgStore{db: pool}
}
