"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/Button";
import MatchForm, { MatchFormData } from "@/components/MatchForm";

interface PlayerRow {
  id: number;
  name: string;
}

export default function ManagePage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [submittingPlayer, setSubmittingPlayer] = useState(false);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [recomputingPairs, setRecomputingPairs] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Add Player form
  const [playerName, setPlayerName] = useState("");
  const [playerTgId, setPlayerTgId] = useState<string>("");

  // Add Match form data
  const [matchFormData, setMatchFormData] = useState<MatchFormData>({
    type: "to6",
    teamA1: "",
    teamA2: "",
    teamB1: "",
    teamB2: "",
    scoreA: "",
    scoreB: "",
  });

  useEffect(() => {
    async function init() {
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        setIsAdmin(Boolean(me?.admin));
        if (me?.admin) {
          const rows = await fetch("/api/players").then((r) => r.json());
          if (Array.isArray(rows)) {
            setPlayers(rows);
          }
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const canSubmitMatch = useMemo(() => {
    const { teamA1, teamA2, teamB1, teamB2, scoreA, scoreB } = matchFormData;
    if ([teamA1, teamA2, teamB1, teamB2].some((v) => v === "")) return false;
    if (scoreA === "" || scoreB === "") return false;
    const ids = [teamA1, teamA2, teamB1, teamB2] as number[];
    const setIds = new Set(ids);
    return setIds.size === 4;
  }, [matchFormData]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const name = playerName.trim();
    if (!name) {
      setPlayerError("Name is required");
      return;
    }
    try {
      setSubmittingPlayer(true);
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tg_id: playerTgId ? Number(playerTgId) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create player");
      }
      setNotify({ text: "Player created", type: "success" });
      setPlayerError(null);
      setPlayerName("");
      setPlayerTgId("");
      const rows = await fetch("/api/players").then((r) => r.json());
      if (Array.isArray(rows)) setPlayers(rows);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error";
      setPlayerError(message);
    } finally {
      setSubmittingPlayer(false);
      setTimeout(() => setNotify(null), 6000);
    }
  }

  async function addMatch(data: MatchFormData) {
    if (!canSubmitMatch) {
      setMatchError("Pick 4 different players and enter both scores");
      return;
    }
    try {
      setSubmittingMatch(true);
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString(),
          type: data.type,
          team_a: [data.teamA1, data.teamA2] as number[],
          team_b: [data.teamB1, data.teamB2] as number[],
          score_a: data.scoreA === "" ? 0 : Number(data.scoreA),
          score_b: data.scoreB === "" ? 0 : Number(data.scoreB),
          created_by: null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to create match");
      }
      setNotify({ text: "Match created", type: "success" });
      setMatchError(null);
      // Reset form but keep the match type
      const currentType = data.type;
      setFormKey((prev) => prev + 1);
      setMatchFormData({
        type: currentType,
        teamA1: "",
        teamA2: "",
        teamB1: "",
        teamB2: "",
        scoreA: "",
        scoreB: "",
      });
      // Invalidate client caches so pages update immediately
      queryClient.invalidateQueries({ queryKey: ["pairs"] });
      queryClient.invalidateQueries({ queryKey: ["ratings"] });
      queryClient.invalidateQueries({ queryKey: ["playerStats"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["matches", "infinite"] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error";
      setMatchError(message);
    } finally {
      setSubmittingMatch(false);
      setTimeout(() => setNotify(null), 6000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage</h1>
            <p className="text-gray-600">
              You need to be logged in as admin. Use the Login button in the
              sidebar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Add Match - moved to top for mobile-first quick entry */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Match</h2>
          <MatchForm
            key={formKey}
            players={players}
            onSubmit={addMatch}
            onChange={setMatchFormData}
            initialData={{ type: matchFormData.type }}
            submitButtonText="Save"
            isSubmitting={submittingMatch}
            error={matchError}
          />
        </div>

        {/* Add Player - moved to bottom */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Player</h2>
          <form
            onSubmit={addPlayer}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Telegram ID (optional)
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={playerTgId}
                onChange={(e) => setPlayerTgId(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-between">
              <p className="text-sm text-red-600">{playerError}</p>
              <Button type="submit" disabled={submittingPlayer}>
                {submittingPlayer ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>

        {/* Admin Actions */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Recompute all pair ratings from match history. Use this if pairs are not updating correctly after adding matches.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setRecomputingPairs(true);
                    const res = await fetch("/api/pairs", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data?.error || "Failed to recompute pairs");
                    }
                    setNotify({ text: "Pairs recomputed successfully", type: "success" });
                    // Invalidate caches
                    queryClient.invalidateQueries({ queryKey: ["pairs"] });
                    queryClient.invalidateQueries({ queryKey: ["ratings"] });
                    queryClient.invalidateQueries({ queryKey: ["playerStats"] });
                  } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : "Error";
                    setNotify({ text: message, type: "error" });
                  } finally {
                    setRecomputingPairs(false);
                    setTimeout(() => setNotify(null), 6000);
                  }
                }}
                disabled={recomputingPairs}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {recomputingPairs ? "Recomputing..." : "Recompute Pairs"}
              </button>
            </div>
          </div>
        </div>

        {notify && (
          <div
            className={`fixed top-4 right-4 z-50 ${
              notify.type === "success" ? "bg-green-600" : "bg-red-600"
            } text-white text-base px-5 py-3 rounded-lg shadow-lg`}
          >
            {notify.text}
          </div>
        )}
      </div>
    </div>
  );
}
