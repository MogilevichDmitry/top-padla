import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

interface Match {
  id: number;
  date: string;
  type: "to6" | "to4" | "to3";
  team_a: number[];
  team_b: number[];
  score_a: number;
  score_b: number;
  created_by: number | null;
  rating_changes?: { [playerId: number]: number };
}

interface MatchesResponse {
  matches: Match[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function useMatches(page: number = 1, limit: number = 50) {
  return useQuery<MatchesResponse>({
    queryKey: ["matches", page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/matches?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
  });
}

export function useInfiniteMatches(limit: number = 50) {
  return useInfiniteQuery<MatchesResponse>({
    queryKey: ["matches", "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await fetch(
          `/api/matches?page=${pageParam}&limit=${limit}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch matches:", response.status, errorText);
          throw new Error(`Failed to fetch matches: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in useInfiniteMatches:", error);
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.page + 1
        : undefined;
    },
    retry: 1,
  });
}
