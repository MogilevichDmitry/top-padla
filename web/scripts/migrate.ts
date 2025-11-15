/**
 * Migration script to import data from data.json to Vercel Postgres
 * Run with: npx tsx scripts/migrate.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "@vercel/postgres";
import * as fs from "fs";
import * as path from "path";

interface OldPlayer {
  id: number;
  name: string;
  tg_id: number | null;
}

interface OldMatch {
  id: number;
  date: string;
  type: string;
  team_a: number[];
  team_b: number[];
  score_a: number;
  score_b: number;
  created_by: number | null;
}

interface OldData {
  players: { [key: string]: OldPlayer };
  matches: { [key: string]: OldMatch };
}

async function migrate() {
  console.log("🚀 Starting migration...\n");

  // Read data.json from parent directory
  const dataPath = path.join(__dirname, "../../data.json");
  const data: OldData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  try {
    // Create tables
    console.log("📝 Creating tables...");
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tg_id BIGINT UNIQUE
      );
    `;
    await sql`
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
    `;
    await sql`
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
    `;
    console.log("✅ Tables created\n");

    // Migrate players
    console.log("👥 Migrating players...");
    const players = Object.values(data.players);
    for (const player of players) {
      await sql`
        INSERT INTO players (id, name, tg_id)
        VALUES (${player.id}, ${player.name}, ${player.tg_id})
        ON CONFLICT (id) DO UPDATE SET name = ${player.name}, tg_id = ${player.tg_id}
      `;
    }
    console.log(`✅ Migrated ${players.length} players\n`);

    // Migrate matches
    console.log("🎾 Migrating matches...");
    const matches = Object.values(data.matches);
    for (const match of matches) {
      await sql`
        INSERT INTO matches (id, date, type, team_a, team_b, score_a, score_b, created_by)
        VALUES (
          ${match.id},
          ${match.date}::timestamp,
          ${match.type},
          ${match.team_a},
          ${match.team_b},
          ${match.score_a},
          ${match.score_b},
          ${match.created_by}
        )
        ON CONFLICT (id) DO UPDATE SET
          date = ${match.date}::timestamp,
          type = ${match.type},
          team_a = ${match.team_a},
          team_b = ${match.team_b},
          score_a = ${match.score_a},
          score_b = ${match.score_b},
          created_by = ${match.created_by}
      `;
    }
    console.log(`✅ Migrated ${matches.length} matches\n`);

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
