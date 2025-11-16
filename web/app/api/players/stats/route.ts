import { NextResponse } from "next/server";
import { getPlayers, getMatches } from "@/lib/db";
import { getCachedPlayerStats } from "@/lib/cache";
import { calculateRatings, getPlayerStats } from "@/lib/rating";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const players = await getPlayers();

    // Try to get cached stats, fallback to calculation if fails
    let cachedStats: Awaited<ReturnType<typeof getCachedPlayerStats>>;
    try {
      cachedStats = await getCachedPlayerStats();
    } catch (cacheError) {
      console.warn(
        "Cache not available, falling back to calculation:",
        cacheError
      );
      cachedStats = [];
    }

    // If cache is empty or unavailable, fallback to calculation
    if (cachedStats.length === 0) {
      console.log("Cache is empty, calculating stats...");
      const matches = await getMatches();
      const ratings = calculateRatings(players, matches);

      const playersWithStats = players.map((player) => {
        const stats = getPlayerStats(player.id, matches);
        return {
          ...player,
          rating: ratings[player.id] || 1000,
          ...stats,
        };
      });

      return NextResponse.json(playersWithStats);
    }

    // Create a map of cached stats by player_id
    const statsMap = new Map(cachedStats.map((stat) => [stat.player_id, stat]));

    // Create player list with stats (including players without matches)
    const playersWithStats = players.map((player) => {
      const cached = statsMap.get(player.id);

      if (!cached) {
        // Player has no matches, return default values
        return {
          ...player,
          rating: 1000,
          matches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          to6Wins: 0,
          to6Losses: 0,
          to4Wins: 0,
          to4Losses: 0,
          to3Wins: 0,
          to3Losses: 0,
        };
      }

      return {
        ...player,
        rating: Number(cached.rating),
        matches: Number(cached.matches),
        wins: Number(cached.wins),
        losses: Number(cached.losses),
        winRate: Number(cached.win_rate),
        to6Wins: Number(cached.to6_wins),
        to6Losses: Number(cached.to6_losses),
        to4Wins: Number(cached.to4_wins),
        to4Losses: Number(cached.to4_losses),
        to3Wins: Number(cached.to3_wins),
        to3Losses: Number(cached.to3_losses),
      };
    });

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
