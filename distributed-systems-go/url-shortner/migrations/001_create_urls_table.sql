-- Create the urls table
CREATE TABLE IF NOT EXISTS urls (
    -- SERIAL handles the auto-incrementing integer for us
    id SERIAL PRIMARY KEY,

    -- 'short_code' must be unique and cannot be null. 
    -- We add an index implicitly by using UNIQUE, 
    -- but we can be explicit for clarity.
    short_code VARCHAR(10) UNIQUE NOT NULL,

    -- 'original_url' stores the long destination
    original_url TEXT NOT NULL,

    -- 'created_at' defaults to the moment the row is inserted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);