"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "matches" | "winRate">(
    "rating"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch("/api/players/stats");
        if (!response.ok) throw new Error("Failed to fetch players");
        const data = await response.json();
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, []);

  const handleSort = (field: "rating" | "matches" | "winRate") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "rating") {
      comparison = a.rating - b.rating;
    } else if (sortBy === "matches") {
      comparison = a.matches - b.matches;
    } else if (sortBy === "winRate") {
      comparison = a.winRate - b.winRate;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading players...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
        <div className="bg-white border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-700 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 md:py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Players
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            All registered players with their statistics
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Player Statistics
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 hidden md:inline">
                  Sort by:
                </span>
                <button
                  onClick={() => handleSort("rating")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "rating"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Rating
                  {sortBy === "rating" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSort("matches")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "matches"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Matches
                  {sortBy === "matches" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSort("winRate")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "winRate"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Win Rate
                  {sortBy === "winRate" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile view - cards */}
          <div className="md:hidden p-4 space-y-3">
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-md border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900 text-lg">
                    {player.name}
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {Math.floor(player.rating)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Matches:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {player.matches}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">W-L:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {player.wins}-{player.losses}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Win Rate:</span>{" "}
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                        player.winRate >= 60
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : player.winRate >= 40
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {player.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {(player.to6Wins + player.to6Losses > 0 ||
                  player.to4Wins + player.to4Losses > 0 ||
                  player.to3Wins + player.to3Losses > 0) && (
                  <div className="flex items-center space-x-3 text-xs pt-2 border-t border-gray-200">
                    {player.to6Wins + player.to6Losses > 0 && (
                      <span className="text-gray-600">
                        🎾 {player.to6Wins}-{player.to6Losses}
                      </span>
                    )}
                    {player.to4Wins + player.to4Losses > 0 && (
                      <span className="text-gray-600">
                        🏸 {player.to4Wins}-{player.to4Losses}
                      </span>
                    )}
                    {player.to3Wins + player.to3Losses > 0 && (
                      <span className="text-gray-600">
                        🚀 {player.to3Wins}-{player.to3Losses}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop view - table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Win %
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Match Types
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-semibold text-gray-900">
                          {player.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <span className="text-base font-bold text-gray-900">
                        {Math.floor(player.rating)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {player.matches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {player.wins}-{player.losses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                          player.winRate >= 60
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : player.winRate >= 40
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {player.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-3 text-xs">
                        {player.to6Wins + player.to6Losses > 0 && (
                          <span className="text-gray-600">
                            🎾 {player.to6Wins}-{player.to6Losses}
                          </span>
                        )}
                        {player.to4Wins + player.to4Losses > 0 && (
                          <span className="text-gray-600">
                            🏸 {player.to4Wins}-{player.to4Losses}
                          </span>
                        )}
                        {player.to3Wins + player.to3Losses > 0 && (
                          <span className="text-gray-600">
                            🚀 {player.to3Wins}-{player.to3Losses}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No players found</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Total players: {players.length}</p>
        </div>
      </div>
    </div>
  );
}
