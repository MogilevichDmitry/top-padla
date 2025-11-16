import { useQuery } from "@tanstack/react-query";

interface LeagueRecords {
  highest_rating?: number;
  highest_player?: number;
  highest_date?: string;
  lowest_rating?: number;
  lowest_player?: number;
  lowest_date?: string;
  best_wr?: number;
  best_wr_player?: number;
  worst_wr?: number;
  worst_wr_player?: number;
  longest_win_streak?: number;
  longest_win_player?: number;
  longest_win_date?: string;
  longest_loss_streak?: number;
  longest_loss_player?: number;
  longest_loss_date?: string;
  best_duo_player?: number;
  best_duo_partner?: string;
  best_duo_wr?: number;
  best_duo_games?: number;
  worst_duo_player?: number;
  worst_duo_partner?: string;
  worst_duo_wr?: number;
  worst_duo_games?: number;
}

export function useRecords() {
  return useQuery<LeagueRecords>({
    queryKey: ["records"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/records");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch records:", response.status, errorText);
          throw new Error(`Failed to fetch records: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in useRecords:", error);
        throw error;
      }
    },
    retry: 1,
  });
}

