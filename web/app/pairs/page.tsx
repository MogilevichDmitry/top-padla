"use client";

import { useEffect, useState } from "react";

interface PairWithNames {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player2_name: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
}

export default function PairsPage() {
  const [pairs, setPairs] = useState<PairWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "matches" | "winRate">("rating");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchPairs() {
      try {
        const response = await fetch("/api/pairs");
        if (!response.ok) throw new Error("Failed to fetch pairs");
        const data = await response.json();
        setPairs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchPairs();
  }, []);

  const handleSort = (field: "rating" | "matches" | "winRate") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedPairs = [...pairs].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "rating") {
      comparison = a.rating - b.rating;
    } else if (sortBy === "matches") {
      comparison = a.matches - b.matches;
    } else if (sortBy === "winRate") {
      const winRateA = a.matches > 0 ? (a.wins / a.matches) * 100 : 0;
      const winRateB = b.matches > 0 ? (b.wins / b.matches) * 100 : 0;
      comparison = winRateA - winRateB;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pairs...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-4 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Pairs</h1>
          <p className="text-sm md:text-base text-gray-600">
            All player pairs with their team ratings and statistics
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
              <h2 className="text-white text-xl md:text-2xl font-semibold">
                Pair Statistics
              </h2>
              <div className="flex items-center space-x-4 text-sm text-white/90">
                <span>Sort by:</span>
                <button
                  onClick={() => handleSort("rating")}
                  className={`px-3 py-1 rounded ${
                    sortBy === "rating"
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  Rating
                  {sortBy === "rating" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSort("matches")}
                  className={`px-3 py-1 rounded ${
                    sortBy === "matches"
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  Matches
                  {sortBy === "matches" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSort("winRate")}
                  className={`px-3 py-1 rounded ${
                    sortBy === "winRate"
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  Win Rate
                  {sortBy === "winRate" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pair
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPairs.map((pair) => {
                  const winRate = pair.matches > 0 ? (pair.wins / pair.matches) * 100 : 0;
                  return (
                    <tr
                      key={pair.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🤝</span>
                          <div className="text-sm font-medium text-gray-900">
                            {pair.player1_name} + {pair.player2_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-lg font-semibold text-gray-900">
                          {Math.round(pair.rating)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {pair.matches}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {pair.wins}-{pair.losses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {pair.matches > 0 ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              winRate >= 60
                                ? "bg-green-100 text-green-800"
                                : winRate >= 40
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {winRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pairs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No pairs found</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Total pairs: {pairs.length}</p>
        </div>
      </div>
    </div>
  );
}

