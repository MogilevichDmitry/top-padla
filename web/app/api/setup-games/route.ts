import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    console.log("🚀 Creating game tables...");

    // Create game_sessions table
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

    console.log("✅ game_sessions table created");

    // Create game_attendees table
    await sql`
      CREATE TABLE IF NOT EXISTS game_attendees (
        id SERIAL PRIMARY KEY,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'attending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    console.log("✅ game_attendees table created");

    // Add status column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE game_attendees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'attending';
      `;
      console.log("✅ status column checked/added");
    } catch (e) {
      console.log("ℹ️ status column check skipped or failed:", e);
    }

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(date DESC, start_time);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_game_attendees_session ON game_attendees(game_session_id);
    `;

    console.log("✅ Indexes created");

    return NextResponse.json({
      success: true,
      message: "Game tables created successfully!",
      tables: ["game_sessions", "game_attendees"],
    });
  } catch (error: any) {
    console.error("❌ Failed to create game tables:", error);

    // Check if tables already exist
    if (error.message?.includes("already exists")) {
      return NextResponse.json({
        success: true,
        message: "Tables already exist",
        details: error.message,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to create game tables",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

