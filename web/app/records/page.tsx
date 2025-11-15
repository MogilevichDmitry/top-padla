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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error || !records) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600">{error || "No records found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            League Records
          </h1>
          <p className="text-gray-600">
            Historical achievements and statistics
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ratings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📈 Ratings
            </h2>
            <div className="space-y-3">
              {records.highest_player && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Highest Rating</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.highest_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-600">
                      {records.highest_rating?.toFixed(1)}
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
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Lowest Rating</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.lowest_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {records.lowest_rating?.toFixed(1)}
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎯 Win Rates (min 5 matches)
            </h2>
            <div className="space-y-3">
              {records.best_wr_player && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Best Win Rate</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.best_wr_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {records.best_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              {records.worst_wr_player && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Worst Win Rate</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.worst_wr_player)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {records.worst_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streaks */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🔥 Streaks
            </h2>
            <div className="space-y-3">
              {records.longest_win_player && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">
                      Longest Win Streak
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.longest_win_player)}
                    </div>
                    {records.longest_win_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(records.longest_win_date)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {records.longest_win_streak}
                    </div>
                    <div className="text-xs text-gray-500">matches</div>
                  </div>
                </div>
              )}
              {records.longest_loss_player && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">
                      Longest Loss Streak
                    </div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.longest_loss_player)}
                    </div>
                    {records.longest_loss_date && (
                      <div className="text-xs text-gray-500">
                        {formatDate(records.longest_loss_date)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {records.longest_loss_streak}
                    </div>
                    <div className="text-xs text-gray-500">matches</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duos */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              👥 Best/Worst Duos
            </h2>
            <div className="space-y-3">
              {records.best_duo_player && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Best Duo</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.best_duo_player)} +{" "}
                      {records.best_duo_partner}
                    </div>
                    {records.best_duo_games && (
                      <div className="text-xs text-gray-500">
                        {records.best_duo_games} games
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {records.best_duo_wr?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              {records.worst_duo_player && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Worst Duo</div>
                    <div className="font-semibold text-gray-900">
                      {getPlayerName(records.worst_duo_player)} +{" "}
                      {records.worst_duo_partner}
                    </div>
                    {records.worst_duo_games && (
                      <div className="text-xs text-gray-500">
                        {records.worst_duo_games} games
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
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
