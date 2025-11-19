-- Schema for top-padla database

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tg_id BIGINT UNIQUE
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('to6', 'to4', 'to3')),
  team_a INTEGER[] NOT NULL,
  team_b INTEGER[] NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  created_by BIGINT
);

CREATE TABLE IF NOT EXISTS pairs (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER NOT NULL REFERENCES players(id),
  player2_id INTEGER NOT NULL REFERENCES players(id),
  rating REAL NOT NULL DEFAULT 1000,
  matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  UNIQUE(player1_id, player2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);
CREATE INDEX IF NOT EXISTS idx_pairs_rating ON pairs(rating DESC);

-- Game sessions table for scheduling games
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location VARCHAR(50) NOT NULL DEFAULT 'Padel Point' CHECK (location IN ('Padel Point', 'Zawady')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Game attendees table for tracking who's coming
-- Note: We handle uniqueness case-insensitively in application code
CREATE TABLE IF NOT EXISTS game_attendees (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(date DESC, start_time);
CREATE INDEX IF NOT EXISTS idx_game_attendees_session ON game_attendees(game_session_id);

