-- Create the urls table
CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY,

    short_code VARCHAR(10) UNIQUE NOT NULL,

    original_url TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMP NULL
);

CREATE TABLE link_analytics (
    id BIGSERIAL PRIMARY KEY,
    short_code TEXT NOT NULL,
    ip_address INET,            -- Specialized type for IP addresses
    clicked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);