import { NextResponse } from "next/server";
import { getMatches, getPlayers } from "@/lib/db";

interface DaySummaryPlayer {
  id: number;
  name: string;
  matches: number;
  change: number;
  oldRating: number;
  newRating: number;
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

    // Calculate ratings before today by processing all matches before todayStart
    // (without 6-month window - use all historical matches)
    console.log("[day-summary] todayStart:", todayStart);
    console.log("[day-summary] Total matches:", allMatches.length);

    const matchesBeforeToday = allMatches.filter((match) => {
      const matchDate = new Date(match.date);
      const matchWarsawDate = new Date(
        matchDate.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
      );
      return matchWarsawDate < todayStart;
    });

    console.log(
      "[day-summary] Matches before today:",
      matchesBeforeToday.length
    );

    // Calculate ratings before today by processing all matches chronologically
    // This gives us the real rating at the start of today
    const ratingsBeforeToday: { [playerId: number]: number } = {};
    players.forEach((player) => {
      ratingsBeforeToday[player.id] = 1000.0; // START_RATING
    });

    // Sort matches before today chronologically
    const sortedBeforeToday = [...matchesBeforeToday].sort((a, b) => {
      const dateCompare =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateCompare !== 0 ? dateCompare : a.id - b.id;
    });

    // Process all matches before today to get real ratings
    for (const match of sortedBeforeToday) {
      if (match.team_a.length === 2 && match.team_b.length === 2) {
        const [a1, a2] = match.team_a;
        const [b1, b2] = match.team_b;

        const rA = (ratingsBeforeToday[a1] + ratingsBeforeToday[a2]) / 2.0;
        const rB = (ratingsBeforeToday[b1] + ratingsBeforeToday[b2]) / 2.0;

        // Use same rating calculation logic as in rating.ts
        const E = 1.0 / (1.0 + Math.pow(10, (rB - rA) / 400.0));
        const T = match.type === "to6" ? 6 : match.type === "to4" ? 4 : 3;
        const gd = match.score_a - match.score_b;
        const margin = Math.max(-1.0, Math.min(1.0, gd / T));
        const marginFactor = 0.3; // 40% reduced influence
        const S = 0.5 + marginFactor * margin;
        const L = match.type === "to6" ? 1.0 : match.type === "to4" ? 0.8 : 0.7;
        const K_BASE = 28.0;
        const deltaTeam = K_BASE * L * (S - E);

        ratingsBeforeToday[a1] += deltaTeam;
        ratingsBeforeToday[a2] += deltaTeam;
        ratingsBeforeToday[b1] -= deltaTeam;
        ratingsBeforeToday[b2] -= deltaTeam;
      }
    }

    console.log(
      "[day-summary] Sample ratings before today:",
      Object.entries(ratingsBeforeToday)
        .slice(0, 5)
        .map(([id, rating]) => `${id}: ${rating.toFixed(1)}`)
        .join(", ")
    );

    // Calculate rating changes for today's matches starting from ratingsBeforeToday
    const playerChanges: Map<
      number,
      { matches: number; change: number; oldRating: number }
    > = new Map();

    // Create a copy of ratingsBeforeToday to track current ratings as we process today's matches
    const currentRatings: { [playerId: number]: number } = {
      ...ratingsBeforeToday,
    };

    // Sort today's matches chronologically
    const sortedTodayMatches = [...todayMatches].sort((a, b) => {
      const dateCompare =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateCompare !== 0 ? dateCompare : a.id - b.id;
    });

    // Process each match today and calculate rating changes
    for (const match of sortedTodayMatches) {
      if (match.team_a.length === 2 && match.team_b.length === 2) {
        const [a1, a2] = match.team_a;
        const [b1, b2] = match.team_b;

        const rA = (currentRatings[a1] + currentRatings[a2]) / 2.0;
        const rB = (currentRatings[b1] + currentRatings[b2]) / 2.0;

        const E = 1.0 / (1.0 + Math.pow(10, (rB - rA) / 400.0));
        const T = match.type === "to6" ? 6 : match.type === "to4" ? 4 : 3;
        const gd = match.score_a - match.score_b;
        const margin = Math.max(-1.0, Math.min(1.0, gd / T));
        const S = 0.5 + 0.3 * margin;
        const L = match.type === "to6" ? 1.0 : match.type === "to4" ? 0.8 : 0.7;
        const deltaTeam = 28.0 * L * (S - E);

        // Update current ratings and track changes
        currentRatings[a1] += deltaTeam;
        currentRatings[a2] += deltaTeam;
        currentRatings[b1] -= deltaTeam;
        currentRatings[b2] -= deltaTeam;

        // Track changes for each player
        for (const playerId of [a1, a2, b1, b2]) {
          const change =
            playerId === a1 || playerId === a2 ? deltaTeam : -deltaTeam;
          const current = playerChanges.get(playerId);

          if (!current) {
            playerChanges.set(playerId, {
              matches: 1,
              change: change,
              oldRating: ratingsBeforeToday[playerId] || 1000.0,
            });
          } else {
            playerChanges.set(playerId, {
              matches: current.matches + 1,
              change: current.change + change,
              oldRating: current.oldRating,
            });
          }
        }
      }
    }

    // Format results
    const results: DaySummaryPlayer[] = [];
    const playerMap = new Map(players.map((p) => [p.id, p.name]));

    for (const [playerId, data] of playerChanges.entries()) {
      if (data.matches > 0) {
        const oldRating = data.oldRating;
        const newRating = oldRating + data.change;

        results.push({
          id: playerId,
          name: playerMap.get(playerId) || `Player ${playerId}`,
          matches: data.matches,
          change: data.change,
          oldRating: oldRating,
          newRating: newRating,
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
