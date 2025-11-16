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
            return (
              <div
                key={match.id}
                className="bg-white md:rounded-lg border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
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
                        onClick={() => openConfirm(match.id)}
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
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Team A */}
                    <div
                      className={`flex-1 text-center md:text-right md:pr-4 ${
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
                              className={`flex items-center justify-end md:justify-end gap-1 text-sm md:text-base ${
                                teamAWon ? "text-gray-900" : "text-gray-600"
                              }`}
                            >
                              <Link
                                href={`/players/${nameToSlug(name)}`}
                                className="hover:text-blue-600 transition-colors"
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
                    <div className="flex items-center justify-center space-x-4 md:shrink-0 md:px-6">
                      <div
                        className={`text-3xl md:text-4xl font-bold ${
                          teamAWon ? "text-gray-900" : "text-gray-300"
                        }`}
                      >
                        {match.score_a}
                      </div>
                      <div className="text-gray-300 text-xl font-light">—</div>
                      <div
                        className={`text-3xl md:text-4xl font-bold ${
                          !teamAWon ? "text-gray-900" : "text-gray-300"
                        }`}
                      >
                        {match.score_b}
                      </div>
                    </div>

                    {/* Team B */}
                    <div
                      className={`flex-1 text-center md:text-left md:pl-4 ${
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
                              className={`flex items-center justify-start gap-1 text-sm md:text-base ${
                                !teamAWon ? "text-gray-900" : "text-gray-600"
                              }`}
                            >
                              <Link
                                href={`/players/${nameToSlug(name)}`}
                                className="hover:text-blue-600 transition-colors"
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
