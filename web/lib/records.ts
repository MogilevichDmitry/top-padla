import { Player, Match } from "./db";
import { expected, actualS, getLByType, getTByType } from "./rating";
import { getPlayerStats } from "./rating";

const START_RATING = 1000;
const K_BASE = 28;

interface Streaks {
  best_win: number;
  best_win_date: string | null;
  worst_loss: number;
  worst_loss_date: string | null;
}

function getPlayerStreaks(playerId: number, matches: Match[]): Streaks {
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let bestWinDate: string | null = null;
  let worstLossDate: string | null = null;

  const sortedMatches = [...matches]
    .filter((m) => m.team_a.includes(playerId) || m.team_b.includes(playerId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const match of sortedMatches) {
    const isTeamA = match.team_a.includes(playerId);
    const won = isTeamA
      ? match.score_a > match.score_b
      : match.score_b > match.score_a;

    if (won) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > bestWinStreak) {
        bestWinStreak = currentWinStreak;
        bestWinDate = match.date;
      }
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > worstLossStreak) {
        worstLossStreak = currentLossStreak;
        worstLossDate = match.date;
      }
    }
  }

  return {
    best_win: bestWinStreak,
    best_win_date: bestWinDate,
    worst_loss: worstLossStreak,
    worst_loss_date: worstLossDate,
  };
}

export interface LeagueRecords {
  // Ratings
  highest_rating?: number;
  highest_player?: number;
  highest_date?: string;
  lowest_rating?: number;
  lowest_player?: number;
  lowest_date?: string;

  // Activity
  most_matches?: number;
  most_matches_player?: number;

  // Win rates
  best_wr?: number;
  best_wr_player?: number;
  worst_wr?: number;
  worst_wr_player?: number;

  // Streaks
  longest_win_streak?: number;
  longest_win_player?: number;
  longest_win_date?: string;
  longest_loss_streak?: number;
  longest_loss_player?: number;
  longest_loss_date?: string;

  // Biggest scores
  biggest_win?: Match;
  biggest_diff?: number;

  // Duos
  best_duo_player?: number;
  best_duo_partner?: string;
  best_duo_wr?: number;
  best_duo_games?: number;
  worst_duo_player?: number;
  worst_duo_partner?: string;
  worst_duo_wr?: number;
  worst_duo_games?: number;
}

