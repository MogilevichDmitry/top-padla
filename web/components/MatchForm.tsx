"use client";

import { useState, useEffect } from "react";
import MatchTypeSelector from "./MatchTypeSelector";

interface Player {
  id: number;
  name: string;
}

interface MatchFormData {
  type: "to6" | "to4" | "to3";
  teamA1: number | "";
  teamA2: number | "";
  teamB1: number | "";
  teamB2: number | "";
  scoreA: string;
  scoreB: string;
}

interface MatchFormProps {
  players: Player[];
  ratings?: Map<number, number>;
  onSubmit?: (data: MatchFormData) => void | Promise<void>;
  onChange?: (data: MatchFormData) => void;
  showRatings?: boolean;
  initialData?: Partial<MatchFormData>;
  submitButtonText?: string;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function MatchForm({
  players,
  ratings,
  onSubmit,
  onChange,
  showRatings = false,
  initialData,
  submitButtonText = "Add Match",
  isSubmitting = false,
  error,
}: MatchFormProps) {
  const [type, setType] = useState<"to6" | "to4" | "to3">(
    initialData?.type || "to6"
  );
  const [teamA1, setTeamA1] = useState<number | "">(initialData?.teamA1 || "");
  const [teamA2, setTeamA2] = useState<number | "">(initialData?.teamA2 || "");
  const [teamB1, setTeamB1] = useState<number | "">(initialData?.teamB1 || "");
  const [teamB2, setTeamB2] = useState<number | "">(initialData?.teamB2 || "");
  const [scoreA, setScoreA] = useState<string>(initialData?.scoreA || "");
  const [scoreB, setScoreB] = useState<string>(initialData?.scoreB || "");

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || "to6");
      setTeamA1(initialData.teamA1 || "");
      setTeamA2(initialData.teamA2 || "");
      setTeamB1(initialData.teamB1 || "");
      setTeamB2(initialData.teamB2 || "");
      setScoreA(initialData.scoreA || "");
      setScoreB(initialData.scoreB || "");
    }
  }, [initialData]);

  // Call onChange when form data changes (but not on initial mount)
  useEffect(() => {
    if (onChange) {
      onChange({
        type,
        teamA1,
        teamA2,
        teamB1,
        teamB2,
        scoreA,
        scoreB,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, teamA1, teamA2, teamB1, teamB2, scoreA, scoreB]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        type,
        teamA1,
        teamA2,
        teamB1,
        teamB2,
        scoreA,
        scoreB,
      });
    }
  };

  const getPlayerRating = (playerId: number | ""): number | null => {
    if (!playerId || !ratings) return null;
    return ratings.get(playerId) || null;
  };

  const formatPlayerOption = (player: Player): string => {
    const rating = getPlayerRating(player.id);
    if (showRatings && rating !== null) {
      return `${player.name} (${Math.floor(rating)})`;
    }
    return player.name;
  };

  const filteredPlayersA1 = players.filter((p) => p.id !== teamA2);
  const filteredPlayersA2 = players.filter((p) => p.id !== teamA1);
  const filteredPlayersB1 = players.filter((p) => p.id !== teamB2);
  const filteredPlayersB2 = players.filter((p) => p.id !== teamB1);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Selector */}
      <MatchTypeSelector value={type} onChange={setType} />

      {/* Team A Section */}
      <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-semibold text-gray-900">Team A</h3>
          <div className="flex-1"></div>
          <label className="text-sm text-gray-600">Score</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            className="w-16 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-center appearance-none font-semibold text-lg"
            value={scoreA}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              setScoreA(onlyDigits);
            }}
            onKeyDown={(e) => {
              const allowed =
                [
                  "Backspace",
                  "Delete",
                  "Tab",
                  "ArrowLeft",
                  "ArrowRight",
                ].includes(e.key) || /^[0-9]$/.test(e.key);
              if (!allowed) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const txt = e.clipboardData.getData("text");
              if (!/^[0-9]*$/.test(txt)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="w-full border border-gray-300 rounded-md pl-3 pr-12 py-2 text-gray-900 bg-white appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
            }}
            value={teamA1}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : "";
              setTeamA1(value);
            }}
          >
            <option value="">Player 1</option>
            {filteredPlayersA1.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPlayerOption(p)}
              </option>
            ))}
          </select>
          <select
            className="w-full border border-gray-300 rounded-md pl-3 pr-12 py-2 text-gray-900 bg-white appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
            }}
            value={teamA2}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : "";
              setTeamA2(value);
            }}
          >
            <option value="">Player 2</option>
            {filteredPlayersA2.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPlayerOption(p)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VS Divider */}
      <div className="flex items-center justify-center py-1">
        <div className="h-px bg-gray-300 flex-1"></div>
        <span className="px-4 text-lg font-bold text-gray-500">VS</span>
        <div className="h-px bg-gray-300 flex-1"></div>
      </div>

      {/* Team B Section */}
      <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-semibold text-gray-900">Team B</h3>
          <div className="flex-1"></div>
          <label className="text-sm text-gray-600">Score</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            className="w-16 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-center appearance-none font-semibold text-lg"
            value={scoreB}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              setScoreB(onlyDigits);
            }}
            onKeyDown={(e) => {
              const allowed =
                [
                  "Backspace",
                  "Delete",
                  "Tab",
                  "ArrowLeft",
                  "ArrowRight",
                ].includes(e.key) || /^[0-9]$/.test(e.key);
              if (!allowed) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const txt = e.clipboardData.getData("text");
              if (!/^[0-9]*$/.test(txt)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="w-full border border-gray-300 rounded-md pl-3 pr-12 py-2 text-gray-900 bg-white appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
            }}
            value={teamB1}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : "";
              setTeamB1(value);
            }}
          >
            <option value="">Player 1</option>
            {filteredPlayersB1.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPlayerOption(p)}
              </option>
            ))}
          </select>
          <select
            className="w-full border border-gray-300 rounded-md pl-3 pr-12 py-2 text-gray-900 bg-white appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
            }}
            value={teamB2}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : "";
              setTeamB2(value);
            }}
          >
            <option value="">Player 2</option>
            {filteredPlayersB2.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPlayerOption(p)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      {onSubmit && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "Submitting..." : submitButtonText}
        </button>
      )}
    </form>
  );
}

// Export types for use in parent components
export type { MatchFormData };

