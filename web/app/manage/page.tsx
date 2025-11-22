"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/Button";

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

  // Add Player form
  const [playerName, setPlayerName] = useState("");
  const [playerTgId, setPlayerTgId] = useState<string>("");

  // Add Match form
  const [type, setType] = useState<"to6" | "to4" | "to3">("to6");
  const [a1, setA1] = useState<number | "">("");
  const [a2, setA2] = useState<number | "">("");
  const [b1, setB1] = useState<number | "">("");
  const [b2, setB2] = useState<number | "">("");
  const [sa, setSa] = useState<string>("");
  const [sb, setSb] = useState<string>("");

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
    if ([a1, a2, b1, b2].some((v) => v === "")) return false;
    if (sa === "" || sb === "") return false;
    const ids = [a1, a2, b1, b2] as number[];
    const setIds = new Set(ids);
    return setIds.size === 4;
  }, [a1, a2, b1, b2, sa, sb]);

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

  async function addMatch(e: React.FormEvent) {
    e.preventDefault();
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
          type,
          team_a: [a1, a2],
          team_b: [b1, b2],
          score_a: sa === "" ? 0 : Number(sa),
          score_b: sb === "" ? 0 : Number(sb),
          created_by: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create match");
      }
      setNotify({ text: "Match created", type: "success" });
      setMatchError(null);
      setA1("");
      setA2("");
      setB1("");
      setB2("");
      setSa("");
      setSb("");
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
          <form onSubmit={addMatch} className="space-y-4">
            {/* Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Type
              </label>
              <div
                role="tablist"
                aria-label="Match type"
                className="inline-flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 border border-gray-200"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={type === "to3"}
                  onClick={() => setType("to3")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    type === "to3"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">🚀</span>
                  <span className="text-sm">TO3</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={type === "to4"}
                  onClick={() => setType("to4")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    type === "to4"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">🏸</span>
                  <span className="text-sm">TO4</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={type === "to6"}
                  onClick={() => setType("to6")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    type === "to6"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">🎾</span>
                  <span className="text-sm">TO6</span>
                </button>
              </div>
            </div>

            {/* Team A Section */}
            <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Team A
                </h3>
                <div className="flex-1"></div>
                <label className="text-sm text-gray-600">Score</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="w-16 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-center appearance-none font-semibold text-lg"
                  value={sa}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setSa(onlyDigits);
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
                  value={a1}
                  onChange={(e) => setA1(Number(e.target.value))}
                >
                  <option value="">Player 1</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
                  value={a2}
                  onChange={(e) => setA2(Number(e.target.value))}
                >
                  <option value="">Player 2</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
                <h3 className="text-base font-semibold text-gray-900">
                  Team B
                </h3>
                <div className="flex-1"></div>
                <label className="text-sm text-gray-600">Score</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="w-16 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-center appearance-none font-semibold text-lg"
                  value={sb}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setSb(onlyDigits);
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
                  value={b1}
                  onChange={(e) => setB1(Number(e.target.value))}
                >
                  <option value="">Player 1</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
                  value={b2}
                  onChange={(e) => setB2(Number(e.target.value))}
                >
                  <option value="">Player 2</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error and Submit */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-red-600">{matchError}</p>
              <Button type="submit" disabled={submittingMatch}>
                {submittingMatch ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
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
