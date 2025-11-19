/**
 * Script to create game_sessions and game_attendees tables
 * Run with: npx tsx scripts/create-game-tables.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "@vercel/postgres";

async function createGameTables() {
  console.log("🚀 Creating game tables...\n");

  try {
    // Create game_sessions table
    console.log("📝 Creating game_sessions table...");
    await sql`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        location VARCHAR(50) NOT NULL DEFAULT 'Padel Point' CHECK (location IN ('Padel Point', 'Zawady')),
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ game_sessions table created\n");

    // Create game_attendees table
    console.log("📝 Creating game_attendees table...");
    await sql`
      CREATE TABLE IF NOT EXISTS game_attendees (
        id SERIAL PRIMARY KEY,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'attending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    // Add status column if it doesn't exist (migration for existing tables)
    try {
        await sql`
        ALTER TABLE game_attendees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'attending';
        `;
        console.log("✅ status column checked/added");
    } catch (e) {
        console.log("ℹ️ status column check skipped");
    }

    console.log("✅ game_attendees table created\n");

    // Create indexes
    console.log("📝 Creating indexes...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(date DESC, start_time);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_attendees_session ON game_attendees(game_session_id);
    `;
    console.log("✅ Indexes created\n");

    console.log("🎉 Game tables created successfully!");
  } catch (error) {
    console.error("❌ Failed to create game tables:", error);
    process.exit(1);
  }
}

createGameTables();

