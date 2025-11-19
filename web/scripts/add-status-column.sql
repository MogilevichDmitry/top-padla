-- SQL to add status column to game_attendees table
-- Run this in Vercel Dashboard -> Storage -> Postgres -> Query

-- Add status column if it doesn't exist
ALTER TABLE game_attendees 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'attending' 
CHECK (status IN ('attending', 'declined'));

-- Update existing records to have 'attending' status
UPDATE game_attendees 
SET status = 'attending' 
WHERE status IS NULL;