export function getLeagueRecords(
  players: Player[],
  matches: Match[]
): LeagueRecords {
  const records: LeagueRecords = {};

  // === HISTORICAL RATINGS ===
  const historicalRatings: {
    [key: number]: { rating: number; date: string | null };
  } = {};
  const historicalLows: {
    [key: number]: { rating: number; date: string | null };
  } = {};
  const currentRatings: { [key: number]: number } = {};

  // Initialize
  players.forEach((player) => {
    currentRatings[player.id] = START_RATING;
    historicalRatings[player.id] = { rating: START_RATING, date: null };
    historicalLows[player.id] = { rating: START_RATING, date: null };
  });

  // Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateCompare !== 0 ? dateCompare : a.id - b.id;
  });

  // Simulate each match
  for (const match of sortedMatches) {
    if (match.team_a.length === 2 && match.team_b.length === 2) {
      const teamARating =
        (currentRatings[match.team_a[0]] + currentRatings[match.team_a[1]]) / 2;
      const teamBRating =
        (currentRatings[match.team_b[0]] + currentRatings[match.team_b[1]]) / 2;

      const E_A = expected(teamARating, teamBRating);
      const E_B = 1 - E_A;

      const T = getTByType(match.type);
      const diff = match.score_a - match.score_b;
      const S_A = actualS(diff, 0, T, match.type);
      const S_B = 1 - S_A;

      const L = getLByType(match.type);
      const delta_A = K_BASE * L * (S_A - E_A);
      const delta_B = K_BASE * L * (S_B - E_B);

      // Update team A ratings
      for (const pid of match.team_a) {
        currentRatings[pid] += delta_A;
        if (currentRatings[pid] > historicalRatings[pid].rating) {
          historicalRatings[pid] = {
            rating: currentRatings[pid],
            date: match.date,
          };
        }
        if (currentRatings[pid] < historicalLows[pid].rating) {
          historicalLows[pid] = {
            rating: currentRatings[pid],
            date: match.date,
          };
        }
      }

      // Update team B ratings
      for (const pid of match.team_b) {
        currentRatings[pid] += delta_B;
        if (currentRatings[pid] > historicalRatings[pid].rating) {
          historicalRatings[pid] = {
            rating: currentRatings[pid],
            date: match.date,
          };
        }
        if (currentRatings[pid] < historicalLows[pid].rating) {
          historicalLows[pid] = {
            rating: currentRatings[pid],
            date: match.date,
          };
        }
      }
    }
  }

  // Find highest and lowest
  if (Object.keys(historicalRatings).length > 0) {
    let maxPlayerId = 0;
    let maxRating = -Infinity;
    let maxDate: string | null = null;
    for (const [pid, data] of Object.entries(historicalRatings)) {
      if (data.rating > maxRating) {
        maxRating = data.rating;
        maxPlayerId = parseInt(pid);
        maxDate = data.date;
      }
    }
    records.highest_rating = maxRating;
    records.highest_player = maxPlayerId;
    records.highest_date = maxDate || undefined;

    let minPlayerId = 0;
    let minRating = Infinity;
    let minDate: string | null = null;
    for (const [pid, data] of Object.entries(historicalLows)) {
      if (data.rating < minRating) {
        minRating = data.rating;
        minPlayerId = parseInt(pid);
        minDate = data.date;
      }
    }
    records.lowest_rating = minRating;
    records.lowest_player = minPlayerId;
    records.lowest_date = minDate || undefined;
  }

  // === ACTIVITY ===
  const allStats = players.map((player) => ({
    playerId: player.id,
    stats: getPlayerStats(player.id, matches),
  }));

  if (allStats.length > 0) {
    const mostMatches = allStats.reduce((max, data) =>
      data.stats.matches > max.stats.matches ? data : max
    );
    records.most_matches = mostMatches.stats.matches;
    records.most_matches_player = mostMatches.playerId;
  }

  // === WIN RATES ===
  const qualified = allStats.filter((data) => data.stats.matches >= 5);
  if (qualified.length > 0) {
    const bestWR = qualified.reduce((max, data) =>
      data.stats.winRate > max.stats.winRate ? data : max
    );
    records.best_wr = bestWR.stats.winRate;
    records.best_wr_player = bestWR.playerId;

    const worstWR = qualified.reduce((min, data) =>
      data.stats.winRate < min.stats.winRate ? data : min
    );
    records.worst_wr = worstWR.stats.winRate;
    records.worst_wr_player = worstWR.playerId;
  }

  // === STREAKS ===
  let longestWinStreak = 0;
  let longestWinPlayer: number | undefined;
  let longestWinDate: string | undefined;
  let longestLossStreak = 0;
  let longestLossPlayer: number | undefined;
  let longestLossDate: string | undefined;

  for (const player of players) {
    const streaks = getPlayerStreaks(player.id, matches);
    if (streaks.best_win > longestWinStreak) {
      longestWinStreak = streaks.best_win;
      longestWinPlayer = player.id;
      longestWinDate = streaks.best_win_date || undefined;
    }
    if (streaks.worst_loss > longestLossStreak) {
      longestLossStreak = streaks.worst_loss;
      longestLossPlayer = player.id;
      longestLossDate = streaks.worst_loss_date || undefined;
    }
  }

  records.longest_win_streak = longestWinStreak;
  records.longest_win_player = longestWinPlayer;
  records.longest_win_date = longestWinDate;
  records.longest_loss_streak = longestLossStreak;
  records.longest_loss_player = longestLossPlayer;
  records.longest_loss_date = longestLossDate;

  // === BIGGEST SCORES ===
  let biggestDiff = 0;
  let biggestWin: Match | undefined;
  for (const match of matches) {
    const diff = Math.abs(match.score_a - match.score_b);
    if (diff > biggestDiff) {
      biggestDiff = diff;
      biggestWin = match;
    }
  }
  records.biggest_win = biggestWin;
  records.biggest_diff = biggestDiff;

  // === DUOS ===
  const bestPartnerStats: {
    [key: number]: { partner: string; winrate: number; games: number };
  } = {};
  const worstPartnerStats: {
    [key: number]: { partner: string; winrate: number; games: number };
  } = {};

  for (const player of players) {
    const stats = getPlayerStats(player.id, matches);
    if (stats.bestPartner) {
      const partner = players.find((p) => p.id === stats.bestPartner);
      if (partner && stats.partnerStats[stats.bestPartner]) {
        const partnerStats = stats.partnerStats[stats.bestPartner];
        bestPartnerStats[player.id] = {
          partner: partner.name,
          winrate: stats.bestPartnerWR || 0,
          games: partnerStats.games,
        };
      }
    }
    if (stats.worstPartner) {
      const partner = players.find((p) => p.id === stats.worstPartner);
      if (partner && stats.partnerStats[stats.worstPartner]) {
        const partnerStats = stats.partnerStats[stats.worstPartner];
        worstPartnerStats[player.id] = {
          partner: partner.name,
          winrate: stats.worstPartnerWR || 0,
          games: partnerStats.games,
        };
      }
    }
  }

  if (Object.keys(bestPartnerStats).length > 0) {
    let bestPlayerId = 0;
    let bestWR = -1;
    let bestPartner = "";
    let bestGames = 0;
    for (const [pid, data] of Object.entries(bestPartnerStats)) {
      if (data.winrate > bestWR) {
        bestWR = data.winrate;
        bestPlayerId = parseInt(pid);
        bestPartner = data.partner;
        bestGames = data.games;
      }
    }
    records.best_duo_player = bestPlayerId;
    records.best_duo_partner = bestPartner;
    records.best_duo_wr = bestWR;
    records.best_duo_games = bestGames;
  }

  if (Object.keys(worstPartnerStats).length > 0) {
    let worstPlayerId = 0;
    let worstWR = 101;
    let worstPartner = "";
    let worstGames = 0;
    for (const [pid, data] of Object.entries(worstPartnerStats)) {
      if (data.winrate < worstWR) {
        worstWR = data.winrate;
        worstPlayerId = parseInt(pid);
        worstPartner = data.partner;
        worstGames = data.games;
      }
    }
    records.worst_duo_player = worstPlayerId;
    records.worst_duo_partner = worstPartner;
    records.worst_duo_wr = worstWR;
    records.worst_duo_games = worstGames;
  }

  return records;
}
