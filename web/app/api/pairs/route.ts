import { NextRequest, NextResponse } from 'next/server';
import { getPairs, getPlayers, recomputePairsFromMatches } from '@/lib/db';
import { isAdminRequest } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Cache for 60 seconds
export const revalidate = 60;

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

export async function POST(request: NextRequest) {
  try {
    // Admin only
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Recomputing pairs from matches...');
    await recomputePairsFromMatches();
    
    // Invalidate cache
    revalidatePath('/api/pairs');
    revalidatePath('/app/pairs');
    
    console.log('✅ Pairs recomputed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pairs recomputed successfully' 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error recomputing pairs:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

