import { NextResponse } from 'next/server';
import { getPlayers, getMatches } from '@/lib/db';
import { calculateRatings, getPlayerStats } from '@/lib/rating';

export async function GET() {
  try {
    const [players, matches] = await Promise.all([
      getPlayers(),
      getMatches(),
    ]);

    const ratings = calculateRatings(players, matches);

    // Create player list with stats (including players without matches)
    const playersWithStats = players.map(player => {
      const stats = getPlayerStats(player.id, matches);
      return {
        ...player,
        rating: ratings[player.id] || 1000,
        ...stats,
      };
    });

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}

