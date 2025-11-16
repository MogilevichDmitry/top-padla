import { useQuery } from "@tanstack/react-query";

interface Player {
  id: number;
  name: string;
  tg_id: number | null;
}

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const response = await fetch("/api/players");
      if (!response.ok) throw new Error("Failed to fetch players");
      return response.json();
    },
  });
}

