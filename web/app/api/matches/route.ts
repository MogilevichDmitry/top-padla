import { NextResponse } from 'next/server';
import { getMatches, createMatch, Match } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as total FROM matches
    `;
    const total = parseInt(countRows[0].total);

    // Get paginated matches
    const { rows } = await sql<Match>`
      SELECT * FROM matches
      ORDER BY date DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      matches: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const match = await createMatch(body);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}

