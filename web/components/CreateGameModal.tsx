"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

async function createGame(data: {
  date: string;
  startTime: string;
  endTime: string | null;
  location: "Padel Point" | "Zawady";
  createdBy: string;
}) {
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create game");
  }
  return res.json();
}

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

  if (isNaN(date.getTime())) return "";

  const day = days[date.getDay()];
  const dayNum = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}, ${month} ${dayNum}, ${year}`;
}

export default function CreateGameModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateGameModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasEndTime, setHasEndTime] = useState(false);
  const [location, setLocation] = useState<"Padel Point" | "Zawady">(
    "Padel Point"
  );
  const [createdBy, setCreatedBy] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load saved name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("gameName");
    if (savedName) {
      setCreatedBy(savedName);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: createGame,
    onSuccess: (data) => {
      console.log("Game created successfully:", data);
      onSuccess();
      // Reset form
      setDate("");
      setStartTime("");
      setEndTime("");
      setHasEndTime(false);
      setLocation("Padel Point");
      setCreatedBy("");
      setError(null);
    },
    onError: (err: Error) => {
      console.error("Error creating game:", err);
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !startTime || !createdBy.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate that end time is after start time if provided
    if (hasEndTime && endTime && endTime <= startTime) {
      setError("End time must be after start time");
      return;
    }

    const trimmedName = createdBy.trim();

    // Save name to localStorage
    localStorage.setItem("gameName", trimmedName);

    const gameData = {
      date,
      startTime,
      endTime: hasEndTime && endTime ? endTime : null,
      location,
      createdBy: trimmedName,
    };

    console.log("Creating game with data:", gameData);
    mutation.mutate(gameData);
  };

  if (!isOpen) return null;

  const formattedDate = date ? formatDateWithDay(date) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Propose Game</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date with day of week preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {formattedDate && (
                <p className="mt-2 text-sm text-blue-600 font-medium">
                  📅 {formattedDate}
                </p>
              )}
            </div>

            {/* Start time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* End time (optional) */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={hasEndTime}
                  onChange={(e) => {
                    setHasEndTime(e.target.checked);
                    if (!e.target.checked) setEndTime("");
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Set end time
                </span>
              </label>
              {hasEndTime && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || undefined}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <select
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value as "Padel Point" | "Zawady")
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Padel Point">🎾 Padel Point</option>
                <option value="Zawady">🏓 Zawady</option>
              </select>
            </div>

            {/* Created by */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Enter your name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Creating..." : "Propose Game"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
