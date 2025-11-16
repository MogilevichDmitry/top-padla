/**
 * Script to initialize pre-computed statistics cache
 * Run with: npx tsx scripts/init-cache.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { updatePlayerStatsCache } from "../lib/cache";

async function initCache() {
  console.log("🚀 Initializing cache...\n");

  try {
    await updatePlayerStatsCache();
    console.log("\n🎉 Cache initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize cache:", error);
    process.exit(1);
  }
}

initCache();
