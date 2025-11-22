import { NextResponse } from "next/server";
import { getMatches, getPlayers } from "@/lib/db";
import { getMatchRatingChanges } from "@/lib/rating";

interface DaySummaryPlayer {
  id: number;
  name: string;
  matches: number;
  change: number;
}

export async function GET() {
  try {
    // Get today's date in Europe/Warsaw timezone
    const now = new Date();
    const warsawDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
    );
    const todayStart = new Date(warsawDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Get all matches
    const allMatches = await getMatches();
    const players = await getPlayers();

    // Filter matches from today (in Europe/Warsaw timezone)
    const todayMatches = allMatches.filter((match) => {
      const matchDate = new Date(match.date);
      // Convert match date to Warsaw timezone for comparison
      const matchWarsawDate = new Date(
        matchDate.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
      );
      return matchWarsawDate >= todayStart && matchWarsawDate < todayEnd;
    });

    if (todayMatches.length === 0) {
      const todayStr = warsawDate.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return NextResponse.json({
        today: todayStr,
        players: [],
        message: "Сегодня еще не было матчей.",
      });
    }

    // Calculate rating changes for all matches
    const changesByMatchId = getMatchRatingChanges(players, allMatches);

    // Aggregate changes per player for today's matches
    const playerChanges: Map<number, { matches: number; change: number }> =
      new Map();

    for (const match of todayMatches) {
      const changes = changesByMatchId[match.id];
      if (!changes) continue;

      for (const [playerIdStr, change] of Object.entries(changes)) {
        const playerId = parseInt(playerIdStr);
        const current = playerChanges.get(playerId) || {
          matches: 0,
          change: 0,
        };
        playerChanges.set(playerId, {
          matches: current.matches + 1,
          change: current.change + change,
        });
      }
    }

    // Format results
    const results: DaySummaryPlayer[] = [];
    const playerMap = new Map(players.map((p) => [p.id, p.name]));

    for (const [playerId, data] of playerChanges.entries()) {
      if (data.matches > 0) {
        results.push({
          id: playerId,
          name: playerMap.get(playerId) || `Player ${playerId}`,
          matches: data.matches,
          change: data.change,
        });
      }
    }

    // Sort by change (descending)
    results.sort((a, b) => b.change - a.change);

    const todayStr = warsawDate.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return NextResponse.json({
      today: todayStr,
      players: results,
    });
  } catch (error) {
    console.error("Error getting day summary:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get day summary", message },
      { status: 500 }
    );
  }
}
