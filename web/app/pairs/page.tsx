"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePairs } from "@/hooks/usePairs";
import { useRatings } from "@/hooks/useRatings";
import { nameToSlug, getWinRateBadgeClasses } from "@/lib/utils";
import Loading from "@/components/Loading";

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
  const { data: pairs = [], isLoading, error } = usePairs();
  const { data: ratings = [] } = useRatings();
  const [sortBy, setSortBy] = useState<"rating" | "matches" | "winRate">(
    "rating"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Create a map of playerId -> { rank, rating } for quick lookup
  const playerRankMap = useMemo(() => {
    const map = new Map<number, { rank: number; rating: number }>();
    ratings.forEach((player, index) => {
      map.set(player.id, {
        rank: index + 1,
        rating: Math.floor(player.rating),
      });
    });
    return map;
  }, [ratings]);

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

  // Helper function to get player rank and rating info
  const getPlayerInfo = (playerId: number) => {
    return playerRankMap.get(playerId);
  };

  if (isLoading) {
    return <Loading message="Loading pairs..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
        <div className="bg-white border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-700 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600 text-sm">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
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
          {/* Mobile view - cards */}
          <div className="md:hidden">
            {sortedPairs.map((pair) => {
              const winRate =
                pair.matches > 0 ? (pair.wins / pair.matches) * 100 : 0;
              return (
                <div key={pair.id} className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {iconMap.get(pair.id) || "🤝"}
                      </span>
                      <div className="flex flex-col font-semibold text-gray-900 text-base leading-tight">
                        <span className="mb-0.5 inline-flex items-center">
                          <Link
                            href={`/players/${nameToSlug(pair.player1_name)}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {pair.player1_name}
                          </Link>
                          {(() => {
                            const info = getPlayerInfo(pair.player1_id);
                            return info ? (
                              <span className="text-xs text-gray-500 font-normal ml-0.5">
                                #{info.rank}
                              </span>
                            ) : null;
                          })()}
                        </span>
                        <span className="inline-flex items-center">
                          <Link
                            href={`/players/${nameToSlug(pair.player2_name)}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {pair.player2_name}
                          </Link>
                          {(() => {
                            const info = getPlayerInfo(pair.player2_id);
                            return info ? (
                              <span className="text-xs text-gray-500 font-normal ml-0.5">
                                #{info.rank}
                              </span>
                            ) : null;
                          })()}
                        </span>
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
                    <div className="text-right">
                      <span className="text-gray-500">WR:</span>{" "}
                      {pair.matches > 0 ? (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded text-center inline-block w-[70px] ${getWinRateBadgeClasses(
                            winRate
                          )}`}
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
                  <th
                    className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => {
                      if (sortBy === "rating") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        handleSort("rating");
                      }
                    }}
                  >
                    Rating
                    <span className="ml-1">
                      {sortBy === "rating" ? (
                        sortOrder === "asc" ? (
                          "↑"
                        ) : (
                          "↓"
                        )
                      ) : (
                        <span className="opacity-0 group-hover:opacity-50">
                          ↓
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => {
                      if (sortBy === "matches") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        handleSort("matches");
                      }
                    }}
                  >
                    Matches
                    <span className="ml-1">
                      {sortBy === "matches" ? (
                        sortOrder === "asc" ? (
                          "↑"
                        ) : (
                          "↓"
                        )
                      ) : (
                        <span className="opacity-0 group-hover:opacity-50">
                          ↓
                        </span>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    W-L
                  </th>
                  <th
                    className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => {
                      if (sortBy === "winRate") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        handleSort("winRate");
                      }
                    }}
                  >
                    Win %
                    <span className="ml-1">
                      {sortBy === "winRate" ? (
                        sortOrder === "asc" ? (
                          "↑"
                        ) : (
                          "↓"
                        )
                      ) : (
                        <span className="opacity-0 group-hover:opacity-50">
                          ↓
                        </span>
                      )}
                    </span>
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
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {iconMap.get(pair.id) || "🤝"}
                          </span>
                          <div className="flex flex-col text-sm font-semibold text-gray-900 leading-tight">
                            <span className="mb-0.5 inline-flex items-center">
                              <Link
                                href={`/players/${nameToSlug(
                                  pair.player1_name
                                )}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {pair.player1_name}
                              </Link>
                              {(() => {
                                const info = getPlayerInfo(pair.player1_id);
                                return info ? (
                                  <span className="text-xs text-gray-500 font-normal ml-0.5">
                                    #{info.rank}
                                  </span>
                                ) : null;
                              })()}
                            </span>
                            <span className="inline-flex items-center">
                              <Link
                                href={`/players/${nameToSlug(
                                  pair.player2_name
                                )}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {pair.player2_name}
                              </Link>
                              {(() => {
                                const info = getPlayerInfo(pair.player2_id);
                                return info ? (
                                  <span className="text-xs text-gray-500 font-normal ml-0.5">
                                    #{info.rank}
                                  </span>
                                ) : null;
                              })()}
                            </span>
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
                            className={`inline-block px-3 py-1 text-sm font-semibold rounded text-center w-[70px] ${getWinRateBadgeClasses(
                              winRate
                            )}`}
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
