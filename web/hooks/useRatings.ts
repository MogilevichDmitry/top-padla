import { useQuery } from "@tanstack/react-query";

interface PlayerWithRating {
  id: number;
  name: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function useRatings() {
  return useQuery<PlayerWithRating[]>({
    queryKey: ["ratings"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/ratings");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch ratings:", response.status, errorText);
          throw new Error(`Failed to fetch ratings: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in useRatings:", error);
        throw error;
      }
    },
    retry: 1,
  });
}

