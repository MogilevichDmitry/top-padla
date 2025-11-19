-- SQL для создания таблиц игр
-- Выполните этот скрипт в Vercel Dashboard → Storage → Postgres → Query

-- Создание таблицы игровых сессий
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location VARCHAR(50) NOT NULL DEFAULT 'Padel Point' CHECK (location IN ('Padel Point', 'Zawady')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание таблицы участников
CREATE TABLE IF NOT EXISTS game_attendees (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(date DESC, start_time);
CREATE INDEX IF NOT EXISTS idx_game_attendees_session ON game_attendees(game_session_id);

-- Проверка: должно вернуть пустой результат
SELECT * FROM game_sessions;
SELECT * FROM game_attendees;

