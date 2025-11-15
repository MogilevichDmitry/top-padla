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

    // Create standings with stats
    const standings = players
      .map(player => {
        const stats = getPlayerStats(player.id, matches);
        return {
          ...player,
          rating: ratings[player.id] || 1000,
          ...stats,
        };
      })
      .filter(player => player.matches > 0) // Only players with matches
      .sort((a, b) => b.rating - a.rating);

    return NextResponse.json(standings);
  } catch (error) {
    console.error('Error calculating ratings:', error);
    return NextResponse.json(
      { error: 'Failed to calculate ratings' },
      { status: 500 }
    );
  }
}

