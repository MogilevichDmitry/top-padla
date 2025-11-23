import { NextRequest, NextResponse } from "next/server";
import { getGameSessions, createGameSession, GameSession } from "@/lib/db";
import { sendNewGameNotification } from "@/lib/telegram";

export async function GET() {
  try {
    const sessions = await getGameSessions();
    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("Error fetching game sessions:", error);

    // Check if table doesn't exist
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Game tables not found. Please run: npx tsx scripts/create-game-tables.ts",
          details: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch game sessions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("🎮 POST /api/games - Game creation request received");
  try {
    const body = await request.json();
    console.log("📋 Game data:", { date, startTime, endTime, location, createdBy: body.createdBy });
    const { date, startTime, endTime, location, createdBy } = body;

    // Validation
    if (!date || !startTime || !location || !createdBy) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: date, startTime, location, createdBy",
        },
        { status: 400 }
      );
    }

    if (location !== "Padel Point" && location !== "Zawady") {
      return NextResponse.json(
        { error: "Location must be 'Padel Point' or 'Zawady'" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json(
        { error: "Invalid start time format. Use HH:MM" },
        { status: 400 }
      );
    }

    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid end time format. Use HH:MM" },
        { status: 400 }
      );
    }

    const session = await createGameSession(
      date,
      startTime,
      endTime || null,
      location as "Padel Point" | "Zawady",
      createdBy
    );

    console.log("✅ Game session created:", session.id);

    // Send Telegram notification (async, don't wait for it)
    console.log("📤 Sending Telegram notification...");
    sendNewGameNotification({
      date,
      startTime,
      location,
      createdBy,
    })
      .then(() => console.log("✅ Telegram notification sent successfully"))
      .catch((err) => console.error("❌ Failed to send notification:", err));

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error creating game session:", error);
    return NextResponse.json(
      { error: "Failed to create game session" },
      { status: 500 }
    );
  }
}
