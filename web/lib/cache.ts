/**
 * Functions for managing pre-computed statistics cache
 */

import { sql } from "@vercel/postgres";
import { getPlayers, getMatches, Player, Match } from "./db";
import { calculateRatings, getPlayerStats, RatingTable } from "./rating";

export interface CachedPlayerStats {
  player_id: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  to6_wins: number;
  to6_losses: number;
  to4_wins: number;
  to4_losses: number;
  to3_wins: number;
  to3_losses: number;
  best_partner_id: number | null;
  best_partner_wr: number | null;
  worst_partner_id: number | null;
  worst_partner_wr: number | null;
  updated_at: string;
}

/**
 * Update all player statistics cache
 */
export async function updatePlayerStatsCache(): Promise<void> {
  console.log("🔄 Updating player stats cache...");

  const [players, matches] = await Promise.all([getPlayers(), getMatches()]);

  // Calculate ratings once
  const ratings = calculateRatings(players, matches);

  // Update cache for each player
  for (const player of players) {
    const stats = getPlayerStats(player.id, matches);
    const rating = ratings[player.id] || 1000;

    await sql`
      INSERT INTO player_stats_cache (
        player_id,
        rating,
        matches,
        wins,
        losses,
        win_rate,
        to6_wins,
        to6_losses,
        to4_wins,
        to4_losses,
        to3_wins,
        to3_losses,
        best_partner_id,
        best_partner_wr,
        worst_partner_id,
        worst_partner_wr,
        updated_at
      )
      VALUES (
        ${player.id},
        ${rating},
        ${stats.matches},
        ${stats.wins},
        ${stats.losses},
        ${stats.winRate},
        ${stats.to6Wins},
        ${stats.to6Losses},
        ${stats.to4Wins},
        ${stats.to4Losses},
        ${stats.to3Wins},
        ${stats.to3Losses},
        ${stats.bestPartner || null},
        ${stats.bestPartnerWR || null},
        ${stats.worstPartner || null},
        ${stats.worstPartnerWR || null},
        NOW()
      )
      ON CONFLICT (player_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        matches = EXCLUDED.matches,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        win_rate = EXCLUDED.win_rate,
        to6_wins = EXCLUDED.to6_wins,
        to6_losses = EXCLUDED.to6_losses,
        to4_wins = EXCLUDED.to4_wins,
        to4_losses = EXCLUDED.to4_losses,
        to3_wins = EXCLUDED.to3_wins,
        to3_losses = EXCLUDED.to3_losses,
        best_partner_id = EXCLUDED.best_partner_id,
        best_partner_wr = EXCLUDED.best_partner_wr,
        worst_partner_id = EXCLUDED.worst_partner_id,
        worst_partner_wr = EXCLUDED.worst_partner_wr,
        updated_at = NOW()
    `;
  }

  console.log(`✅ Updated cache for ${players.length} players`);
}

/**
 * Get cached player statistics
 */
export async function getCachedPlayerStats(): Promise<CachedPlayerStats[]> {
  const { rows } = await sql<CachedPlayerStats>`
    SELECT * FROM player_stats_cache
    ORDER BY rating DESC
  `;
  return rows;
}

/**
 * Get cached player statistics for a specific player
 */
export async function getCachedPlayerStat(
  playerId: number
): Promise<CachedPlayerStats | null> {
  const { rows } = await sql<CachedPlayerStats>`
    SELECT * FROM player_stats_cache
    WHERE player_id = ${playerId}
  `;
  return rows[0] || null;
}

/**
 * Invalidate cache (mark as stale)
 * This can be called when a new match is added
 */
export async function invalidatePlayerStatsCache(): Promise<void> {
  // For now, we'll just update the cache immediately
  // In the future, we could add a "stale" flag
  await updatePlayerStatsCache();
}
