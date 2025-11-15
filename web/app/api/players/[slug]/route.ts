import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getMatches, getPlayerName } from "@/lib/db";
import {
  calculateRatings,
  getPlayerStats,
  getRatingHistory,
  getPerformanceByOpponentStrength,
} from "@/lib/rating";
import { getPlayerStreaks } from "@/lib/records";
import { nameToSlug } from "@/lib/utils";

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

    // Calculate current ratings
    const ratings = calculateRatings(players, matches);

    // Calculate player rank
    const sortedPlayers = players
      .map((p) => ({
        id: p.id,
        rating: ratings[p.id] || 1000,
      }))
      .sort((a, b) => b.rating - a.rating);
    const playerRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

    // Get player stats
    const stats = getPlayerStats(playerId, matches);

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

    // Get all partners with stats
    const partners = await Promise.all(
      Object.entries(stats.partnerStats).map(
        async ([partnerId, partnerStats]) => {
          const partnerIdNum = parseInt(partnerId);
          const name = await getPlayerName(partnerIdNum);
          return {
            id: partnerIdNum,
            name,
            rating: ratings[partnerIdNum] || 1000,
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
        rank: playerRank,
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
