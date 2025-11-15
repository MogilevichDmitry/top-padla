"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nameToSlug } from "@/lib/utils";

interface PlayerWithRating {
  id: number;
  name: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export default function Home() {
  const [standings, setStandings] = useState<PlayerWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStandings() {
      try {
        const response = await fetch("/api/ratings");
        if (!response.ok) throw new Error("Failed to fetch ratings");
        const data = await response.json();
        setStandings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading standings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-orange-800 p-6">
            <h2 className="text-white text-2xl font-semibold">
              Player Standings
            </h2>
            <h5 className="text-gray-300 text-sm font-semibold mt-1">
              Current rankings based on modified Elo rating system
            </h5>
          </div>

          {/* Mobile view - cards */}
          <div className="md:hidden">
            {standings.map((player, index) => (
              <div
                key={player.id}
                className="bg-white p-4 border-b border-b-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-lg ${
                        index < 3
                          ? "font-bold text-gray-900"
                          : "font-medium text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Link
                      href={`/players/${nameToSlug(player.name)}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {player.name}
                    </Link>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {Math.floor(player.rating)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{player.matches} matches</span>
                  <span>
                    {player.wins}-{player.losses}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      player.winRate >= 60
                        ? "bg-green-100 text-green-800"
                        : player.winRate >= 40
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {player.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view - table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[50px]">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {standings.map((player, index) => (
                  <tr
                    key={player.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-left max-w-[50px]">
                      <span
                        className={`text-lg ${
                          index < 3
                            ? "font-bold text-gray-900"
                            : "font-medium text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${nameToSlug(player.name)}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <span className="text-lg font-semibold text-gray-900">
                        {Math.floor(player.rating)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {player.matches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {player.wins}-{player.losses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          player.winRate >= 60
                            ? "bg-green-100 text-green-800"
                            : player.winRate >= 40
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {player.winRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {standings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No players yet. Start by adding some matches!
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Powered by modified Elo rating system • Updates in real-time</p>
        </div>
      </div>
    </div>
  );
}
