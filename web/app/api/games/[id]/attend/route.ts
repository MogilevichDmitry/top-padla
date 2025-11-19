import { NextRequest, NextResponse } from "next/server";
import { addGameAttendee, removeGameAttendee } from "@/lib/db";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: "Invalid game session ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, action, status } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    if (action === "remove") {
      const removed = await removeGameAttendee(gameId, trimmedName);
      if (!removed) {
        return NextResponse.json(
          { error: "Attendee not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, action: "removed" });
    } else {
      const attendeeStatus = status === "declined" ? "declined" : "attending";
      const attendee = await addGameAttendee(
        gameId,
        trimmedName,
        attendeeStatus
      );
      return NextResponse.json(attendee, { status: 201 });
    }
  } catch (error: any) {
    console.error("Error managing game attendee:", error);

    // Handle unique constraint violation
    if (error.code === "23505" || error.message?.includes("unique")) {
      return NextResponse.json(
        { error: "You are already registered for this game" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to manage game attendee" },
      { status: 500 }
    );
  }
}
