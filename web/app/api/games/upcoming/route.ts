import { NextRequest, NextResponse } from "next/server";
import { getGameSessions } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 5;

    if (isNaN(days) || days < 1 || days > 30) {
      return NextResponse.json(
        { error: "Invalid days parameter. Must be between 1 and 30." },
        { status: 400 }
      );
    }

    // Get all game sessions
    const allSessions = await getGameSessions();

    // Get current time in Warsaw timezone
    const now = new Date();
    const warsawTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
    );
    const todayDate = warsawTime.toISOString().split("T")[0];

    const currentHours = warsawTime.getHours();
    const currentMinutes = warsawTime.getMinutes();
    const currentTime = `${currentHours
      .toString()
      .padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;

    // Calculate end date (today + N days)
    const endDate = new Date(warsawTime);
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Filter upcoming games
    const upcomingGames = allSessions.filter((game) => {
      // Check if game is within date range
      if (game.date < todayDate || game.date > endDateStr) {
        return false;
      }

      // If game is today, check if it hasn't finished yet
      if (game.date === todayDate) {
        // Use end_time if available, otherwise use start_time
        const compareTime = game.end_time || game.start_time;

        // Remove seconds if present (HH:MM:SS -> HH:MM)
        const cleanTime =
          compareTime.length > 5 ? compareTime.substring(0, 5) : compareTime;

        return cleanTime >= currentTime;
      }

      // Game is in the future
      return true;
    });

    return NextResponse.json(upcomingGames);
  } catch (error: any) {
    console.error("Error fetching upcoming games:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch upcoming games",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
