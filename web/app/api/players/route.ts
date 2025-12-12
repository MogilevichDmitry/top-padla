import { NextRequest, NextResponse } from "next/server";
import { getPlayers, createPlayer, deletePlayersByNames, updatePlayer } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sql } from "@vercel/postgres";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const nameRaw = (body?.name || "").trim();
    const tgId =
      body?.tg_id === null || body?.tg_id === undefined
        ? null
        : Number(body.tg_id);
    if (!nameRaw) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (nameRaw.length > 64) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    // Explicit duplicate check to return a proper error for UI
    const dup = await sql<{ id: number }>`
      SELECT id FROM players WHERE LOWER(name) = LOWER(${nameRaw}) LIMIT 1
    `;
    if (dup.rows.length > 0) {
      return NextResponse.json(
        { error: "Player with this name already exists" },
        { status: 409 }
      );
    }

    const player = await createPlayer(
      nameRaw,
      Number.isNaN(tgId) ? null : tgId
    );

    // Revalidate relevant caches
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating player";
    console.error("Error creating player:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const id = body?.id;
    const nameRaw = (body?.name || "").trim();
    const tgId =
      body?.tg_id === null || body?.tg_id === undefined || body?.tg_id === ""
        ? null
        : Number(body.tg_id);

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }
    if (!nameRaw) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (nameRaw.length > 64) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const player = await updatePlayer(
      id,
      nameRaw,
      Number.isNaN(tgId) ? null : tgId
    );

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Revalidate relevant caches
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");
    revalidatePath("/api/players");

    return NextResponse.json(player, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error updating player";
    console.error("Error updating player:", message);
    
    // Return 409 for duplicate name conflicts
    if (message === "Player with this name already exists") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const names = Array.isArray(body?.names) ? body.names : [];
    if (!names.length) {
      return NextResponse.json(
        { error: "Provide names: { names: string[] }" },
        { status: 400 }
      );
    }

    const deleted = await deletePlayersByNames(names);

    // Revalidate relevant caches/routes
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");
    revalidatePath("/api/pairs");

    return NextResponse.json({ deleted }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error deleting players";
    console.error("Error deleting players:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
