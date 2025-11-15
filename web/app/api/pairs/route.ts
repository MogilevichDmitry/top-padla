import { NextResponse } from 'next/server';
import { getPairs, getPlayers } from '@/lib/db';

export async function GET() {
  try {
    const [pairs, players] = await Promise.all([
      getPairs(),
      getPlayers(),
    ]);

    // Create a map of player IDs to names
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    // Add player names to pairs
    const pairsWithNames = pairs.map(pair => ({
      ...pair,
      player1_name: playerMap.get(pair.player1_id) || `Player ${pair.player1_id}`,
      player2_name: playerMap.get(pair.player2_id) || `Player ${pair.player2_id}`,
    }));

    // Sort by rating descending
    pairsWithNames.sort((a, b) => b.rating - a.rating);

    return NextResponse.json(pairsWithNames);
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pairs' },
      { status: 500 }
    );
  }
}

