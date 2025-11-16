import { Match, Player } from "./db";

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

export function actualS(
  scoreA: number,
  scoreB: number,
  T: number,
  _matchType: string
): number {
  const gd = scoreA - scoreB;
  const margin = Math.max(-1.0, Math.min(1.0, gd / T));
  // Reduce score influence by 40% for all match types (0.5 * 0.6 = 0.3)
  const marginFactor = 0.3;
  return 0.5 + marginFactor * margin;
}

export function getLByType(type: string): number {
  if (type === "to6") return L_TO6;
  if (type === "to4") return L_TO4;
  if (type === "to3") return L_TO3;
  return L_TO6; // default
}

export function getTByType(type: string): number {
  if (type === "to6") return 6;
  if (type === "to4") return 4;
  if (type === "to3") return 3;
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
  players.forEach((player) => {
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

export interface PartnerStats {
  games: number;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  to6Wins: number;
  to6Losses: number;
  to4Wins: number;
  to4Losses: number;
  to3Wins: number;
  to3Losses: number;
  bestPartner?: number;
  bestPartnerWR?: number;
  worstPartner?: number;
  worstPartnerWR?: number;
  partnerStats: { [playerId: number]: PartnerStats };
}

export function getPlayerStats(
  playerId: number,
  matches: Match[]
): PlayerStats {
  let totalMatches = 0;
  let wins = 0;
  let losses = 0;
  let to6Wins = 0,
    to6Losses = 0;
  let to4Wins = 0,
    to4Losses = 0;
  let to3Wins = 0,
    to3Losses = 0;
  const partnerStats: { [key: number]: PartnerStats } = {};

  for (const match of matches) {
    if (match.team_a.includes(playerId) && match.team_a.length === 2) {
      totalMatches++;

      const won = match.score_a > match.score_b;
      if (won) wins++;
      else losses++;

      // Track partner stats
      const partnerId = match.team_a.find((p) => p !== playerId);
      if (partnerId) {
        if (!partnerStats[partnerId]) {
          partnerStats[partnerId] = { games: 0, wins: 0, losses: 0 };
        }
        partnerStats[partnerId].games++;
        if (won) partnerStats[partnerId].wins++;
        else partnerStats[partnerId].losses++;
      }

      if (match.type === "to6") {
        if (won) to6Wins++;
        else to6Losses++;
      } else if (match.type === "to4") {
        if (won) to4Wins++;
        else to4Losses++;
      } else if (match.type === "to3") {
        if (won) to3Wins++;
        else to3Losses++;
      }
    } else if (match.team_b.includes(playerId) && match.team_b.length === 2) {
      totalMatches++;

      const won = match.score_b > match.score_a;
      if (won) wins++;
      else losses++;

      // Track partner stats
      const partnerId = match.team_b.find((p) => p !== playerId);
      if (partnerId) {
        if (!partnerStats[partnerId]) {
          partnerStats[partnerId] = { games: 0, wins: 0, losses: 0 };
        }
        partnerStats[partnerId].games++;
        if (won) partnerStats[partnerId].wins++;
        else partnerStats[partnerId].losses++;
      }

      if (match.type === "to6") {
        if (won) to6Wins++;
        else to6Losses++;
      } else if (match.type === "to4") {
        if (won) to4Wins++;
        else to4Losses++;
      } else if (match.type === "to3") {
        if (won) to3Wins++;
        else to3Losses++;
      }
    }
  }

  // Find best and worst partners (minimum 3 games)
  let bestPartner: number | undefined;
  let bestPartnerWR = 0;
  let bestPartnerGames = 0;
  let worstPartner: number | undefined;
  let worstPartnerWR = 100;
  let worstPartnerGames = Infinity;

  for (const [partnerIdStr, stats] of Object.entries(partnerStats)) {
    const partnerId = parseInt(partnerIdStr);
    if (stats.games >= 3) {
      const wr = (stats.wins / stats.games) * 100;
      // For best partner: higher win rate wins, or if equal, more games wins
      if (wr > bestPartnerWR || (wr === bestPartnerWR && stats.games > bestPartnerGames)) {
        bestPartner = partnerId;
        bestPartnerWR = wr;
        bestPartnerGames = stats.games;
      }
      // For worst partner: lower win rate wins, or if equal, more games wins (worse record)
      if (wr < worstPartnerWR || (wr === worstPartnerWR && stats.games > worstPartnerGames)) {
        worstPartner = partnerId;
        worstPartnerWR = wr;
        worstPartnerGames = stats.games;
      }
    }
  }

  return {
    matches: totalMatches,
    wins,
    losses,
    winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
    to6Wins,
    to6Losses,
    to4Wins,
    to4Losses,
    to3Wins,
    to3Losses,
    bestPartner,
    bestPartnerWR: bestPartner ? bestPartnerWR : undefined,
    worstPartner,
    worstPartnerWR: worstPartner ? worstPartnerWR : undefined,
    partnerStats,
  };
}

export interface RatingHistoryPoint {
  date: string;
  rating: number;
}

export function getRatingHistory(
  playerId: number,
  players: Player[],
  matches: Match[]
): RatingHistoryPoint[] {
  const history: RatingHistoryPoint[] = [];

  // Start with initial rating
  history.push({ date: "", rating: START_RATING });

  // Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateCompare !== 0 ? dateCompare : a.id - b.id;
  });

  // Simulate rating changes over time (using window approach)
  const now = new Date();

  for (const match of sortedMatches) {
    const matchDate = new Date(match.date);

    if (match.team_a.includes(playerId) || match.team_b.includes(playerId)) {
      // Calculate rating at this point using window
      const cutoff = new Date(matchDate);
      cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);

      const ratings: RatingTable = {};
      players.forEach((p) => {
        ratings[p.id] = START_RATING;
      });

      // Process all matches before this one within window
      for (const m of sortedMatches) {
        const mDate = new Date(m.date);
        if (mDate < cutoff || mDate > matchDate) {
          continue;
        }

        if (m.team_a.length === 2 && m.team_b.length === 2) {
          const [a1, a2] = m.team_a;
          const [b1, b2] = m.team_b;

          const rA = (ratings[a1] + ratings[a2]) / 2.0;
          const rB = (ratings[b1] + ratings[b2]) / 2.0;

          const E = expected(rA, rB);
          const T = getTByType(m.type);
          const S = actualS(m.score_a, m.score_b, T, m.type);
          const deltaTeam = K_BASE * getLByType(m.type) * (S - E);

          ratings[a1] = ratings[a1] + deltaTeam;
          ratings[a2] = ratings[a2] + deltaTeam;
          ratings[b1] = ratings[b1] - deltaTeam;
          ratings[b2] = ratings[b2] - deltaTeam;
        }
      }

      if (playerId in ratings) {
        history.push({ date: match.date, rating: ratings[playerId] });
      }
    }
  }

  return history;
}

