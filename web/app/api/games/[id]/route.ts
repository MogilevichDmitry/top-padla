import { NextRequest, NextResponse } from "next/server";
import { deleteGameSession } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Admin only
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: "Invalid game session ID" },
        { status: 400 }
      );
    }

    const deleted = await deleteGameSession(gameId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Game session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: gameId }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting game session:", error);
    return NextResponse.json(
      { error: "Failed to delete game session" },
      { status: 500 }
    );
  }
}

