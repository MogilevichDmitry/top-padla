"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { nameToSlug } from "@/lib/utils";

interface PlayerDetails {
  player: {
    id: number;
    name: string;
    rating: number;
    rank: number;
  };
  stats: {
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
  };
  streaks: {
    best_win: number;
    best_win_date: string | null;
    worst_loss: number;
    worst_loss_date: string | null;
    current_streak: number;
    current_streak_type: "win" | "loss" | null;
    current_streak_start_date: string | null;
  };
  progress: {
    currentRating: number;
    startRating: number;
    peakRating: number;
    minRating: number;
    ratingChange: number;
    peakDate: string | null;
    history: { date: string; rating: number }[];
  };
  performance: {
    vsStrong: { total: number; wins: number; losses: number; winRate: number };
    vsWeak: { total: number; wins: number; losses: number; winRate: number };
    vsEqual: { total: number; wins: number; losses: number; winRate: number };
    currentRating: number;
  };
  matches: Array<{
    id: number;
    date: string;
    type: "to6" | "to4" | "to3";
    team_a: number[];
    team_b: number[];
    team_a_names: string[];
    team_b_names: string[];
    team_a_ids: number[];
    team_b_ids: number[];
    score_a: number;
    score_b: number;
  }>;
  partners: {
    best: { id: number; name: string; winRate: number } | null;
    worst: { id: number; name: string; winRate: number } | null;
    all: Array<{
      id: number;
      name: string;
      rating: number;
      games: number;
      wins: number;
      losses: number;
      winRate: number;
    }>;
  };
}

