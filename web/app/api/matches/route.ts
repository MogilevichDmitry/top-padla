import { NextRequest, NextResponse } from "next/server";
import {
  createMatch,
  Match,
  recomputePairsFromMatches,
  deleteMatchesByIds,
  getPlayers,
} from "@/lib/db";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { invalidatePlayerStatsCache } from "@/lib/cache";
import { isAdminRequest } from "@/lib/auth";
import { getMatchRatingChanges } from "@/lib/rating";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Load all players and matches once to compute rating changes per match
    const players = await getPlayers();
    const { rows: allMatchesAsc } = await sql<Match>`
      SELECT * FROM matches ORDER BY date ASC, id ASC
    `;

    const total = allMatchesAsc.length;

    // Compute rating changes per match (full history)
    const changesByMatchId = getMatchRatingChanges(players, allMatchesAsc);

    // Convert to DESC order for pagination
    const allMatchesDesc = [...allMatchesAsc].reverse();
    const pageMatches = allMatchesDesc.slice(offset, offset + limit);

    const matchesWithChanges = pageMatches.map((m) => ({
      ...m,
      rating_changes: changesByMatchId[m.id] || {},
    }));

    return NextResponse.json({
      matches: matchesWithChanges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Protect creating matches - admin only
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    // Basic server-side validation with detailed messages
    const { type, team_a, team_b, score_a, score_b } = body as {
      type: "to6" | "to4" | "to3";
      team_a: number[];
      team_b: number[];
      score_a: number;
      score_b: number;
    };

    const maxByType: Record<string, number> = { to6: 6, to4: 4, to3: 3 };
    const maxScore = maxByType[type] ?? 6;

    if (
      !Array.isArray(team_a) ||
      !Array.isArray(team_b) ||
      team_a.length !== 2 ||
      team_b.length !== 2
    ) {
      return NextResponse.json(
        { error: "Both teams must have exactly 2 players" },
        { status: 400 }
      );
    }
    const ids = [...team_a, ...team_b];
    const unique = new Set(ids);
    if (unique.size !== 4) {
      return NextResponse.json(
        { error: "Players must be unique across both teams" },
        { status: 400 }
      );
    }
    if (typeof score_a !== "number" || typeof score_b !== "number") {
      return NextResponse.json(
        { error: "Scores must be numbers" },
        { status: 400 }
      );
    }
    if (score_a < 0 || score_b < 0) {
      return NextResponse.json(
        { error: "Scores must be non-negative" },
        { status: 400 }
      );
    }
    if (score_a === score_b) {
      return NextResponse.json(
        { error: "Scores cannot be equal" },
        { status: 400 }
      );
    }
    if (score_a > maxScore || score_b > maxScore) {
      return NextResponse.json(
        { error: `For ${type}, max score is ${maxScore}` },
        { status: 400 }
      );
    }

    // Validate final score patterns per type
    const win = Math.max(score_a, score_b);
    const lose = Math.min(score_a, score_b);
    let isValid = false;
    if (type === "to6") {
      // 6-0..6-4 or 7-5 / 7-6
      isValid =
        (win === 6 && lose <= 4) || (win === 7 && (lose === 5 || lose === 6));
    } else if (type === "to4") {
      // 4-0..4-3 (accept 4-3 without tiebreak) or 5-4
      isValid = (win === 4 && lose <= 3) || (win === 5 && lose === 4);
    } else if (type === "to3") {
      // 3-0..3-2 (accept 3-2 without tiebreak) or 4-3
      isValid = (win === 3 && lose <= 2) || (win === 4 && lose === 3);
    }
    if (!isValid) {
      const examples =
        type === "to6"
          ? "6-0..6-4 or 7-5 / 7-6"
          : type === "to4"
          ? "4-0..4-3 or 5-4"
          : "3-0..3-2 or 4-3";
      return NextResponse.json(
        { error: `Invalid final score for ${type}. Use ${examples}` },
        { status: 400 }
      );
    }

    const match = await createMatch(body);

    // Recompute pairs after inserting the match so new pairs appear and ratings update
    await recomputePairsFromMatches();

    // Invalidate cache for all related routes
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");
    revalidatePath("/api/pairs");
    revalidatePath("/api/players/[slug]", "layout");

    // Update pre-computed statistics cache in background
    // Don't await to avoid blocking the response
    invalidatePlayerStatsCache().catch((err) => {
      console.error("Failed to update cache:", err);
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating match";
    console.error("Error creating match:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Admin only
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((n: unknown) => Number(n))
      : [];
    if (!ids.length || ids.some((n: number) => !Number.isFinite(n))) {
      return NextResponse.json(
        { error: "Provide array of numeric ids in body: { ids: number[] }" },
        { status: 400 }
      );
    }

    const deleted = await deleteMatchesByIds(ids);

    // Recompute pairs and invalidate caches
    await recomputePairsFromMatches();
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");
    revalidatePath("/api/pairs");
    revalidatePath("/api/players/[slug]", "layout");

    // Refresh pre-computed player stats cache so standings/players use updated data
    invalidatePlayerStatsCache().catch((err) => {
      console.error("Failed to update cache after delete:", err);
    });

    return NextResponse.json({ deleted }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error deleting matches";
    console.error("Error deleting matches:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
