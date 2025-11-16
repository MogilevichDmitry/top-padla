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
      console.log("Cache is empty, calculating ratings...");
      const matches = await getMatches();
      const ratings = calculateRatings(players, matches);

      const standings = players
        .map((player) => {
          const stats = getPlayerStats(player.id, matches);
          return {
            ...player,
            rating: ratings[player.id] || 1000,
            ...stats,
          };
        })
        .filter((player) => player.matches > 0) // Only players with matches
        .sort((a, b) => b.rating - a.rating);

      return NextResponse.json(standings);
    }

    // Create a map of cached stats by player_id
    const statsMap = new Map(cachedStats.map((stat) => [stat.player_id, stat]));

    // Create standings from cached data
    const standings = players
      .map((player) => {
        const cached = statsMap.get(player.id);
        if (!cached || cached.matches === 0) {
          return null; // Skip players without matches
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
      })
      .filter((player): player is NonNullable<typeof player> => player !== null)
      .sort((a, b) => b.rating - a.rating);

    return NextResponse.json(standings);
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
