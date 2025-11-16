import { NextRequest, NextResponse } from "next/server";
import { getPlayers, createPlayer } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (nameRaw.length > 64) {
      return NextResponse.json(
        { error: "Name is too long" },
        { status: 400 }
      );
    }

    const player = await createPlayer(nameRaw, Number.isNaN(tgId) ? null : tgId);

    // Revalidate relevant caches
    revalidatePath("/api/ratings");
    revalidatePath("/api/players/stats");
    revalidatePath("/api/records");

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}

