import { useQuery } from "@tanstack/react-query";

interface Pair {
  id: number;
  player1_id: number;
  player2_id: number;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  player1_name: string;
  player2_name: string;
}

export function usePairs() {
  return useQuery<Pair[]>({
    queryKey: ["pairs"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/pairs");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch pairs:", response.status, errorText);
          throw new Error(`Failed to fetch pairs: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in usePairs:", error);
        throw error;
      }
    },
    retry: 1,
  });
}

