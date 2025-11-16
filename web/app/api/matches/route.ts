import { NextRequest, NextResponse } from "next/server";
import { getMatches, createMatch, Match } from "@/lib/db";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { invalidatePlayerStatsCache } from "@/lib/cache";
import { isAdminRequest } from "@/lib/auth";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get total count
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as total FROM matches
    `;
    const total = parseInt(countRows[0].total);

    // Get paginated matches
    const { rows } = await sql<Match>`
      SELECT * FROM matches
      ORDER BY date DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      matches: rows,
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
    const match = await createMatch(body);

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
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}
