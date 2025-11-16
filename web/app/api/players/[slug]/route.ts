import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getMatches, getPlayerName, Pair } from "@/lib/db";
import { sql } from "@vercel/postgres";
import {
  calculateRatings,
  getPlayerStats,
  getRatingHistory,
  getPerformanceByOpponentStrength,
} from "@/lib/rating";
import { getPlayerStreaks } from "@/lib/records";
import { nameToSlug } from "@/lib/utils";
import { getCachedPlayerStat, getCachedPlayerStats } from "@/lib/cache";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [players, matches] = await Promise.all([getPlayers(), getMatches()]);

    // Find player by matching slug to name
    const player = players.find(
      (p) => nameToSlug(p.name) === slug.toLowerCase()
    );
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const playerId = player.id;

    // Calculate ratings (needed for rank and other calculations)
    const ratings = calculateRatings(players, matches);

    // Try to get cached stats first, fallback to calculation
    let cachedStat: Awaited<ReturnType<typeof getCachedPlayerStat>> | null =
      null;
    try {
      cachedStat = await getCachedPlayerStat(playerId);
    } catch (cacheError) {
      console.warn("Cache not available, using calculation:", cacheError);
    }

    let stats: ReturnType<typeof getPlayerStats>;

    if (cachedStat) {
      // Use cached stats, but still need partnerStats for detailed view
      const fullStats = getPlayerStats(playerId, matches);
      stats = {
        matches: Number(cachedStat.matches),
        wins: Number(cachedStat.wins),
        losses: Number(cachedStat.losses),
        winRate: Number(cachedStat.win_rate),
        to6Wins: Number(cachedStat.to6_wins),
        to6Losses: Number(cachedStat.to6_losses),
        to4Wins: Number(cachedStat.to4_wins),
        to4Losses: Number(cachedStat.to4_losses),
        to3Wins: Number(cachedStat.to3_wins),
        to3Losses: Number(cachedStat.to3_losses),
        bestPartner: fullStats.bestPartner, // Use fresh calculation instead of cache
        bestPartnerWR: fullStats.bestPartnerWR, // Use fresh calculation instead of cache
        worstPartner: fullStats.worstPartner, // Use fresh calculation instead of cache
        worstPartnerWR: fullStats.worstPartnerWR, // Use fresh calculation instead of cache
        partnerStats: fullStats.partnerStats, // Need full partner stats for "All Partners" table
      };
    } else {
      // Fallback to calculation if cache is missing
      stats = getPlayerStats(playerId, matches);
    }

    // Calculate player rank - try cached stats first, fallback to calculation
    let playerRank: number;
    try {
      const allCachedStats = await getCachedPlayerStats();
      if (allCachedStats.length > 0) {
        const sortedActivePlayers = allCachedStats
          .filter((cached) => Number(cached.matches) > 0)
          .sort((a, b) => Number(b.rating) - Number(a.rating));
        playerRank =
          sortedActivePlayers.findIndex((p) => p.player_id === playerId) + 1;
      } else {
        // Fallback to calculation
        const sortedActivePlayers = players
          .map((p) => {
            const playerStats = getPlayerStats(p.id, matches);
            return {
              id: p.id,
              rating: ratings[p.id] || 1000,
              matches: playerStats.matches,
            };
          })
          .filter((p) => p.matches > 0)
          .sort((a, b) => b.rating - a.rating);
        playerRank =
          sortedActivePlayers.findIndex((p) => p.id === playerId) + 1;
      }
    } catch (rankError) {
      // Fallback to calculation if cache fails
      const sortedActivePlayers = players
        .map((p) => {
          const playerStats = getPlayerStats(p.id, matches);
          return {
            id: p.id,
            rating: ratings[p.id] || 1000,
            matches: playerStats.matches,
          };
        })
        .filter((p) => p.matches > 0)
        .sort((a, b) => b.rating - a.rating);
      playerRank = sortedActivePlayers.findIndex((p) => p.id === playerId) + 1;
    }

    // Get rating history for progress
    const ratingHistory = getRatingHistory(playerId, players, matches);

    // Get performance stats
    const performance = getPerformanceByOpponentStrength(
      playerId,
      players,
      matches,
      ratings
    );

    // Get streaks
    const streaks = getPlayerStreaks(playerId, matches);

    // Get player matches (history) with player names
    const playerMatches = await Promise.all(
      matches
        .filter(
          (m) => m.team_a.includes(playerId) || m.team_b.includes(playerId)
        )
        .sort((a, b) => {
          const dateCompare =
            new Date(b.date).getTime() - new Date(a.date).getTime();
          return dateCompare !== 0 ? dateCompare : b.id - a.id;
        })
        .map(async (match) => {
          const teamANames = await Promise.all(
            match.team_a.map((id) => getPlayerName(id))
          );
          const teamBNames = await Promise.all(
            match.team_b.map((id) => getPlayerName(id))
          );
          return {
            ...match,
            team_a_names: teamANames,
            team_b_names: teamBNames,
            team_a_ids: match.team_a,
            team_b_ids: match.team_b,
          };
        })
    );

    // Get best and worst partners with names
    const bestPartnerName = stats.bestPartner
      ? await getPlayerName(stats.bestPartner)
      : undefined;
    const worstPartnerName = stats.worstPartner
      ? await getPlayerName(stats.worstPartner)
      : undefined;

    // Get all pairs to find pair ratings
    const { rows: allPairs } = await sql<Pair>`
      SELECT * FROM pairs
    `;

    // Create a map of pair ratings: key is sorted player IDs (e.g., "1-2" or "2-1")
    const pairRatingMap = new Map<string, number>();
    for (const pair of allPairs) {
      const key1 = `${pair.player1_id}-${pair.player2_id}`;
      const key2 = `${pair.player2_id}-${pair.player1_id}`;
      pairRatingMap.set(key1, pair.rating);
      pairRatingMap.set(key2, pair.rating);
    }

    // Get all partners with stats
    const partners = await Promise.all(
      Object.entries(stats.partnerStats).map(
        async ([partnerId, partnerStats]) => {
          const partnerIdNum = parseInt(partnerId);
          const name = await getPlayerName(partnerIdNum);

          // Find pair rating (check both orders)
          const pairKey = `${playerId}-${partnerIdNum}`;
          const pairRating = pairRatingMap.get(pairKey) || 1000;

          return {
            id: partnerIdNum,
            name,
            rating: pairRating, // Use pair rating instead of player rating
            games: partnerStats.games,
            wins: partnerStats.wins,
            losses: partnerStats.losses,
            winRate:
              partnerStats.games > 0
                ? (partnerStats.wins / partnerStats.games) * 100
                : 0,
          };
        }
      )
    );

    // Calculate progress stats
    const ratingsOnly = ratingHistory.map((h) => h.rating);
    const peakRating = ratingsOnly.length > 0 ? Math.max(...ratingsOnly) : 0;
    const minRating = ratingsOnly.length > 0 ? Math.min(...ratingsOnly) : 0;
    const startRating = ratingsOnly.length > 0 ? ratingsOnly[0] : 1000;
    const currentRating = ratings[playerId] || 1000;
    const ratingChange = currentRating - startRating;

    // Find peak date
    const peakPoint = ratingHistory.find((h) => h.rating === peakRating);
    const peakDate = peakPoint?.date || null;

    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        rating: currentRating,
        rank: stats.matches > 0 ? playerRank : null, // Only set rank if player has matches
      },
      stats,
      streaks,
      progress: {
        currentRating,
        startRating,
        peakRating,
        minRating,
        ratingChange,
        peakDate,
        history: ratingHistory,
      },
      performance,
      matches: playerMatches,
      partners: {
        best: stats.bestPartner
          ? {
              id: stats.bestPartner,
              name: bestPartnerName,
              winRate: stats.bestPartnerWR || 0,
            }
          : null,
        worst: stats.worstPartner
          ? {
              id: stats.worstPartner,
              name: worstPartnerName,
              winRate: stats.worstPartnerWR || 0,
            }
          : null,
        all: partners,
      },
    });
  } catch (error) {
    console.error("Error fetching player details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
