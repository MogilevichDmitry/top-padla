"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { nameToSlug, getWinRateBadgeClasses } from "@/lib/utils";
import { usePlayerDetails } from "@/hooks/usePlayerDetails";
import Loading from "@/components/Loading";

export default function PlayerPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { data, isLoading, error } = usePlayerDetails(slug);
  const [sortBy, setSortBy] = useState<"rating" | "games" | "winRate">(
    "rating"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [opponentSortBy, setOpponentSortBy] = useState<
    "rating" | "games" | "winRate"
  >("rating");
  const [opponentSortOrder, setOpponentSortOrder] = useState<"asc" | "desc">(
    "desc"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 10;
  const [hoveredPoint, setHoveredPoint] = useState<{
    rating: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  if (isLoading) {
    return <Loading message="Loading player details..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-md p-8 text-center">
            <p className="text-red-600">
              {error instanceof Error ? error.message : String(error)}
            </p>
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

  if (!data || !data.player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-md p-8 text-center">
            <p className="text-gray-600">Player not found</p>
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

        {/* Rating Summary */}
        <div className="bg-white rounded-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Rating Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

          {/* Rating Progress Chart */}
          {data.progress.history &&
            data.progress.history.length > 1 &&
            (() => {
              const history = data.progress.history;
              const width = 800;
              const height = 200;
              const padding = { top: 20, right: 20, bottom: 30, left: 50 };
              const chartWidth = width - padding.left - padding.right;
              const chartHeight = height - padding.top - padding.bottom;

              // Calculate min/max for scaling
              const ratings = history.map((h) => h.rating);
              const minRating = Math.min(...ratings);
              const maxRating = Math.max(...ratings);
              const ratingRange = maxRating - minRating || 100; // Avoid division by zero
              const paddingRange = Math.max(ratingRange * 0.1, 20); // 10% padding, min 20 points
              const yMin = minRating - paddingRange;
              const yMax = maxRating + paddingRange;
              const yRange = yMax - yMin;

              // Generate points
              // In SVG, y=0 is at top, so we need to invert: higher rating = higher on screen = lower y value
              const points = history.map((point, index) => {
                const x =
                  history.length > 1
                    ? (index / (history.length - 1)) * chartWidth
                    : chartWidth / 2;
                // Invert: (yMax - rating) / range gives us position from top
                const y = ((yMax - point.rating) / yRange) * chartHeight;
                return { x, y, rating: point.rating, date: point.date };
              });

              // Create path for line
              const pathData = points
                .map(
                  (point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
                )
                .join(" ");

              // Create area path (line + bottom)
              const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

              // Format date for x-axis
              const formatChartDate = (dateString: string) => {
                const date = new Date(dateString);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              };

              // Get x-axis labels (first, middle, last)
              const xLabels = [
                { index: 0, date: history[0].date },
                {
                  index: Math.floor(history.length / 2),
                  date: history[Math.floor(history.length / 2)]?.date,
                },
                {
                  index: history.length - 1,
                  date: history[history.length - 1].date,
                },
              ].filter((label) => label.date);

              return (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Rating Progress
                  </h3>
                  <div className="overflow-x-auto -mx-6 px-6 relative">
                    <svg
                      width={width}
                      height={height}
                      className="w-full h-auto min-w-full"
                      viewBox={`0 0 ${width} ${height}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Grid lines */}
                      <g
                        transform={`translate(${padding.left}, ${padding.top})`}
                      >
                        {/* Horizontal grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          // ratio 0 = top (high rating), ratio 1 = bottom (low rating)
                          const y = ratio * chartHeight;
                          // Calculate value: ratio 0 = yMax, ratio 1 = yMin
                          const value = yMax - ratio * yRange;
                          return (
                            <g key={ratio}>
                              <line
                                x1={0}
                                y1={y}
                                x2={chartWidth}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={1}
                                strokeDasharray="2,2"
                              />
                              <text
                                x={-5}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill="#6b7280"
                              >
                                {Math.floor(value)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart area (gradient fill) */}
                        <defs>
                          <linearGradient
                            id="ratingGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3b82f6"
                              stopOpacity="0.3"
                            />
                            <stop
                              offset="100%"
                              stopColor="#3b82f6"
                              stopOpacity="0.05"
                            />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#ratingGradient)" />

                        {/* Chart line */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data points */}
                        {points.map((point, index) => (
                          <g key={index}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#3b82f6"
                              className="cursor-pointer transition-all"
                              onMouseEnter={(e) => {
                                const svg = e.currentTarget.ownerSVGElement;
                                if (svg) {
                                  const svgRect = svg.getBoundingClientRect();
                                  // Convert SVG viewBox coordinates to container pixel coordinates
                                  const scaleX = svgRect.width / width;
                                  const scaleY = svgRect.height / height;
                                  const x = (point.x + padding.left) * scaleX;
                                  const y = (point.y + padding.top) * scaleY;
                                  setHoveredPoint({
                                    rating: point.rating,
                                    date: point.date,
                                    x,
                                    y,
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                            {/* Larger hover area for easier interaction */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="8"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={(e) => {
                                const svg = e.currentTarget.ownerSVGElement;
                                if (svg) {
                                  const svgRect = svg.getBoundingClientRect();
                                  // Convert SVG viewBox coordinates to container pixel coordinates
                                  const scaleX = svgRect.width / width;
                                  const scaleY = svgRect.height / height;
                                  const x = (point.x + padding.left) * scaleX;
                                  const y = (point.y + padding.top) * scaleY;
                                  setHoveredPoint({
                                    rating: point.rating,
                                    date: point.date,
                                    x,
                                    y,
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {xLabels.map((label, idx) => {
                          const x =
                            (label.index / (history.length - 1 || 1)) *
                            chartWidth;
                          return (
                            <text
                              key={idx}
                              x={x}
                              y={chartHeight + 20}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#6b7280"
                            >
                              {formatChartDate(label.date)}
                            </text>
                          );
                        })}
                      </g>
                    </svg>
                    {/* Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute bg-gray-900 text-white text-xs rounded-md px-2 py-1.5 shadow-lg pointer-events-none z-10 whitespace-nowrap"
                        style={{
                          left: `${hoveredPoint.x}px`,
                          top: `${hoveredPoint.y}px`,
                          transform: "translate(-50%, calc(-100% - 8px))",
                        }}
                      >
                        <div className="font-semibold">
                          Rating: {Math.floor(hoveredPoint.rating)}
                        </div>
                        {hoveredPoint.date &&
                          hoveredPoint.date.trim() !== "" && (
                            <div className="text-gray-300">
                              {formatDate(hoveredPoint.date)}
                            </div>
                          )}
                        {/* Arrow */}
                        <div
                          className="absolute left-1/2 top-full -translate-x-1/2"
                          style={{
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderTop: "6px solid #111827",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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
                className="block"
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
                className="block"
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
                    className="group border-b border-gray-200 p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      router.push(`/players/${nameToSlug(partner.name)}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/players/${nameToSlug(partner.name)}`}
                        className="text-lg font-semibold text-blue-600 group-hover:text-blue-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
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
                        <span className="text-gray-500">WR:</span>{" "}
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded text-center inline-block w-[70px] ${getWinRateBadgeClasses(
                            partner.winRate
                          )}`}
                        >
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
                      Pair Rating
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
                        className="group border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => {
                          router.push(`/players/${nameToSlug(partner.name)}`);
                        }}
                      >
                        <td className="py-2 px-4">
                          <Link
                            href={`/players/${nameToSlug(partner.name)}`}
                            className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
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
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 text-sm font-semibold rounded text-center w-[70px] ${getWinRateBadgeClasses(
                              partner.winRate
                            )}`}
                          >
                            {partner.winRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Opponents */}
        {data.opponents?.all && data.opponents.all.length > 0 && (
          <div className="bg-white rounded-md py-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 px-6">
              All Opponents
            </h2>

            {/* Mobile view - cards */}
            <div className="md:hidden space-y-0 px-3">
              {[...data.opponents.all]
                .sort((a, b) => {
                  let comparison = 0;
                  if (opponentSortBy === "rating") {
                    comparison = a.rating - b.rating;
                  } else if (opponentSortBy === "games") {
                    comparison = a.games - b.games;
                  } else if (opponentSortBy === "winRate") {
                    comparison = a.winRate - b.winRate;
                  }
                  return opponentSortOrder === "asc" ? comparison : -comparison;
                })
                .map((opponent) => (
                  <div
                    key={opponent.id}
                    className="group border-b border-gray-200 p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      router.push(`/players/${nameToSlug(opponent.name)}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/players/${nameToSlug(opponent.name)}`}
                        className="text-lg font-semibold text-blue-600 group-hover:text-blue-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {opponent.name}
                      </Link>
                      <span className="text-xl font-bold text-gray-900">
                        {Math.floor(opponent.rating)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Games:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {opponent.games}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">W-L:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {opponent.wins}-{opponent.losses}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-gray-500">WR:</span>{" "}
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded text-center inline-block w-[70px] ${getWinRateBadgeClasses(
                            opponent.winRate
                          )}`}
                        >
                          {opponent.winRate.toFixed(1)}%
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
                      Opponent
                    </th>
                    <th
                      className="text-left py-2 px-4 text-gray-700 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => {
                        if (opponentSortBy === "rating") {
                          setOpponentSortOrder(
                            opponentSortOrder === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setOpponentSortBy("rating");
                          setOpponentSortOrder("desc");
                        }
                      }}
                    >
                      Rating
                      <span className="ml-1">
                        {opponentSortBy === "rating" ? (
                          opponentSortOrder === "asc" ? (
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
                        if (opponentSortBy === "games") {
                          setOpponentSortOrder(
                            opponentSortOrder === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setOpponentSortBy("games");
                          setOpponentSortOrder("desc");
                        }
                      }}
                    >
                      Games
                      <span className="ml-1">
                        {opponentSortBy === "games" ? (
                          opponentSortOrder === "asc" ? (
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
                        if (opponentSortBy === "winRate") {
                          setOpponentSortOrder(
                            opponentSortOrder === "asc" ? "desc" : "asc"
                          );
                        } else {
                          setOpponentSortBy("winRate");
                          setOpponentSortOrder("desc");
                        }
                      }}
                    >
                      Win Rate
                      <span className="ml-1">
                        {opponentSortBy === "winRate" ? (
                          opponentSortOrder === "asc" ? (
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
                  {[...data.opponents.all]
                    .sort((a, b) => {
                      let comparison = 0;
                      if (opponentSortBy === "rating") {
                        comparison = a.rating - b.rating;
                      } else if (opponentSortBy === "games") {
                        comparison = a.games - b.games;
                      } else if (opponentSortBy === "winRate") {
                        comparison = a.winRate - b.winRate;
                      }
                      return opponentSortOrder === "asc"
                        ? comparison
                        : -comparison;
                    })
                    .map((opponent) => (
                      <tr
                        key={opponent.id}
                        className="group border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => {
                          router.push(`/players/${nameToSlug(opponent.name)}`);
                        }}
                      >
                        <td className="py-2 px-4">
                          <Link
                            href={`/players/${nameToSlug(opponent.name)}`}
                            className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {opponent.name}
                          </Link>
                        </td>
                        <td className="py-2 px-4 text-left text-gray-900">
                          {Math.floor(opponent.rating)}
                        </td>
                        <td className="py-2 px-4 text-center text-gray-900">
                          {opponent.games}
                        </td>
                        <td className="py-2 px-4 text-center text-gray-900">
                          {opponent.wins}-{opponent.losses}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 text-sm font-semibold rounded text-center w-[70px] ${getWinRateBadgeClasses(
                              opponent.winRate
                            )}`}
                          >
                            {opponent.winRate.toFixed(1)}%
                          </span>
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
                          className={`flex items-stretch pb-3 ${
                            isLastMatch && totalPages > 1
                              ? ""
                              : "border-b border-gray-200"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center min-w-8 mr-4 ${
                              won
                                ? "bg-green-50 text-green-800"
                                : "bg-red-50 text-red-800"
                            }`}
                          >
                            <span className="text-xl font-bold">
                              {won ? "W" : "L"}
                            </span>
                          </div>
                          <div className="flex-1 flex items-start justify-between">
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
                                      className="text-blue-600"
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
                                      className="text-blue-600"
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
