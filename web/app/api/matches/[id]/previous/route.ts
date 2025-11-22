import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Match } from "@/lib/db";

// Cache for 60 seconds
export const revalidate = 60;

// Helper function to check if two teams have the same players (order doesn't matter)
function teamsMatch(team1: number[], team2: number[]): boolean {
  if (team1.length !== team2.length) return false;
  const sorted1 = [...team1].sort((a, b) => a - b);
  const sorted2 = [...team2].sort((a, b) => a - b);
  return sorted1.every((id, idx) => id === sorted2[idx]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);

    if (isNaN(matchId)) {
      return NextResponse.json(
        { error: "Invalid match ID" },
        { status: 400 }
      );
    }

    // Get the current match
    const { rows: currentMatchRows } = await sql<Match>`
      SELECT * FROM matches WHERE id = ${matchId}
    `;

    if (currentMatchRows.length === 0) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    const currentMatch = currentMatchRows[0];
    const currentDate = new Date(currentMatch.date).getTime();

    // Get all matches before this one
    const { rows: allPreviousMatches } = await sql<Match>`
      SELECT * FROM matches 
      WHERE date < ${currentMatch.date}
         OR (date = ${currentMatch.date} AND id < ${matchId})
      ORDER BY date DESC, id DESC
    `;

    // Filter matches with the same team composition
    const sameCompositionMatches: Match[] = [];

    for (const match of allPreviousMatches) {
      // Check if teams match (either same order or swapped)
      const teamsMatchSameOrder =
        teamsMatch(match.team_a, currentMatch.team_a) &&
        teamsMatch(match.team_b, currentMatch.team_b);

      const teamsMatchSwapped =
        teamsMatch(match.team_a, currentMatch.team_b) &&
        teamsMatch(match.team_b, currentMatch.team_a);

      if (teamsMatchSameOrder || teamsMatchSwapped) {
        sameCompositionMatches.push(match);
      }
    }

    return NextResponse.json({
      previousMatches: sameCompositionMatches,
      count: sameCompositionMatches.length,
    });
  } catch (error) {
    console.error("Error fetching previous matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch previous matches" },
      { status: 500 }
    );
  }
}

