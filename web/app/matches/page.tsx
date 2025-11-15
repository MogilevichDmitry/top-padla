"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Match {
  id: number;
  date: string;
  type: "to6" | "to4" | "to3";
  team_a: number[];
  team_b: number[];
  score_a: number;
  score_b: number;
  created_by: number | null;
}

interface Player {
  id: number;
  name: string;
}

interface MatchWithNames extends Match {
  team_a_names: string[];
  team_b_names: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithNames[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch players once
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch("/api/players");
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        }
      } catch (err) {
        console.error("Failed to fetch players:", err);
      }
    }
    fetchPlayers();
  }, []);

  const fetchMatches = useCallback(async (page: number = 1) => {
    try {
      setLoadingMore(true);
      const response = await fetch(`/api/matches?page=${page}&limit=20`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      const data = await response.json();

      // Add player names to matches
      const matchesWithNames = data.matches.map((match: Match) => {
        const getPlayerName = (playerId: number): string => {
          const player = players.find((p) => p.id === playerId);
          return player?.name || `Player ${playerId}`;
        };
        return {
          ...match,
          team_a_names: match.team_a.map((id) => getPlayerName(id)),
          team_b_names: match.team_b.map((id) => getPlayerName(id)),
        };
      });

      if (page === 1) {
        setMatches(matchesWithNames);
      } else {
        setMatches((prev) => [...prev, ...matchesWithNames]);
      }
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [players]);

  useEffect(() => {
    if (players.length > 0) {
      fetchMatches(1);
    }
  }, [players, fetchMatches]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination?.hasMore &&
          !loadingMore &&
          !loading
        ) {
          setLoadingMore(true);
          fetchMatches(pagination.page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [pagination, loadingMore, loading, fetchMatches]);

  const getMatchTypeEmoji = (type: string) => {
    switch (type) {
      case "to6":
        return "🎾";
      case "to4":
        return "🏸";
      case "to3":
        return "🎯";
      default:
        return "🎾";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && matches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Match History
          </h1>
          <p className="text-gray-600">
            All matches sorted by date (newest first)
          </p>
        </header>

        <div className="space-y-4">
          {matches.map((match) => {
            const teamAWon = match.score_a > match.score_b;
            return (
              <div
                key={match.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getMatchTypeEmoji(match.type)}
                    </span>
                    <span className="text-sm font-semibold text-gray-500 uppercase">
                      {match.type}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(match.date)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div
                    className={`flex-1 text-right pr-4 ${
                      teamAWon ? "font-semibold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    <div className="space-y-1">
                      {match.team_a_names.map((name, idx) => (
                        <div key={idx} className="text-lg">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-shrink-0 px-6">
                    <div
                      className={`text-3xl font-bold ${
                        teamAWon ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {match.score_a}
                    </div>
                    <div className="text-center text-gray-400 text-sm">—</div>
                    <div
                      className={`text-3xl font-bold ${
                        !teamAWon ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {match.score_b}
                    </div>
                  </div>

                  <div
                    className={`flex-1 text-left pl-4 ${
                      !teamAWon ? "font-semibold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    <div className="space-y-1">
                      {match.team_b_names.map((name, idx) => (
                        <div key={idx} className="text-lg">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="py-8">
          {loadingMore && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading more...</p>
            </div>
          )}
          {!pagination?.hasMore && matches.length > 0 && (
            <p className="text-center text-gray-500 text-sm">
              No more matches to load
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

