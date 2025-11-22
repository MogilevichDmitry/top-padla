import { sql } from "@vercel/postgres";

export interface Player {
  id: number;
  name: string;
  tg_id: number | null;
}

export interface Match {
  id: number;
  date: string;
  type: "to6" | "to4" | "to3";
  team_a: number[];
  team_b: number[];
  score_a: number;
  score_b: number;
  created_by: number | null;
}

export interface Pair {
  id: number;
  player1_id: number;
  player2_id: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
}

export interface GameSession {
  id: number;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:MM format
  end_time: string | null; // HH:MM format or null
  location: "Padel Point" | "Zawady";
  created_by: string;
  created_at: string;
  attendees?: GameAttendee[];
}

export interface GameAttendee {
  id: number;
  game_session_id: number;
  name: string;
  status: "attending" | "declined";
  created_at: string;
}

export async function getPlayers(): Promise<Player[]> {
  const { rows } = await sql<Player>`SELECT * FROM players ORDER BY name`;
  return rows;
}

export async function getMatches(): Promise<Match[]> {
  const { rows } = await sql<Match>`
    SELECT * FROM matches ORDER BY date DESC, id DESC
  `;
  return rows;
}

export async function getPlayerName(playerId: number): Promise<string> {
  const { rows } = await sql<Player>`
    SELECT name FROM players WHERE id = ${playerId}
  `;
  return rows[0]?.name || `Player ${playerId}`;
}

export async function getPairs(): Promise<Pair[]> {
  const { rows } = await sql<Pair>`SELECT * FROM pairs`;
  return rows;
}

/**
 * Delete players by names (case-insensitive). Returns number of deleted rows.
 */
export async function deletePlayersByNames(names: string[]): Promise<number> {
  if (!names || names.length === 0) return 0;
  const cleaned = Array.from(
    new Set(
      names
        .map((n) => (typeof n === "string" ? n.trim() : ""))
        .filter((n) => n.length > 0)
    )
  );
  if (cleaned.length === 0) return 0;
  const arrLiteral = `{${cleaned
    .map((n) => n.replace(/"/g, '\\"'))
    .join(",")}}`;
  const { rowCount } = await sql`
    DELETE FROM players
    WHERE LOWER(name) = ANY(SELECT LOWER(unnest(${arrLiteral}::text[])))
  `;
  return rowCount ?? 0;
}

export async function createPlayer(
  name: string,
  tgId: number | null = null
): Promise<Player> {
  // Enforce unique name (case-insensitive) by checking first
  const existing = await sql<Player>`
    SELECT * FROM players WHERE LOWER(name) = LOWER(${name}) LIMIT 1
  `;
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }
  // Some environments may have a broken/default-less sequence for players.id.
  // Compute next id safely based on current max(id) to avoid PK conflicts.
  const { rows: nextRows } = await sql<{ next_id: number }>`
    SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM players
  `;
  const nextId = nextRows[0]?.next_id ?? 1;
  const { rows } = await sql<Player>`
    INSERT INTO players (id, name, tg_id)
    VALUES (${nextId}, ${name}, ${tgId})
    RETURNING *
  `;
  return rows[0];
}

export async function createMatch(match: Omit<Match, "id">): Promise<Match> {
  // Convert arrays to PostgreSQL array format
  const teamAStr = `{${match.team_a.join(",")}}`;
  const teamBStr = `{${match.team_b.join(",")}}`;

  // Some environments may have out-of-sync sequences; generate deterministic next id
  const { rows: nextRows } = await sql<{ next_id: number }>`
    SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM matches
  `;
  const nextId = nextRows[0]?.next_id ?? 1;

  const { rows } = await sql<Match>`
    INSERT INTO matches (id, date, type, team_a, team_b, score_a, score_b, created_by)
    VALUES (
      ${nextId},
      ${match.date},
      ${match.type},
      ${teamAStr}::integer[],
      ${teamBStr}::integer[],
      ${match.score_a},
      ${match.score_b},
      ${match.created_by}
    )
    RETURNING *
  `;
  return rows[0];
}