export interface PerformanceStats {
  vsStrong: { total: number; wins: number; losses: number; winRate: number };
  vsWeak: { total: number; wins: number; losses: number; winRate: number };
  vsEqual: { total: number; wins: number; losses: number; winRate: number };
  currentRating: number;
}

export function getPerformanceByOpponentStrength(
  playerId: number,
  players: Player[],
  matches: Match[],
  ratings: RatingTable
): PerformanceStats {
  const currentPlayerRating = ratings[playerId] || START_RATING;

  // Categorize opponents
  const strongOpponents: boolean[] = [];
  const weakOpponents: boolean[] = [];
  const equalOpponents: boolean[] = [];

  for (const match of matches) {
    let opponentTeam: number[] = [];
    let myScore = 0;

    if (match.team_a.includes(playerId)) {
      opponentTeam = match.team_b;
      myScore = match.score_a;
    } else if (match.team_b.includes(playerId)) {
      opponentTeam = match.team_a;
      myScore = match.score_b;
    } else {
      continue;
    }

    // Calculate average opponent rating
    const avgOppRating =
      opponentTeam.reduce((sum, p) => sum + (ratings[p] || START_RATING), 0) /
      opponentTeam.length;

    const won =
      myScore >
      (match.team_a.includes(playerId) ? match.score_b : match.score_a);
    const diff = avgOppRating - currentPlayerRating;

    if (diff > 50) {
      strongOpponents.push(won);
    } else if (diff < -50) {
      weakOpponents.push(won);
    } else {
      equalOpponents.push(won);
    }
  }

  const calcStats = (matchResults: boolean[]) => {
    if (matchResults.length === 0) {
      return { total: 0, wins: 0, losses: 0, winRate: 0 };
    }
    const wins = matchResults.filter((w) => w).length;
    return {
      total: matchResults.length,
      wins,
      losses: matchResults.length - wins,
      winRate: (wins / matchResults.length) * 100,
    };
  };

  return {
    vsStrong: calcStats(strongOpponents),
    vsWeak: calcStats(weakOpponents),
    vsEqual: calcStats(equalOpponents),
    currentRating: currentPlayerRating,
  };
}
