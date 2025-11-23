"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Loading from "@/components/Loading";
import CreateGameModal from "@/components/CreateGameModal";
import AttendGameModal from "@/components/AttendGameModal";
import { GameSession } from "@/lib/db";
import { saveGameAttendanceCookie, canRemoveAttendee } from "@/lib/utils";

function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day = days[date.getDay()];
  const dayNum = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}, ${month} ${dayNum}, ${year}`;
}

function formatTime(timeString: string): string {
  return timeString.substring(0, 5); // HH:MM
}

async function fetchGames(): Promise<GameSession[]> {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

async function attendGame(
  gameId: number,
  name: string,
  status: "attending" | "declined" = "attending"
) {
  const res = await fetch(`/api/games/${gameId}/attend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, action: "add", status }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to attend game");
  }
  return res.json();
}

async function removeAttendee(gameId: number, name: string) {
  const res = await fetch(`/api/games/${gameId}/attend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, action: "remove" }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to remove attendee");
  }
  return res.json();
}

async function deleteGame(gameId: number) {
  const res = await fetch(`/api/games/${gameId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete game");
  }
  return res.json();
}

export default function GamesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSession | null>(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<GameSession | null>(null);
  const [attendStatus, setAttendStatus] = useState<"attending" | "declined">(
    "attending"
  );

  const queryClient = useQueryClient();

  // Check admin status and load saved name
  useEffect(() => {
    // Check admin
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me?.admin) {
          setIsAdmin(true);
        }
      })
      .catch(() => setIsAdmin(false));
  }, []);

  // Load saved name separately to avoid useEffect lint warning
  useEffect(() => {
    const savedName = localStorage.getItem("gameName");
    if (savedName) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setAttendeeName(savedName), 0);
    }
  }, []);

  const {
    data: games = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["games"],
    queryFn: fetchGames,
  });

  const attendMutation = useMutation({
    mutationFn: ({
      gameId,
      name,
      status,
    }: {
      gameId: number;
      name: string;
      status: "attending" | "declined";
    }) => attendGame(gameId, name, status),
    onSuccess: (_, variables) => {
      // Save to cookies: gameId and name, expires in 7 days
      saveGameAttendanceCookie(variables.gameId, variables.name, 7);
      queryClient.invalidateQueries({ queryKey: ["games"] });
      setShowAttendModal(false);
      setShowDeclineModal(false);
      // Don't clear name anymore - keep it for next time
      setSelectedGame(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ gameId, name }: { gameId: number; name: string }) =>
      removeAttendee(gameId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (gameId: number) => deleteGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      setShowDeleteModal(false);
      setGameToDelete(null);
    },
  });

  const handleAttendClick = (game: GameSession) => {
    setSelectedGame(game);
    setAttendStatus("attending");
    setShowAttendModal(true);
  };

  const handleDeclineClick = (game: GameSession) => {
    setSelectedGame(game);
    setAttendStatus("declined");
    setShowDeclineModal(true);
  };

  const handleAttendSubmit = () => {
    if (!attendeeName.trim() || !selectedGame) return;

    // Save name to localStorage
    const trimmedName = attendeeName.trim();
    localStorage.setItem("gameName", trimmedName);

    attendMutation.mutate({
      gameId: selectedGame.id,
      name: trimmedName,
      status: attendStatus,
    });
  };

  const handleRemoveAttendee = (game: GameSession, name: string) => {
    if (confirm(`Remove ${name} from the list?`)) {
      removeMutation.mutate({ gameId: game.id, name });
    }
  };

  const handleDeleteGame = (game: GameSession) => {
    setGameToDelete(game);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (gameToDelete) {
      deleteMutation.mutate(gameToDelete.id);
    }
  };

  if (isLoading) {
    return <Loading message="Loading games..." />;
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

  // Filter games: show upcoming games first, then past games
  // Use Warsaw time for consistency
  const now = new Date();
  // Create date object representing current time in Warsaw
  const warsawDateString = now.toLocaleString("en-US", {
    timeZone: "Europe/Warsaw",
  });
  const warsawTime = new Date(warsawDateString);

  // Format YYYY-MM-DD manually to avoid UTC shifts
  const year = warsawTime.getFullYear();
  const month = String(warsawTime.getMonth() + 1).padStart(2, "0");
  const day = String(warsawTime.getDate()).padStart(2, "0");
  const todayDate = `${year}-${month}-${day}`;

  // Calculate date one week ago
  const oneWeekAgo = new Date(warsawTime);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoYear = oneWeekAgo.getFullYear();
  const oneWeekAgoMonth = String(oneWeekAgo.getMonth() + 1).padStart(2, "0");
  const oneWeekAgoDay = String(oneWeekAgo.getDate()).padStart(2, "0");
  const oneWeekAgoDate = `${oneWeekAgoYear}-${oneWeekAgoMonth}-${oneWeekAgoDay}`;

  const currentHours = warsawTime.getHours();
  const currentMinutes = warsawTime.getMinutes();
  const currentTime = `${currentHours
    .toString()
    .padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;

  const isGamePast = (game: GameSession) => {
    if (game.date < todayDate) return true;
    if (game.date > todayDate) return false;

    // If date is today, check time
    // Use end_time if available, otherwise start_time + 2 hours (approx)
    const compareTime = game.end_time || game.start_time;
    return compareTime < currentTime;
  };

  const upcomingGames = games.filter((game) => !isGamePast(game));
  // Show only past games from the last week, sorted by most recent first
  const pastGames = games
    .filter((game) => isGamePast(game) && game.date >= oneWeekAgoDate)
    .sort((a, b) => {
      // Sort by date (descending - most recent first)
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      // If same date, sort by time (descending - most recent first)
      const timeA = a.end_time || a.start_time;
      const timeB = b.end_time || b.start_time;
      return timeB.localeCompare(timeA);
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-3 px-3 md:py-12 md:px-8 pt-16 md:pt-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Game Scheduling
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Propose a game or join an existing one
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold shadow-lg transition-colors text-sm md:text-base whitespace-nowrap self-start sm:self-auto"
          >
            ➕ Propose Game
          </button>
        </div>

        {upcomingGames.length === 0 && pastGames.length === 0 && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-6 md:p-12 text-center">
            <p className="text-gray-500 text-lg md:text-xl font-medium mb-4">
              No games scheduled yet
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold text-sm md:text-base"
            >
              Create First Game
            </button>
          </div>
        )}

        {upcomingGames.length === 0 && pastGames.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              Upcoming Games
            </h2>
            <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-6 md:p-8 text-center">
              <p className="text-gray-500 text-base md:text-lg font-medium">
                No upcoming games
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold text-sm md:text-base"
              >
                Propose Game
              </button>
            </div>
          </div>
        )}

        {upcomingGames.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              Upcoming Games
            </h2>
            <div className="space-y-3 md:space-y-4">
              {upcomingGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onAttendClick={handleAttendClick}
                  onDeclineClick={handleDeclineClick}
                  onRemoveAttendee={handleRemoveAttendee}
                  onDeleteGame={isAdmin ? handleDeleteGame : undefined}
                  isAdmin={isAdmin}
                  canRemoveAttendee={canRemoveAttendee}
                />
              ))}
            </div>
          </div>
        )}

        {pastGames.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              Past Games
            </h2>
            <div className="space-y-3 md:space-y-4">
              {pastGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onAttendClick={handleAttendClick}
                  onDeclineClick={handleDeclineClick}
                  onRemoveAttendee={handleRemoveAttendee}
                  onDeleteGame={isAdmin ? handleDeleteGame : undefined}
                  isPast={true}
                  isAdmin={isAdmin}
                  canRemoveAttendee={canRemoveAttendee}
                />
              ))}
            </div>
          </div>
        )}

        <CreateGameModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["games"] });
            setShowCreateModal(false);
          }}
        />

        <AttendGameModal
          isOpen={showAttendModal}
          onClose={() => {
            setShowAttendModal(false);
            setSelectedGame(null);
          }}
          onSubmit={handleAttendSubmit}
          name={attendeeName}
          onNameChange={setAttendeeName}
          isLoading={attendMutation.isPending}
          error={attendMutation.error?.message}
          title="Join Game"
          buttonText="I'm In ✋"
        />

        <AttendGameModal
          isOpen={showDeclineModal}
          onClose={() => {
            setShowDeclineModal(false);
            setSelectedGame(null);
          }}
          onSubmit={handleAttendSubmit}
          name={attendeeName}
          onNameChange={setAttendeeName}
          isLoading={attendMutation.isPending}
          error={attendMutation.error?.message}
          title="Pass This Time"
          buttonText="Pass"
          buttonColor="gray"
        />

        {/* Delete Game Confirmation Modal */}
        {showDeleteModal && gameToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Delete Game
                </h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this game?
                  <br />
                  <span className="font-semibold text-gray-900">
                    {formatDateWithDay(gameToDelete.date)} at{" "}
                    {formatTime(gameToDelete.start_time)}
                  </span>
                  <br />
                  <span className="text-sm text-gray-500">
                    Location: {gameToDelete.location}
                  </span>
                </p>
                {deleteMutation.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-600">
                      {deleteMutation.error.message}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setGameToDelete(null);
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Game"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  onAttendClick,
  onDeclineClick,
  onRemoveAttendee,
  onDeleteGame,
  isPast = false,
  isAdmin = false,
  canRemoveAttendee: canRemove,
}: {
  game: GameSession;
  onAttendClick: (game: GameSession) => void;
  onDeclineClick: (game: GameSession) => void;
  onRemoveAttendee: (game: GameSession, name: string) => void;
  onDeleteGame?: (game: GameSession) => void;
  isPast?: boolean;
  isAdmin?: boolean;
  canRemoveAttendee: (
    gameId: number,
    attendeeName: string,
    isAdmin: boolean
  ) => boolean;
}) {
  const allAttendees = game.attendees || [];
  const attendees = allAttendees.filter((a) => a.status === "attending");
  const declined = allAttendees.filter((a) => a.status === "declined");
  const locationEmoji = game.location === "Padel Point" ? "🎾" : "🏓";

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6 ${
        isPast ? "opacity-75" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <span className="text-xl md:text-2xl">{locationEmoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold text-gray-900">
                  {formatDateWithDay(game.date)}
                </h3>
                {isAdmin && onDeleteGame && (
                  <button
                    onClick={() => onDeleteGame(game)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete game"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm md:text-base text-gray-600">
                {formatTime(game.start_time)}
                {game.end_time && ` - ${formatTime(game.end_time)}`}
              </p>
            </div>
          </div>
          <p className="text-sm md:text-base text-gray-700 font-medium mb-1 md:mb-2">
            📍 {game.location}
          </p>
          <p className="text-xs md:text-sm text-gray-500">
            Created by: {game.created_by}
          </p>
        </div>

        {!isPast && (
          <div className="flex sm:flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => onAttendClick(game)}
              className="group relative flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-100 whitespace-nowrap"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>I&apos;m In</span>
                <span className="text-base transform group-hover:rotate-12 transition-transform duration-200">
                  ✋
                </span>
              </span>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
            </button>
            <button
              onClick={() => onDeclineClick(game)}
              className="group relative flex items-center justify-center gap-2 bg-gradient-to-br from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-100 whitespace-nowrap"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Pass</span>
                <span className="text-base transform group-hover:scale-110 transition-transform duration-200">
                  🚫
                </span>
              </span>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
            </button>
          </div>
        )}
      </div>

      {/* Attendees List */}
      {(attendees.length > 0 || declined.length > 0) && (
        <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-gray-100 space-y-4 md:space-y-5">
          {attendees.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-100"></span>
                Going ({attendees.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attendees.map((attendee) => {
                  const initial = attendee.name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={attendee.id}
                      className="group/badge relative flex items-center gap-2 bg-white pl-1 pr-3 py-1 rounded-full border border-green-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                        {initial}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {attendee.name}
                      </span>

                      {!isPast &&
                        canRemove(game.id, attendee.name, isAdmin) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAttendee(game, attendee.name);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-white text-red-500 rounded-full shadow-md border border-red-100 opacity-100 md:opacity-0 md:group-hover/badge:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50 hover:border-red-200"
                            title="Remove"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {declined.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300 ring-4 ring-gray-100"></span>
                Pass ({declined.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {declined.map((attendee) => {
                  const initial = attendee.name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={attendee.id}
                      className="group/badge relative flex items-center gap-2 bg-gray-50 pl-1 pr-3 py-1 rounded-full border border-gray-200 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {initial}
                      </div>
                      <span className="text-sm font-medium text-gray-500 decoration-gray-400">
                        {attendee.name}
                      </span>

                      {!isPast &&
                        canRemove(game.id, attendee.name, isAdmin) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAttendee(game, attendee.name);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-400 rounded-full shadow-md border border-gray-200 opacity-100 md:opacity-0 md:group-hover/badge:opacity-100 transition-opacity flex items-center justify-center hover:text-red-500 hover:bg-red-50 hover:border-red-200"
                            title="Remove"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
