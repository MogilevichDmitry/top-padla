import { useQuery } from "@tanstack/react-query";

interface PlayerDetails {
  player: {
    id: number;
    name: string;
    rating: number;
    rank: number | null;
  };
  stats: {
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
    bestPartner: number | null;
    bestPartnerWR: number | null;
    worstPartner: number | null;
    worstPartnerWR: number | null;
    partnerStats: Record<
      string,
      { games: number; wins: number; losses: number }
    >;
  };
  streaks: {
    best_win: number;
    best_win_date: string | null;
    worst_loss: number;
    worst_loss_date: string | null;
    current_streak: number;
    current_streak_type: "win" | "loss" | null;
    current_streak_start_date: string | null;
  };
  progress: {
    currentRating: number;
    startRating: number;
    peakRating: number;
    minRating: number;
    ratingChange: number;
    peakDate: string | null;
    history: Array<{ date: string; rating: number }>;
  };
  performance: {
    vsStrong: { total: number; wins: number; losses: number; winRate: number };
    vsEqual: { total: number; wins: number; losses: number; winRate: number };
    vsWeak: { total: number; wins: number; losses: number; winRate: number };
    currentRating: number;
  };
  matches: Array<{
    id: number;
    date: string;
    type: "to6" | "to4" | "to3";
    team_a_names: string[];
    team_b_names: string[];
    team_a_ids: number[];
    team_b_ids: number[];
    score_a: number;
    score_b: number;
  }>;
  partners: {
    best: { id: number; name: string; winRate: number } | null;
    worst: { id: number; name: string; winRate: number } | null;
    all: Array<{
      id: number;
      name: string;
      rating: number;
      games: number;
      wins: number;
      losses: number;
      winRate: number;
    }>;
  };
}

export function usePlayerDetails(slug: string) {
  return useQuery<PlayerDetails>({
    queryKey: ["playerDetails", slug],
    queryFn: async () => {
      const response = await fetch(`/api/players/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Player not found");
        }
        throw new Error(`Failed to fetch player details: ${response.status}`);
      }
      const data = await response.json();
      // Validate that we have the expected structure
      if (!data || !data.player) {
        throw new Error("Invalid player data received");
      }
      return data;
    },
    enabled: !!slug,
    retry: false, // Don't retry on 404
  });
}