export default function PlayerPage() {
  const params = useParams();
  const [data, setData] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "games" | "winRate">(
    "rating"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/players/${params.slug}`);
        if (!response.ok) {
          throw new Error("Failed to fetch player data");
        }
        const playerData = await response.json();
        setData(playerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchData();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-md p-8 text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-md p-8 text-center">
            <p className="text-red-600">{error || "Player not found"}</p>
            <Link
              href="/players"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              ← Back to Players
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getMatchTypeIcon = (type: string) => {
    if (type === "to3") return "🚀";
    if (type === "to4") return "🏸";
    return "🎾";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-orange-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-3xl font-bold">
                  {data.player.name}
                </h1>
                <p className="text-gray-300 text-lg mt-1">
                  Rating: {Math.floor(data.player.rating)}
                  {data.player.rank && ` (#${data.player.rank})`}
                </p>
              </div>
              <Link
                href="/players"
                className="text-white hover:text-gray-200 underline"
              >
                ← Back to Players
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Matches</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.stats.matches}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Wins</p>
              <p className="text-2xl font-bold text-green-600">
                {data.stats.wins}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Losses</p>
              <p className="text-2xl font-bold text-red-600">
                {data.stats.losses}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.stats.winRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-gray-500 text-sm mb-2">By Match Type:</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {data.stats.to6Wins + data.stats.to6Losses > 0 && (
                <span className="text-gray-600">
                  🎾 {data.stats.to6Wins}-{data.stats.to6Losses}
                </span>
              )}
              {data.stats.to4Wins + data.stats.to4Losses > 0 && (
                <span className="text-gray-600">
                  🏸 {data.stats.to4Wins}-{data.stats.to4Losses}
                </span>
              )}
              {data.stats.to3Wins + data.stats.to3Losses > 0 && (
                <span className="text-gray-600">
                  🚀 {data.stats.to3Wins}-{data.stats.to3Losses}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Streaks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Current Streak</p>
              <p
                className={`text-2xl font-bold ${
                  data.streaks.current_streak_type === "win"
                    ? "text-green-600"
                    : data.streaks.current_streak_type === "loss"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {data.streaks.current_streak > 0
                  ? `${data.streaks.current_streak} ${
                      data.streaks.current_streak_type === "win"
                        ? "Wins"
                        : "Losses"
                    }`
                  : "No streak"}
              </p>
              {data.streaks.current_streak_start_date && (
                <p className="text-sm text-gray-500 mt-1">
                  Since: {formatDate(data.streaks.current_streak_start_date)}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm">Best Win Streak</p>
              <p className="text-2xl font-bold text-green-600">
                {data.streaks.best_win}
              </p>
              {data.streaks.best_win_date && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(data.streaks.best_win_date)}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm">Worst Loss Streak</p>
              <p className="text-2xl font-bold text-red-600">
                {data.streaks.worst_loss}
              </p>
              {data.streaks.worst_loss_date && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(data.streaks.worst_loss_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Rating Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Current Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(data.progress.currentRating)}
                {data.player.rank && ` (#${data.player.rank})`}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Peak Rating</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.floor(data.progress.peakRating)}
              </p>
              {data.progress.peakDate && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(data.progress.peakDate)}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm">Min Rating</p>
              <p className="text-2xl font-bold text-red-600">
                {Math.floor(data.progress.minRating)}
              </p>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.performance.vsStrong.total > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">💪</span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Against Strong
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Opponents with rating at least 50 points higher
                </p>
                <div className="space-y-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {data.performance.vsStrong.wins}-
                      {data.performance.vsStrong.losses}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        data.performance.vsStrong.winRate >= 50
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ({data.performance.vsStrong.winRate.toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    from {data.performance.vsStrong.total} matches
                  </p>
                </div>
              </div>
            )}
            {data.performance.vsEqual.total > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">⚖️</span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Against Equal
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Opponents with rating within ±50 points
                </p>
                <div className="space-y-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {data.performance.vsEqual.wins}-
                      {data.performance.vsEqual.losses}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        data.performance.vsEqual.winRate >= 50
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ({data.performance.vsEqual.winRate.toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    from {data.performance.vsEqual.total} matches
                  </p>
                </div>
              </div>
            )}
            {data.performance.vsWeak.total > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-5">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📉</span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Against Weak
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Opponents with rating at least 50 points lower
                </p>
                <div className="space-y-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {data.performance.vsWeak.wins}-
                      {data.performance.vsWeak.losses}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        data.performance.vsWeak.winRate >= 50
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ({data.performance.vsWeak.winRate.toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    from {data.performance.vsWeak.total} matches
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Best/Worst Partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.partners.best && (
            <div className="bg-white rounded-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Best Partner
              </h2>
              <Link
                href={`/players/${nameToSlug(data.partners.best.name)}`}
                className="block hover:underline"
              >
                <p className="text-xl font-semibold text-gray-900">
                  {data.partners.best.name}
                </p>
                <p className="text-lg text-green-600 font-bold mt-1">
                  {data.partners.best.winRate.toFixed(1)}% win rate
                </p>
              </Link>
            </div>
          )}
          {data.partners.worst && (
            <div className="bg-white rounded-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Worst Partner
              </h2>
              <Link
                href={`/players/${nameToSlug(data.partners.worst.name)}`}
                className="block hover:underline"
              >
                <p className="text-xl font-semibold text-gray-900">
                  {data.partners.worst.name}
                </p>
                <p className="text-lg text-red-600 font-bold mt-1">
                  {data.partners.worst.winRate.toFixed(1)}% win rate
                </p>
              </Link>
            </div>
          )}
        </div>

        {/* All Partners */}
        {data.partners.all.length > 0 && (
          <div className="bg-white rounded-md py-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 px-6">
              All Partners
            </h2>

            {/* Mobile view - cards */}
            <div className="md:hidden space-y-0 px-3">
              {[...data.partners.all]
                .sort((a, b) => {
                  let comparison = 0;
                  if (sortBy === "rating") {
                    comparison = a.rating - b.rating;
                  } else if (sortBy === "games") {
                    comparison = a.games - b.games;
                  } else if (sortBy === "winRate") {
                    comparison = a.winRate - b.winRate;
                  }
                  return sortOrder === "asc" ? comparison : -comparison;
                })
                .map((partner) => (
                  <div
                    key={partner.id}
                    className="border-b border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/players/${nameToSlug(partner.name)}`}
                        className="text-lg font-semibold text-blue-600 hover:underline"
                      >
                        {partner.name}
                      </Link>
                      <span className="text-xl font-bold text-gray-900">
                        {Math.floor(partner.rating)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Games:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {partner.games}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">W-L:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {partner.wins}-{partner.losses}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-gray-500">Win Rate:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {partner.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop view - table */}
            <div className="hidden md:block overflow-x-auto px-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-gray-700">
                      Partner
                    </th>
                    <th
                      className="text-left py-2 px-4 text-gray-700 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => {
                        if (sortBy === "rating") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("rating");
                          setSortOrder("desc");
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
                      className="text-center py-2 px-4 text-gray-700 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => {
                        if (sortBy === "games") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("games");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      Games
                      <span className="ml-1">
                        {sortBy === "games" ? (
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
                    <th className="text-center py-2 px-4 text-gray-700">W-L</th>
                    <th
                      className="text-center py-2 px-4 text-gray-700 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => {
                        if (sortBy === "winRate") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("winRate");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      Win Rate
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
                <tbody>
                  {[...data.partners.all]
                    .sort((a, b) => {
                      let comparison = 0;
                      if (sortBy === "rating") {
                        comparison = a.rating - b.rating;
                      } else if (sortBy === "games") {
                        comparison = a.games - b.games;
                      } else if (sortBy === "winRate") {
                        comparison = a.winRate - b.winRate;
                      }
                      return sortOrder === "asc" ? comparison : -comparison;
                    })
                    .map((partner) => (
                      <tr
                        key={partner.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-4">
                          <Link
                            href={`/players/${nameToSlug(partner.name)}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {partner.name}
                          </Link>
                        </td>
                        <td className="py-2 px-4 text-left text-gray-900">
                          {Math.floor(partner.rating)}
                        </td>
                        <td className="py-2 px-4 text-center text-gray-900">
                          {partner.games}
                        </td>
                        <td className="py-2 px-4 text-center text-gray-900">
                          {partner.wins}-{partner.losses}
                        </td>
                        <td className="py-2 px-4 text-center text-gray-900 font-semibold">
                          {partner.winRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Match History
          </h2>
          <div className="space-y-3">
            {data.matches.length === 0 ? (
              <p className="text-gray-500">No matches found</p>
            ) : (
              (() => {
                const totalPages = Math.ceil(
                  data.matches.length / matchesPerPage
                );
                const startIndex = (currentPage - 1) * matchesPerPage;
                const endIndex = startIndex + matchesPerPage;
                const paginatedMatches = data.matches.slice(
                  startIndex,
                  endIndex
                );

                return (
                  <>
                    {paginatedMatches.map((match) => {
                      const isTeamA = match.team_a_ids.includes(data.player.id);
                      const won = isTeamA
                        ? match.score_a > match.score_b
                        : match.score_b > match.score_a;
                      // Get partner info
                      const myTeamIds = isTeamA
                        ? match.team_a_ids
                        : match.team_b_ids;
                      const myTeamNames = isTeamA
                        ? match.team_a_names
                        : match.team_b_names;
                      const partnerId = myTeamIds.find(
                        (id) => id !== data.player.id
                      );
                      const partnerIndex = myTeamIds.findIndex(
                        (id) => id === partnerId
                      );
                      const partnerName =
                        partnerIndex !== -1 ? myTeamNames[partnerIndex] : null;

                      const oppTeamNames = isTeamA
                        ? match.team_b_names
                        : match.team_a_names;
                      const myScore = isTeamA ? match.score_a : match.score_b;
                      const oppScore = isTeamA ? match.score_b : match.score_a;

                      const isLastMatch =
                        paginatedMatches.indexOf(match) ===
                        paginatedMatches.length - 1;
                      return (
                        <div
                          key={match.id}
                          className={`pb-3 ${
                            isLastMatch && totalPages > 1
                              ? ""
                              : "border-b border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span>{getMatchTypeIcon(match.type)}</span>
                                <span className="text-sm text-gray-600">
                                  with{" "}
                                  {partnerName ? (
                                    <Link
                                      href={`/players/${nameToSlug(
                                        partnerName
                                      )}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {partnerName}
                                    </Link>
                                  ) : (
                                    "Unknown"
                                  )}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 ">
                                vs{" "}
                                {oppTeamNames.map((name, idx) => (
                                  <span key={idx}>
                                    <Link
                                      href={`/players/${nameToSlug(name)}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {name}
                                    </Link>
                                    {idx < oppTeamNames.length - 1 && " + "}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-1">
                                {formatDate(match.date)}
                              </div>
                              <div className="text-sm font-semibold">
                                <span
                                  className={
                                    won ? "text-green-600" : "text-red-600"
                                  }
                                >
                                  {myScore}
                                </span>
                                <span className="text-gray-500 mx-1">-</span>
                                <span
                                  className={
                                    !won ? "text-green-600" : "text-red-600"
                                  }
                                >
                                  {oppScore}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Previous page"
                          >
                            ←
                          </button>
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                                currentPage === page
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Next page"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
