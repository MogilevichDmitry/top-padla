"use client";

import { useEffect, useState } from "react";

interface LeagueRecords {
  highest_rating?: number;
  highest_player?: number;
  highest_date?: string;
  lowest_rating?: number;
  lowest_player?: number;
  lowest_date?: string;
  best_wr?: number;
  best_wr_player?: number;
  worst_wr?: number;
  worst_wr_player?: number;
  longest_win_streak?: number;
  longest_win_player?: number;
  longest_win_date?: string;
  longest_loss_streak?: number;
  longest_loss_player?: number;
  longest_loss_date?: string;
  best_duo_player?: number;
  best_duo_partner?: string;
  best_duo_wr?: number;
  best_duo_games?: number;
  worst_duo_player?: number;
  worst_duo_partner?: string;
  worst_duo_wr?: number;
  worst_duo_games?: number;
}

interface Player {
  id: number;
  name: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<LeagueRecords | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recordsRes, playersRes] = await Promise.all([
          fetch("/api/records"),
          fetch("/api/players"),
        ]);

        if (!recordsRes.ok || !playersRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const recordsData = await recordsRes.json();
        const playersData = await playersRes.json();

        setRecords(recordsData);
        setPlayers(playersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getPlayerName = (playerId?: number): string => {
    if (!playerId) return "Unknown";
    const player = players.find((p) => p.id === playerId);
    return player?.name || `Player ${playerId}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error || !records) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
        <div className="bg-white border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-700 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600 text-sm">{error || "No records found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 md:py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            League Records
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            Historical achievements and statistics
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Ratings */}
          <div className="bg-white rounded-md border border-gray-200 p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              📈 Ratings
            </h2>
            <div className="space-y-3">
              {records.highest_player && (
                <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Highest Rating
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.highest_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-amber-700">
                      {records.highest_rating
                        ? Math.floor(records.highest_rating)
                        : null}
                    </div>
                    {records.highest_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(records.highest_date)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {records.lowest_player && (
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Lowest Rating
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.lowest_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-700">
                      {records.lowest_rating
                        ? Math.floor(records.lowest_rating)
                        : null}
                    </div>
                    {records.lowest_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(records.lowest_date)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Win Rates */}
          <div className="bg-white rounded-md border border-gray-200 p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              🎯 Win Rates (min 5 matches)
            </h2>
            <div className="space-y-3">
              {records.best_wr_player && (
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Best Win Rate
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.best_wr_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-700">
                      {records.best_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              {records.worst_wr_player && (
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Worst Win Rate
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.worst_wr_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-700">
                      {records.worst_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streaks */}
          <div className="bg-white rounded-md border border-gray-200 p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              🔥 Streaks
            </h2>
            <div className="space-y-3">
              {records.longest_win_player && (
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Longest Win Streak
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.longest_win_player)}
                    </div>
                    {records.longest_win_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(records.longest_win_date)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-700">
                      {records.longest_win_streak}
                    </div>
                    <div className="text-xs text-gray-500">matches</div>
                  </div>
                </div>
              )}
              {records.longest_loss_player && (
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Longest Loss Streak
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.longest_loss_player)}
                    </div>
                    {records.longest_loss_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(records.longest_loss_date)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-700">
                      {records.longest_loss_streak}
                    </div>
                    <div className="text-xs text-gray-500">matches</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duos */}
          <div className="bg-white rounded-md border border-gray-200 p-5 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              👥 Best/Worst Duos
            </h2>
            <div className="space-y-3">
              {records.best_duo_player && (
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Best Duo</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.best_duo_player)} +{" "}
                      {records.best_duo_partner}
                    </div>
                    {records.best_duo_games && (
                      <div className="text-xs text-gray-500 mt-1">
                        {records.best_duo_games} games
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-700">
                      {records.best_duo_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              {records.worst_duo_player && (
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-md">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Worst Duo</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.worst_duo_player)} +{" "}
                      {records.worst_duo_partner}
                    </div>
                    {records.worst_duo_games && (
                      <div className="text-xs text-gray-500 mt-1">
                        {records.worst_duo_games} games
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-700">
                      {records.worst_duo_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
