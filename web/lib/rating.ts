import { Match, Player } from './db';

// Constants
const START_RATING = 1000;
const K_BASE = 28;
const L_TO6 = 1.0;
const L_TO4 = 0.8;
const L_TO3 = 0.7;
const WINDOW_DAYS = 182;

export function expected(teamA: number, teamB: number): number {
  return 1.0 / (1.0 + Math.pow(10, (teamB - teamA) / 400.0));
}

export function actualS(scoreA: number, scoreB: number, T: number, matchType: string): number {
  const gd = scoreA - scoreB;
  const margin = Math.max(-1.0, Math.min(1.0, gd / T));
  // Reduce score influence by 40% for all match types (0.5 * 0.6 = 0.3)
  const marginFactor = 0.3;
  return 0.5 + marginFactor * margin;
}

export function getLByType(type: string): number {
  if (type === 'to6') return L_TO6;
  if (type === 'to4') return L_TO4;
  if (type === 'to3') return L_TO3;
  return L_TO6; // default
}

export function getTByType(type: string): number {
  if (type === 'to6') return 6;
  if (type === 'to4') return 4;
  if (type === 'to3') return 3;
  return 6; // default
}

export interface RatingTable {
  [playerId: number]: number;
}

export function calculateRatings(
  players: Player[],
  matches: Match[],
  cutoffDate?: Date
): RatingTable {
  const ratings: RatingTable = {};
  
  // Initialize ratings
  players.forEach(player => {
    ratings[player.id] = START_RATING;
  });

  // Calculate cutoff date (6 months ago from now or custom date)
  const now = cutoffDate || new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);

  // Sort matches by date
  const sortedMatches = [...matches].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateCompare !== 0 ? dateCompare : a.id - b.id;
  });

  // Process each match
  for (const match of sortedMatches) {
    const matchDate = new Date(match.date);
    if (matchDate < cutoff) continue;

    if (match.team_a.length === 2 && match.team_b.length === 2) {
      const [a1, a2] = match.team_a;
      const [b1, b2] = match.team_b;

      const rA = (ratings[a1] + ratings[a2]) / 2.0;
      const rB = (ratings[b1] + ratings[b2]) / 2.0;

      const E = expected(rA, rB);
      const T = getTByType(match.type);
      const S = actualS(match.score_a, match.score_b, T, match.type);
      const deltaTeam = K_BASE * getLByType(match.type) * (S - E);

      ratings[a1] = ratings[a1] + deltaTeam;
      ratings[a2] = ratings[a2] + deltaTeam;
      ratings[b1] = ratings[b1] - deltaTeam;
      ratings[b2] = ratings[b2] - deltaTeam;
    }
  }

  return ratings;
}

export interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgScoreFor: number;
  avgScoreAgainst: number;
  to6Wins: number;
  to6Losses: number;
  to4Wins: number;
  to4Losses: number;
  to3Wins: number;
  to3Losses: number;
}

export function getPlayerStats(playerId: number, matches: Match[]): PlayerStats {
  let totalMatches = 0;
  let wins = 0;
  let losses = 0;
  let totalScoreFor = 0;
  let totalScoreAgainst = 0;
  let to6Wins = 0, to6Losses = 0;
  let to4Wins = 0, to4Losses = 0;
  let to3Wins = 0, to3Losses = 0;

  for (const match of matches) {
    if (match.team_a.includes(playerId)) {
      totalMatches++;
      totalScoreFor += match.score_a;
      totalScoreAgainst += match.score_b;

      const won = match.score_a > match.score_b;
      if (won) wins++;
      else losses++;

      if (match.type === 'to6') {
        if (won) to6Wins++;
        else to6Losses++;
      } else if (match.type === 'to4') {
        if (won) to4Wins++;
        else to4Losses++;
      } else if (match.type === 'to3') {
        if (won) to3Wins++;
        else to3Losses++;
      }
    } else if (match.team_b.includes(playerId)) {
      totalMatches++;
      totalScoreFor += match.score_b;
      totalScoreAgainst += match.score_a;

      const won = match.score_b > match.score_a;
      if (won) wins++;
      else losses++;

      if (match.type === 'to6') {
        if (won) to6Wins++;
        else to6Losses++;
      } else if (match.type === 'to4') {
        if (won) to4Wins++;
        else to4Losses++;
      } else if (match.type === 'to3') {
        if (won) to3Wins++;
        else to3Losses++;
      }
    }
  }

  return {
    matches: totalMatches,
    wins,
    losses,
    winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
    avgScoreFor: totalMatches > 0 ? totalScoreFor / totalMatches : 0,
    avgScoreAgainst: totalMatches > 0 ? totalScoreAgainst / totalMatches : 0,
    to6Wins,
    to6Losses,
    to4Wins,
    to4Losses,
    to3Wins,
    to3Losses,
  };
}

