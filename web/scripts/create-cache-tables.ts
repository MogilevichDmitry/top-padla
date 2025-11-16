/**
 * Script to create pre-computed statistics tables
 * Run with: npx tsx scripts/create-cache-tables.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "@vercel/postgres";

async function createCacheTables() {
  console.log("🚀 Creating cache tables...\n");

  try {
    // Create player_stats_cache table
    console.log("📝 Creating player_stats_cache table...");
    await sql`
      CREATE TABLE IF NOT EXISTS player_stats_cache (
        player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        rating DECIMAL(10, 2) NOT NULL DEFAULT 1000,
        matches INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        to6_wins INTEGER NOT NULL DEFAULT 0,
        to6_losses INTEGER NOT NULL DEFAULT 0,
        to4_wins INTEGER NOT NULL DEFAULT 0,
        to4_losses INTEGER NOT NULL DEFAULT 0,
        to3_wins INTEGER NOT NULL DEFAULT 0,
        to3_losses INTEGER NOT NULL DEFAULT 0,
        best_partner_id INTEGER REFERENCES players(id),
        best_partner_wr DECIMAL(5, 2),
        worst_partner_id INTEGER REFERENCES players(id),
        worst_partner_wr DECIMAL(5, 2),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ player_stats_cache created\n");

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_player_stats_cache_rating 
      ON player_stats_cache(rating DESC);
    `;

    // Create indexes for matches table
    console.log("📝 Creating indexes for matches table...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_date 
      ON matches(date DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_team_a 
      ON matches USING GIN(team_a);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_matches_team_b 
      ON matches USING GIN(team_b);
    `;
    console.log("✅ Indexes created\n");

    // Create index for players table
    console.log("📝 Creating index for players table...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_players_name 
      ON players(name);
    `;
    console.log("✅ Index created\n");

    console.log("🎉 Cache tables and indexes created successfully!");
  } catch (error) {
    console.error("❌ Failed to create cache tables:", error);
    process.exit(1);
  }
}

createCacheTables();
