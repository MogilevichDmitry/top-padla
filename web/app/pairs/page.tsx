"use client";

import { useEffect, useState, useMemo } from "react";

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

const getPairIcon = (index: number, total: number): string => {
  // First pair always gets trophy
  if (index === 0) return "🏆";

  // For the rest, calculate based on 20% segments
  const remainingPairs = total - 1; // Exclude first pair
  const segmentSize = Math.ceil(remainingPairs * 0.2); // 20% of remaining pairs

  const position = index - 1; // Position in remaining pairs (0-based)

  if (position < segmentSize) return "💪"; // Top 20%
  if (position < segmentSize * 2) return "🤝"; // Next 20%
  if (position < segmentSize * 3) return "👌"; // Next 20%
  if (position < segmentSize * 4) return "😓"; // Next 20%
  return "💩"; // Last 20%
};

export default function PairsPage() {
  const [pairs, setPairs] = useState<PairWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "matches" | "winRate">(
    "rating"
  );
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

  // Create icon map based on rating order (always sorted by rating descending)
  const iconMap = useMemo(() => {
    const ratingSorted = [...pairs].sort((a, b) => b.rating - a.rating);
    const map = new Map<number, string>();

    ratingSorted.forEach((pair, index) => {
      map.set(pair.id, getPairIcon(index, ratingSorted.length));
    });

    return map;
  }, [pairs]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading pairs...</p>
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
            Pairs
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            All player pairs with their team ratings and statistics
          </p>
        </header>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Pair Statistics
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
            {sortedPairs.map((pair) => {
              const winRate =
                pair.matches > 0 ? (pair.wins / pair.matches) * 100 : 0;
              return (
                <div
                  key={pair.id}
                  className="bg-white rounded-md border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {iconMap.get(pair.id) || "🤝"}
                      </span>
                      <div className="flex flex-col font-semibold text-gray-900 text-base leading-tight">
                        <span>{pair.player1_name}</span>
                        <span>{pair.player2_name}</span>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {Math.floor(pair.rating)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Matches:</span>{" "}
                      <span className="font-medium text-gray-900">
                        {pair.matches}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">W-L:</span>{" "}
                      <span className="font-medium text-gray-900">
                        {pair.wins}-{pair.losses}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Win Rate:</span>{" "}
                      {pair.matches > 0 ? (
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                            winRate >= 60
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : winRate >= 40
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {winRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop view - table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Pair
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedPairs.map((pair) => {
                  const winRate =
                    pair.matches > 0 ? (pair.wins / pair.matches) * 100 : 0;
                  return (
                    <tr
                      key={pair.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {iconMap.get(pair.id) || "🤝"}
                          </span>
                          <div className="flex flex-col text-sm font-semibold text-gray-900 leading-tight">
                            <span>{pair.player1_name}</span>
                            <span>{pair.player2_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left">
                        <span className="text-base font-bold text-gray-900">
                          {Math.floor(pair.rating)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {pair.matches}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {pair.wins}-{pair.losses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {pair.matches > 0 ? (
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                              winRate >= 60
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : winRate >= 40
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
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
