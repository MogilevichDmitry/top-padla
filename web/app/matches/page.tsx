"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useInfiniteMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { useRatings } from "@/hooks/useRatings";
import { nameToSlug } from "@/lib/utils";
import Loading from "@/components/Loading";

interface Match {
  id: number;
  date: string;
  type: "to6" | "to4" | "to3";
  team_a: number[];
  team_b: number[];
  score_a: number;
  score_b: number;
  created_by: number | null;
  rating_changes?: { [playerId: number]: number };
}

export default function MatchesPage() {
  const { data: players = [] } = usePlayers();
  const { data: ratings = [] } = useRatings();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState<string>("");
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [previousMatchesCache, setPreviousMatchesCache] = useState<
    Map<number, { matches: Match[]; count: number }>
  >(new Map());
  const [loadingPreviousMatches, setLoadingPreviousMatches] = useState<
    Set<number>
  >(new Set());
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteMatches(50);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Create a map of playerId -> rank for quick lookup
  const playerRankMap = useMemo(() => {
    const map = new Map<number, number>();
    ratings.forEach((player, index) => {
      map.set(player.id, index + 1);
    });
    return map;
  }, [ratings]);

  // Check admin status
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => setIsAdmin(Boolean(res?.admin)))
      .catch(() => setIsAdmin(false));
  }, []);

  // Check if match can be deleted (last 20 matches and not older than 2 weeks)
  function canDeleteMatch(match: Match, index: number): boolean {
    if (index >= 20) return false; // Only last 20 matches
    const matchDate = new Date(match.date);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return matchDate >= twoWeeksAgo;
  }

  // Check if two teams have the same players (order doesn't matter)
  function teamsMatch(team1: number[], team2: number[]): boolean {
    if (team1.length !== team2.length) return false;
    const sorted1 = [...team1].sort((a, b) => a - b);
    const sorted2 = [...team2].sort((a, b) => a - b);
    return sorted1.every((id, idx) => id === sorted2[idx]);
  }

  // Find matches with the same team composition (only previous matches)
  // This function now uses cached data from API if available, otherwise returns empty array
  function findSameCompositionMatches(currentMatch: Match): Match[] {
    const cached = previousMatchesCache.get(currentMatch.id);
    return cached?.matches || [];
  }

  // Load previous matches from API
  async function loadPreviousMatches(matchId: number) {
    // Don't reload if already cached or loading
    if (
      previousMatchesCache.has(matchId) ||
      loadingPreviousMatches.has(matchId)
    ) {
      return;
    }

    setLoadingPreviousMatches((prev) => new Set(prev).add(matchId));

    try {
      const res = await fetch(`/api/matches/${matchId}/previous`);
      if (!res.ok) throw new Error("Failed to load previous matches");
      const data = await res.json();
      setPreviousMatchesCache((prev) => {
        const next = new Map(prev);
        next.set(matchId, {
          matches: data.previousMatches || [],
          count: data.count || 0,
        });
        return next;
      });
    } catch (error) {
      console.error("Error loading previous matches:", error);
      // Set empty result on error
      setPreviousMatchesCache((prev) => {
        const next = new Map(prev);
        next.set(matchId, { matches: [], count: 0 });
        return next;
      });
    } finally {
      setLoadingPreviousMatches((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function toggleMatchExpansion(matchId: number) {
    const wasExpanded = expandedMatchId === matchId;
    setExpandedMatchId(wasExpanded ? null : matchId);

    // Load previous matches when expanding (if not already loaded)
    if (!wasExpanded) {
      await loadPreviousMatches(matchId);
    }
  }

  async function handleDeleteMatch(id: number) {
    if (!isAdmin || deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/matches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete match");
      }
      // Invalidate queries so UI refreshes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["matches", "infinite"] }),
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["pairs"] }),
        queryClient.invalidateQueries({ queryKey: ["ratings"] }),
        queryClient.invalidateQueries({ queryKey: ["playerStats"] }),
      ]);
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error ? e.message : "Failed to delete match. Try again."
      );
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setConfirmId(null);
      setConfirmText("");
    }
  }

  function openConfirm(id: number) {
    setConfirmId(id);
    setConfirmText("");
  }
  function closeConfirm() {
    setConfirmId(null);
    setConfirmText("");
  }

  // Flatten all matches from all pages
  const allMatches = useMemo(() => {
    return data?.pages.flatMap((page) => page.matches) ?? [];
  }, [data]);

  // Add player names to matches
  const matchesWithNames = useMemo(() => {
    const getPlayerName = (playerId: number): string => {
      const player = players.find((p) => p.id === playerId);
      return player?.name || `Player ${playerId}`;
    };

    return allMatches.map((match: Match) => ({
      ...match,
      team_a_names: match.team_a.map((id) => getPlayerName(id)),
      team_b_names: match.team_b.map((id) => getPlayerName(id)),
    }));
  }, [allMatches, players]);

  // Load previous matches count for visible matches gradually
  useEffect(() => {
    // Load count for first 5 visible matches that don't have cached data
    const loadCountsForVisibleMatches = async () => {
      const matchIdsToLoad = matchesWithNames
        .filter((match) => !previousMatchesCache.has(match.id))
        .map((match) => match.id)
        .slice(0, 5); // Load max 5 at a time

      for (const matchId of matchIdsToLoad) {
        await loadPreviousMatches(matchId);
        // Small delay between requests to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    };

    if (matchesWithNames.length > 0) {
      // Delay initial load slightly to avoid blocking initial render
      const timer = setTimeout(() => {
        loadCountsForVisibleMatches();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchesWithNames.length]); // Reload when matches change

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getMatchTypeEmoji = (type: string) => {
    switch (type) {
      case "to6":
        return "🎾";
      case "to4":
        return "🏸";
      case "to3":
        return "🚀";
      default:
        return "🎾";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && matchesWithNames.length === 0) {
    return <Loading message="Loading matches..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
        <div className="bg-white border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-red-700 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-600 text-sm">
            {error instanceof Error ? error.message : String(error)}
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
            Match History
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            All matches sorted by date (newest first)
          </p>
        </header>

        <div className="space-y-2">
          {matchesWithNames.map((match, index) => {
            const teamAWon = match.score_a > match.score_b;
            // Calculate match number (newest first)
            // Use total from pagination if available, otherwise use current length
            const totalMatches =
              data?.pages[0]?.pagination?.total || matchesWithNames.length;
            const matchNumber = totalMatches - index;
            const isExpanded = expandedMatchId === match.id;
            const sameCompositionMatches = findSameCompositionMatches(match);
            const cached = previousMatchesCache.get(match.id);
            const previousCount = cached?.count;
            const hasHistory =
              previousCount !== undefined
                ? previousCount > 0
                : sameCompositionMatches.length > 0; // Show button if we have local matches or haven't checked yet
            const isLoadingPrevious = loadingPreviousMatches.has(match.id);

            // Calculate overall score summary including current match
            let teamAWins = 0;
            let teamBWins = 0;

            if (hasHistory) {
              // Add current match to the count
              if (teamAWon) {
                teamAWins++;
              } else {
                teamBWins++;
              }

              // Add previous matches
              for (const prevMatch of sameCompositionMatches) {
                // Check if teams are in the same order or swapped
                const sameOrder =
                  teamsMatch(prevMatch.team_a, match.team_a) &&
                  teamsMatch(prevMatch.team_b, match.team_b);

                if (sameOrder) {
                  // Teams are in the same order
                  if (prevMatch.score_a > prevMatch.score_b) {
                    teamAWins++;
                  } else {
                    teamBWins++;
                  }
                } else {
                  // Teams are swapped
                  if (prevMatch.score_a > prevMatch.score_b) {
                    teamBWins++; // prevMatch.team_a won, which is current match.team_b
                  } else {
                    teamAWins++; // prevMatch.team_b won, which is current match.team_a
                  }
                }
              }
            }

            return (
              <div
                key={match.id}
                onClick={() => hasHistory && toggleMatchExpansion(match.id)}
                className={`bg-white md:rounded-lg border transition-colors overflow-hidden ${
                  isExpanded
                    ? "border-blue-300 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                } ${hasHistory ? "cursor-pointer" : ""}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-500">
                      #{matchNumber}
                    </span>
                    <span className="text-base">
                      {getMatchTypeEmoji(match.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(match.date)}
                    </span>
                    {isAdmin && canDeleteMatch(match, index) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfirm(match.id);
                        }}
                        disabled={deletingIds.has(match.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          deletingIds.has(match.id)
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:bg-red-50 hover:text-red-700"
                        }`}
                        aria-label="Delete match"
                        title="Delete match"
                      >
                        {deletingIds.has(match.id) ? (
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Match Content */}
                <div className="p-4">
                  <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
                    {/* Team A */}
                    <div
                      className={`flex-1 text-left md:text-right md:pr-4 ${
                        teamAWon
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      <div className="space-y-0.5">
                        {match.team_a_names.map((name, idx) => {
                          const playerId = match.team_a[idx];
                          const delta = match.rating_changes?.[playerId] ?? 0;
                          const formatted =
                            delta !== 0 ? delta.toFixed(1) : null;
                          const rank = playerRankMap.get(playerId);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-start md:justify-end gap-1 text-sm md:text-sm lg:text-base ${
                                teamAWon ? "text-gray-900" : "text-gray-600"
                              }`}
                            >
                              <Link
                                href={`/players/${nameToSlug(name)}`}
                                className="hover:text-blue-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {name}
                              </Link>
                              {rank && (
                                <span className="text-xs text-gray-500 font-normal ml-0.5">
                                  #{rank}
                                </span>
                              )}
                              {formatted && (
                                <span
                                  className={`text-xs md:text-sm font-normal ${
                                    delta > 0
                                      ? "text-green-800 opacity-90"
                                      : "text-red-800 opacity-90"
                                  }`}
                                >
                                  ({delta > 0 ? `+${formatted}` : formatted})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-center shrink-0 px-2 md:px-6">
                      <div className="flex items-center gap-1 md:gap-3 px-2 md:px-3 py-1 md:py-2 bg-gray-50 rounded-lg">
                        <div
                          className={`text-xl md:text-3xl lg:text-4xl font-bold min-w-[24px] md:min-w-[32px] text-center ${
                            teamAWon ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {match.score_a}
                        </div>
                        <div className="text-gray-400 text-lg md:text-xl font-medium">
                          —
                        </div>
                        <div
                          className={`text-xl md:text-3xl lg:text-4xl font-bold min-w-[24px] md:min-w-[32px] text-center ${
                            !teamAWon ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {match.score_b}
                        </div>
                      </div>
                    </div>

                    {/* Team B */}
                    <div
                      className={`flex-1 text-right md:text-left md:pl-4 ${
                        !teamAWon
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      <div className="space-y-0.5">
                        {match.team_b_names.map((name, idx) => {
                          const playerId = match.team_b[idx];
                          const delta = match.rating_changes?.[playerId] ?? 0;
                          const formatted =
                            delta !== 0 ? delta.toFixed(1) : null;
                          const rank = playerRankMap.get(playerId);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-end md:justify-start gap-1 text-sm md:text-sm lg:text-base ${
                                !teamAWon ? "text-gray-900" : "text-gray-600"
                              }`}
                            >
                              <Link
                                href={`/players/${nameToSlug(name)}`}
                                className="hover:text-blue-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {name}
                              </Link>
                              {rank && (
                                <span className="text-xs text-gray-500 font-normal ml-0.5">
                                  #{rank}
                                </span>
                              )}
                              {formatted && (
                                <span
                                  className={`text-xs md:text-sm font-normal ${
                                    delta > 0
                                      ? "text-green-800 opacity-90"
                                      : "text-red-800 opacity-90"
                                  }`}
                                >
                                  ({delta > 0 ? `+${formatted}` : formatted})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previous matches button */}
                {(hasHistory || isLoadingPrevious) && (
                  <div className="px-4 pb-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMatchExpansion(match.id);
                      }}
                      disabled={isLoadingPrevious}
                      className="flex items-center justify-center gap-2 w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                      aria-label={
                        isExpanded
                          ? "Collapse match history"
                          : "Expand match history"
                      }
                      title={
                        isExpanded
                          ? "Hide previous matches"
                          : "Show previous matches"
                      }
                    >
                      <span>
                        {isLoadingPrevious
                          ? "..."
                          : previousCount !== undefined
                          ? previousCount
                          : sameCompositionMatches.length}{" "}
                        previous
                      </span>
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Previous Matches with Same Composition */}
                {isExpanded && hasHistory && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <div className="px-4 py-6">
                      {/* Head to Head Summary */}
                      <div className="flex flex-col items-center mb-8">
                        <div className="text-[12px] font-bold  text-gray-600 uppercase mb-4">
                          Head to Head
                        </div>
                        <div className="flex items-end justify-center gap-6 sm:gap-12 w-full max-w-lg">
                          {/* Team A */}
                          <div className="flex-1 text-right">
                            <div className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              {match.team_a_names.join(" + ")}
                            </div>
                            <div
                              className={`text-3xl sm:text-4xl font-bold leading-none ${
                                teamAWins > teamBWins
                                  ? "text-gray-900"
                                  : teamAWins < teamBWins
                                  ? "text-gray-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {teamAWins}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="pb-2 text-gray-400 text-2xl font-light">
                            —
                          </div>

                          {/* Team B */}
                          <div className="flex-1 text-left">
                            <div className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              {match.team_b_names.join(" + ")}
                            </div>
                            <div
                              className={`text-3xl sm:text-4xl font-bold leading-none ${
                                teamBWins > teamAWins
                                  ? "text-gray-900"
                                  : teamBWins < teamAWins
                                  ? "text-gray-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {teamBWins}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline Divider */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-px flex-1 bg-gray-300"></div>
                        <span className="text-[12px] font-bold text-gray-600 uppercase tracking-wider">
                          History ({sameCompositionMatches.length})
                        </span>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>

                      {/* Matches List */}
                      <div className="space-y-3">
                        {sameCompositionMatches.map((prevMatch) => {
                          const prevMatchWithNames = {
                            ...prevMatch,
                            team_a_names: prevMatch.team_a.map(
                              (id) =>
                                players.find((p) => p.id === id)?.name ||
                                `Player ${id}`
                            ),
                            team_b_names: prevMatch.team_b.map(
                              (id) =>
                                players.find((p) => p.id === id)?.name ||
                                `Player ${id}`
                            ),
                          };
                          const prevTeamAWon =
                            prevMatch.score_a > prevMatch.score_b;

                          // Simple date formatter for the list
                          const dateObj = new Date(prevMatch.date);
                          const dateStr = dateObj.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                          const yearStr = dateObj.getFullYear();

                          return (
                            <div
                              key={prevMatch.id}
                              className="bg-white rounded-xl border border-gray-100 p-2.5 sm:p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                            >
                              {/* Date & Type Header */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">
                                  {getMatchTypeEmoji(prevMatch.type)}
                                </span>
                                <span className="text-xs font-medium text-gray-700">
                                  {dateStr}, {yearStr}
                                </span>
                              </div>

                              {/* Match Details */}
                              <div className="flex items-center justify-between gap-2">
                                {/* Team A */}
                                <div
                                  className={`flex-1 text-right text-sm flex flex-col justify-center ${
                                    prevTeamAWon
                                      ? "text-gray-900 font-semibold"
                                      : "text-gray-500 font-normal"
                                  }`}
                                >
                                  {prevMatchWithNames.team_a_names.map(
                                    (name, i) => (
                                      <div
                                        key={i}
                                        className="leading-tight my-0.5"
                                      >
                                        {name}
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* Score */}
                                <div className="flex items-center justify-center px-2 sm:px-4">
                                  <div className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100 min-w-[80px] justify-center">
                                    <span
                                      className={`text-lg sm:text-xl font-bold ${
                                        prevTeamAWon
                                          ? "text-gray-900"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {prevMatch.score_a}
                                    </span>
                                    <span className="text-gray-400 text-sm font-light">
                                      -
                                    </span>
                                    <span
                                      className={`text-lg sm:text-xl font-bold ${
                                        !prevTeamAWon
                                          ? "text-gray-900"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {prevMatch.score_b}
                                    </span>
                                  </div>
                                </div>

                                {/* Team B */}
                                <div
                                  className={`flex-1 text-left text-sm flex flex-col justify-center ${
                                    !prevTeamAWon
                                      ? "text-gray-900 font-semibold"
                                      : "text-gray-400 font-normal"
                                  }`}
                                >
                                  {prevMatchWithNames.team_b_names.map(
                                    (name, i) => (
                                      <div
                                        key={i}
                                        className="leading-tight my-0.5"
                                      >
                                        {name}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="py-8">
          {isFetchingNextPage && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading more...</p>
            </div>
          )}
          {!hasNextPage && matchesWithNames.length > 0 && (
            <p className="text-center text-gray-500 text-sm">
              You reached the end of the match history.
            </p>
          )}
        </div>
      </div>
      {/* Confirm Delete Modal */}
      {isAdmin && confirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 shadow-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2
                id="confirm-delete-title"
                className="text-lg font-semibold text-gray-900"
              >
                Confirm deletion
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                To permanently delete this match, type{" "}
                <span className="font-semibold text-gray-900">delete</span> in
                the input below and press Delete.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type: delete"
                disabled={deletingIds.has(confirmId!)}
                className={`w-full border rounded-md px-3 py-2 text-gray-900 ${
                  deletingIds.has(confirmId!)
                    ? "bg-gray-100 border-gray-200"
                    : "border-gray-300"
                }`}
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deletingIds.has(confirmId!)}
                className={`px-3 py-2 text-sm rounded-md border ${
                  deletingIds.has(confirmId!)
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmId !== null && handleDeleteMatch(confirmId)
                }
                disabled={
                  confirmText.trim().toLowerCase() !== "delete" ||
                  deletingIds.has(confirmId!)
                }
                className={`px-3 py-2 text-sm rounded-md border inline-flex items-center gap-2 ${
                  confirmText.trim().toLowerCase() !== "delete" ||
                  deletingIds.has(confirmId!)
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-white bg-red-600 border-red-600 hover:bg-red-700"
                }`}
              >
                {deletingIds.has(confirmId!) && (
                  <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                )}
                {deletingIds.has(confirmId!) ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