/**
 * Delete matches by IDs
 */
export async function deleteMatchesByIds(ids: number[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const uniqueIds = Array.from(new Set(ids)).filter((n) => Number.isFinite(n));
  if (uniqueIds.length === 0) return 0;
  const arrLiteral = `{${uniqueIds.join(",")}}`;
  const { rowCount } = await sql`
    DELETE FROM matches WHERE id = ANY(${arrLiteral}::int[])
  `;
  return rowCount ?? 0;
}

/**
 * Recompute pair ratings and stats from all matches and upsert into pairs table.
 * We treat each pair as a single entity with Elo-like updates (same params as players).
 */
export async function recomputePairsFromMatches(): Promise<void> {
  // Fetch all matches
  const { rows: matches } = await sql<Match>`
    SELECT * FROM matches ORDER BY date ASC, id ASC
  `;

  console.log(`[recomputePairsFromMatches] Processing ${matches.length} matches`);

  type PairKey = string; // "minId-maxId"
  interface Accum {
    player1_id: number;
    player2_id: number;
    rating: number;
    matches: number;
    wins: number;
    losses: number;
  }

  const START_RATING = 1000;
  const K_BASE = 28;
  const L_BY_TYPE: Record<string, number> = { to6: 1.0, to4: 0.8, to3: 0.7 };
  const T_BY_TYPE: Record<string, number> = { to6: 6, to4: 4, to3: 3 };

  const expected = (a: number, b: number) =>
    1.0 / (1.0 + Math.pow(10, (b - a) / 400.0));
  const actualS = (sa: number, sb: number, T: number) => {
    const gd = sa - sb;
    const margin = Math.max(-1.0, Math.min(1.0, gd / T));
    // 40% reduced influence (0.5 + 0.3 * margin)
    return 0.5 + 0.3 * margin;
  };

  const pairs: Record<PairKey, Accum> = {};
  const getKey = (id1: number, id2: number): PairKey =>
    id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

  const ensurePair = (id1: number, id2: number) => {
    const key = getKey(id1, id2);
    if (!pairs[key]) {
      const [p1, p2] = id1 < id2 ? [id1, id2] : [id2, id1];
      pairs[key] = {
        player1_id: p1,
        player2_id: p2,
        rating: START_RATING,
        matches: 0,
        wins: 0,
        losses: 0,
      };
    }
    return pairs[key];
  };

  let processedMatches = 0;
  for (const m of matches) {
    if (
      Array.isArray(m.team_a) &&
      Array.isArray(m.team_b) &&
      m.team_a.length === 2 &&
      m.team_b.length === 2
    ) {
      const [a1, a2] = m.team_a;
      const [b1, b2] = m.team_b;
      const A = ensurePair(a1, a2);
      const B = ensurePair(b1, b2);

      const rA = A.rating;
      const rB = B.rating;
      const E = expected(rA, rB);
      const T = T_BY_TYPE[m.type] ?? 6;
      const S = actualS(m.score_a, m.score_b, T);
      const L = L_BY_TYPE[m.type] ?? 1.0;
      const delta = K_BASE * L * (S - E);

      A.rating = A.rating + delta;
      B.rating = B.rating - delta;
      A.matches += 1;
      B.matches += 1;
      if (m.score_a > m.score_b) {
        A.wins += 1;
        B.losses += 1;
      } else {
        B.wins += 1;
        A.losses += 1;
      }
      processedMatches++;
    }
  }

  console.log(
    `[recomputePairsFromMatches] Processed ${processedMatches} valid matches, created ${Object.keys(pairs).length} pairs`
  );

  // Replace pairs table content with new aggregated data
  await sql`DELETE FROM pairs`;

  let nextId = 1;
  for (const acc of Object.values(pairs)) {
    await sql`
      INSERT INTO pairs (id, player1_id, player2_id, rating, matches, wins, losses)
      VALUES (${nextId++}, ${acc.player1_id}, ${acc.player2_id}, ${
      acc.rating
    }, ${acc.matches}, ${acc.wins}, ${acc.losses})
    `;
  }

  console.log(`[recomputePairsFromMatches] Inserted ${Object.keys(pairs).length} pairs into database`);
}

// Game Sessions functions
export async function getGameSessions(): Promise<GameSession[]> {
  const { rows: sessions } = await sql<GameSession>`
    SELECT 
      id,
      date::text as date,
      start_time::text as start_time,
      end_time::text as end_time,
      location,
      created_by,
      created_at::text as created_at
    FROM game_sessions 
    ORDER BY date ASC, start_time ASC
  `;

  // Get attendees for each session
  const sessionsWithAttendees = await Promise.all(
    sessions.map(async (session) => {
      const { rows: attendees } = await sql<GameAttendee>`
        SELECT 
          id,
          game_session_id,
          name,
          status,
          created_at::text as created_at
        FROM game_attendees 
        WHERE game_session_id = ${session.id}
        ORDER BY status DESC, created_at ASC
      `;
      return { ...session, attendees };
    })
  );

  return sessionsWithAttendees;
}

export async function createGameSession(
  date: string,
  startTime: string,
  endTime: string | null,
  location: "Padel Point" | "Zawady",
  createdBy: string
): Promise<GameSession> {
  let session: GameSession;

  if (endTime) {
    const { rows } = await sql<GameSession>`
      INSERT INTO game_sessions (date, start_time, end_time, location, created_by)
      VALUES (${date}::date, ${startTime}::time, ${endTime}::time, ${location}, ${createdBy})
      RETURNING 
        id,
        date::text as date,
        start_time::text as start_time,
        end_time::text as end_time,
        location,
        created_by,
        created_at::text as created_at
    `;
    session = rows[0];
  } else {
    const { rows } = await sql<GameSession>`
      INSERT INTO game_sessions (date, start_time, end_time, location, created_by)
      VALUES (${date}::date, ${startTime}::time, NULL, ${location}, ${createdBy})
      RETURNING 
        id,
        date::text as date,
        start_time::text as start_time,
        end_time::text as end_time,
        location,
        created_by,
        created_at::text as created_at
    `;
    session = rows[0];
  }

  // Automatically add creator as attendee
  const creatorAttendee = await addGameAttendee(
    session.id,
    createdBy,
    "attending"
  );

  return {
    ...session,
    attendees: [creatorAttendee],
  };
}

export async function addGameAttendee(
  gameSessionId: number,
  name: string,
  status: "attending" | "declined" = "attending"
): Promise<GameAttendee> {
  // Check if already exists
  const existing = await sql<GameAttendee>`
    SELECT * FROM game_attendees 
    WHERE game_session_id = ${gameSessionId} AND LOWER(name) = LOWER(${name})
    LIMIT 1
  `;

  if (existing.rows.length > 0) {
    // Update status if changed
    if (existing.rows[0].status !== status) {
      const { rows } = await sql<GameAttendee>`
        UPDATE game_attendees 
        SET status = ${status}
        WHERE game_session_id = ${gameSessionId} AND LOWER(name) = LOWER(${name})
        RETURNING *
      `;
      return rows[0];
    }
    return existing.rows[0];
  }

  const { rows } = await sql<GameAttendee>`
    INSERT INTO game_attendees (game_session_id, name, status)
    VALUES (${gameSessionId}, ${name}, ${status})
    RETURNING *
  `;
  return rows[0];
}

export async function removeGameAttendee(
  gameSessionId: number,
  name: string
): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM game_attendees 
    WHERE game_session_id = ${gameSessionId} AND LOWER(name) = LOWER(${name})
  `;
  return (rowCount ?? 0) > 0;
}
