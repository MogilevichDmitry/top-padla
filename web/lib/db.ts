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

export async function getPairs(): Promise<Pair[]> {
  const { rows } = await sql<Pair>`SELECT * FROM pairs`;
  return rows;
}

export async function createMatch(match: Omit<Match, "id">): Promise<Match> {
  const { rows } = await sql<Match>`
    INSERT INTO matches (date, type, team_a, team_b, score_a, score_b, created_by)
    VALUES (
      ${match.date},
      ${match.type},
      ${match.team_a},
      ${match.team_b},
      ${match.score_a},
      ${match.score_b},
      ${match.created_by}
    )
    RETURNING *
  `;
  return rows[0];
}
