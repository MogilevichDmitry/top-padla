import { useQuery } from "@tanstack/react-query";

interface PlayerWithStats {
  id: number;
  name: string;
  tg_id: number | null;
  rating: number;
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
}

export function usePlayerStats() {
  return useQuery<PlayerWithStats[]>({
    queryKey: ["playerStats"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/players/stats");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch player stats:", response.status, errorText);
          throw new Error(`Failed to fetch player stats: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in usePlayerStats:", error);
        throw error;
      }
    },
    retry: 1,
  });
}
