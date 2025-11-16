"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { nameToSlug, getWinRateBadgeClasses } from "@/lib/utils";
import { useRatings } from "@/hooks/useRatings";
import Loading from "@/components/Loading";

export default function Home() {
  const router = useRouter();
  const { data: standings = [], isLoading, error } = useRatings();

  if (isLoading) {
    return <Loading message="Loading standings..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50 px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const getRowBgClass = (index: number) => {
    if (index < 3) return "bg-gray-50";
    return "bg-white";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-100">
          <div className="bg-gradient-to-r from-blue-900 to-orange-800 p-6 md:p-8">
            <h2 className="text-white text-3xl font-bold">Player Standings</h2>
            <h5 className="text-gray-200 text-sm mt-2">
              Current rankings based on modified Elo rating system
            </h5>
          </div>

          {/* Mobile view - cards */}
          <div className="md:hidden">
            {standings.map((player, index) => (
              <div
                key={player.id}
                className={`p-4 border-b border-b-gray-200 ${getRowBgClass(
                  index
                )}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-lg w-4 ${
                        index < 3
                          ? "font-semibold text-gray-900"
                          : "font-normal text-gray-600"
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <Link
                      href={`/players/${nameToSlug(player.name)}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600"
                    >
                      {player.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">
                      RATING
                    </span>
                    <span className="text-xl font-semibold text-gray-900">
                      {Math.floor(player.rating)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{player.matches} matches</span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">W-L:</span>
                    <span className="font-medium">
                      {player.wins}-{player.losses}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">WR:</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded text-center w-[70px] inline-block ${getWinRateBadgeClasses(
                        player.winRate
                      )}`}
                    >
                      {player.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view - table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider max-w-[80px]">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Win %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((player, index) => (
                  <tr
                    key={player.id}
                    className={`group hover:bg-blue-50 transition-colors cursor-pointer ${getRowBgClass(
                      index
                    )}`}
                    onClick={() => {
                      router.push(`/players/${nameToSlug(player.name)}`);
                    }}
                  >
                    <td className="px-8 py-3.5 whitespace-nowrap text-left max-w-[80px]">
                      <span
                        className={`text-base w-8 ${
                          index < 3
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-500"
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <Link
                        href={`/players/${nameToSlug(player.name)}`}
                        className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-left">
                      <span className="text-xl font-semibold text-gray-900">
                        {Math.floor(player.rating)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className="text-base font-normal text-gray-700">
                        {player.matches}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className="text-base font-medium text-gray-700">
                        {player.wins}-{player.losses}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <span
                        className={`inline-block px-3 py-1 text-sm font-semibold rounded text-center w-[70px] ${getWinRateBadgeClasses(
                          player.winRate
                        )}`}
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
            <div className="text-center py-16">
              <p className="text-gray-500 text-xl font-medium">
                No players yet. Start by adding some matches!
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm font-medium">
          <p>Powered by modified Elo rating system • Updates in real-time</p>
        </div>
      </div>
    </div>
  );
}
