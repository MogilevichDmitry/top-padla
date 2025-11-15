import { NextResponse } from "next/server";
import { getPlayers, getMatches } from "@/lib/db";
import { getLeagueRecords } from "@/lib/records";

export async function GET() {
  try {
    const [players, matches] = await Promise.all([getPlayers(), getMatches()]);

    const records = getLeagueRecords(players, matches);

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}
