/**
 * Script to initialize pairs from match history
 * Run with: npx tsx scripts/init-pairs.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "@vercel/postgres";
import { expected, actualS, getLByType, getTByType } from "../lib/rating";

const START_RATING = 1000;
const K_BASE = 28;

interface Pair {
  id: number;
  player1_id: number;
  player2_id: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
}

async function getOrCreatePair(
  pairs: Map<string, Pair>,
  player1Id: number,
  player2Id: number,
  nextPairId: number
): Promise<{ pair: Pair; nextId: number }> {
  // Sort player IDs to ensure consistent pair identification
  const [p1, p2] = [player1Id, player2Id].sort((a, b) => a - b);
  const key = `${p1}-${p2}`;

  if (pairs.has(key)) {
    return { pair: pairs.get(key)!, nextId: nextPairId };
  }

  const pair: Pair = {
    id: nextPairId,
    player1_id: p1,
    player2_id: p2,
    rating: START_RATING,
    matches: 0,
    wins: 0,
    losses: 0,
  };

  pairs.set(key, pair);
  return { pair, nextId: nextPairId + 1 };
}

async function updatePairRating(
  pair: Pair,
  opponentPair: Pair,
  won: boolean,
  scoreDiff: number,
  matchType: string
) {
  const E = expected(pair.rating, opponentPair.rating);
  const T = getTByType(matchType);
  // Use score_diff if won, -score_diff if lost (same as Python)
  const S = actualS(won ? scoreDiff : -scoreDiff, 0, T, matchType);
  const L = getLByType(matchType);
  const delta = K_BASE * L * (S - E);

  pair.rating += delta;
  pair.matches += 1;

  if (won) {
    pair.wins += 1;
  } else {
    pair.losses += 1;
  }
}

async function initializePairs() {
  console.log("🚀 Initializing pairs from match history...\n");

  try {
    // Clear existing pairs
    await sql`DELETE FROM pairs`;
    console.log("✅ Cleared existing pairs\n");

    // Get all matches
    const { rows: matches } = await sql`
      SELECT * FROM matches
      WHERE array_length(team_a, 1) = 2 AND array_length(team_b, 1) = 2
      ORDER BY date ASC, id ASC
    `;

    if (matches.length === 0) {
      console.log("⚠️  No matches found to initialize pairs");
      return;
    }

    console.log(`📊 Processing ${matches.length} matches...\n`);

    const pairsMap = new Map<string, Pair>();
    let nextPairId = 1;

    // Process each match
    for (const match of matches) {
      const [a1, a2] = match.team_a;
      const [b1, b2] = match.team_b;

      // Get or create pairs
      const { pair: pairA, nextId: id1 } = await getOrCreatePair(
        pairsMap,
        a1,
        a2,
        nextPairId
      );
      nextPairId = id1;

      const { pair: pairB, nextId: id2 } = await getOrCreatePair(
        pairsMap,
        b1,
        b2,
        nextPairId
      );
      nextPairId = id2;

      // Update pair ratings
      const scoreDiff = match.score_a - match.score_b;
      const wonA = match.score_a > match.score_b;
      // Use abs(score_diff) like in Python, then actualS handles sign based on won
      const absScoreDiff = Math.abs(scoreDiff);

      await updatePairRating(pairA, pairB, wonA, absScoreDiff, match.type);
      await updatePairRating(pairB, pairA, !wonA, absScoreDiff, match.type);
    }

    // Insert pairs into database
    console.log(`💾 Inserting ${pairsMap.size} pairs into database...\n`);

    for (const pair of pairsMap.values()) {
      await sql`
        INSERT INTO pairs (id, player1_id, player2_id, rating, matches, wins, losses)
        VALUES (${pair.id}, ${pair.player1_id}, ${pair.player2_id}, ${pair.rating}, ${pair.matches}, ${pair.wins}, ${pair.losses})
        ON CONFLICT (player1_id, player2_id) DO UPDATE SET
          rating = ${pair.rating},
          matches = ${pair.matches},
          wins = ${pair.wins},
          losses = ${pair.losses}
      `;
    }

    console.log(`✅ Successfully initialized ${pairsMap.size} pairs!\n`);
    console.log("🎉 Pairs initialization completed!");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  }
}

initializePairs();
