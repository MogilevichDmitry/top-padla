"use client";

import { useState, useMemo } from "react";
import { usePlayers } from "@/hooks/usePlayers";
import { useRatings } from "@/hooks/useRatings";
import Loading from "@/components/Loading";
import MatchForm, { MatchFormData } from "@/components/MatchForm";
import {
  expected,
  actualS,
  getLByType,
  getTByType,
} from "@/lib/rating";

const K_BASE = 28;

interface SimulationResult {
  playerId: number;
  playerName: string;
  currentRating: number;
  newRating: number;
  change: number;
}

export default function SimulatorPage() {
  const { data: players = [], isLoading: playersLoading } = usePlayers();
  const { data: ratings = [], isLoading: ratingsLoading } = useRatings();

  const [formData, setFormData] = useState<MatchFormData>({
    type: "to6",
    teamA1: "",
    teamA2: "",
    teamB1: "",
    teamB2: "",
    scoreA: "",
    scoreB: "",
  });

  const isLoading = playersLoading || ratingsLoading;

  // Create rating map
  const ratingMap = useMemo(() => {
    const map = new Map<number, number>();
    ratings.forEach((player) => {
      map.set(player.id, player.rating);
    });
    return map;
  }, [ratings]);

  // Calculate simulation
  const simulation = useMemo((): SimulationResult[] | null => {
    const { teamA1, teamA2, teamB1, teamB2, scoreA, scoreB, type } = formData;
    
    if (!teamA1 || !teamA2 || !teamB1 || !teamB2) return null;
    if (!scoreA || !scoreB) return null;

    const scoreAInt = parseInt(scoreA);
    const scoreBInt = parseInt(scoreB);

    if (isNaN(scoreAInt) || isNaN(scoreBInt)) return null;
    if (scoreAInt < 0 || scoreBInt < 0) return null;

    // Get current ratings
    const rA1 = ratingMap.get(teamA1) || 1000;
    const rA2 = ratingMap.get(teamA2) || 1000;
    const rB1 = ratingMap.get(teamB1) || 1000;
    const rB2 = ratingMap.get(teamB2) || 1000;

    // Calculate team ratings
    const rA = (rA1 + rA2) / 2.0;
    const rB = (rB1 + rB2) / 2.0;

    // Calculate expected result
    const E = expected(rA, rB);

    // Calculate actual result based on score
    const T = getTByType(type);
    const S = actualS(scoreAInt, scoreBInt, T, type);

    // Calculate rating change
    const L = getLByType(type);
    const deltaTeam = K_BASE * L * (S - E);

    // Get player names
    const getPlayerName = (id: number) => {
      return players.find((p) => p.id === id)?.name || `Player ${id}`;
    };

    return [
      {
        playerId: teamA1,
        playerName: getPlayerName(teamA1),
        currentRating: rA1,
        newRating: rA1 + deltaTeam,
        change: deltaTeam,
      },
      {
        playerId: teamA2,
        playerName: getPlayerName(teamA2),
        currentRating: rA2,
        newRating: rA2 + deltaTeam,
        change: deltaTeam,
      },
      {
        playerId: teamB1,
        playerName: getPlayerName(teamB1),
        currentRating: rB1,
        newRating: rB1 - deltaTeam,
        change: -deltaTeam,
      },
      {
        playerId: teamB2,
        playerName: getPlayerName(teamB2),
        currentRating: rB2,
        newRating: rB2 - deltaTeam,
        change: -deltaTeam,
      },
    ];
  }, [formData, ratingMap, players]);

  // Calculate expected win probability
  const expectedWinProbability = useMemo(() => {
    const { teamA1, teamA2, teamB1, teamB2 } = formData;
    
    if (!teamA1 || !teamA2 || !teamB1 || !teamB2) return null;

    const rA1 = ratingMap.get(teamA1) || 1000;
    const rA2 = ratingMap.get(teamA2) || 1000;
    const rB1 = ratingMap.get(teamB1) || 1000;
    const rB2 = ratingMap.get(teamB2) || 1000;

    const rA = (rA1 + rA2) / 2.0;
    const rB = (rB1 + rB2) / 2.0;

    return expected(rA, rB) * 100;
  }, [formData, ratingMap]);

  if (isLoading) {
    return <Loading message="Loading players and ratings..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 px-4 md:py-12 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-100">
          <div className="bg-gradient-to-r from-blue-900 to-orange-800 p-6 md:p-8">
            <h1 className="text-white text-3xl font-bold mb-2">
              Match Simulator
            </h1>
            <p className="text-gray-200 text-sm">
              "What if" — simulate match results and predict rating changes
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Match Form */}
            <MatchForm
              players={players}
              ratings={ratingMap}
              onChange={setFormData}
              initialData={formData}
              showRatings={true}
            />

            {/* Expected Win Probability */}
            {expectedWinProbability !== null && formData.teamA1 && formData.teamA2 && formData.teamB1 && formData.teamB2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Expected Win Probability (Team A):
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {expectedWinProbability.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Simulation Results */}
            {simulation && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Rating Changes Prediction
                </h2>
                <div className="space-y-3">
                  {simulation.map((result) => (
                    <div
                      key={result.playerId}
                      className={`p-4 rounded-lg border ${
                        result.change > 0
                          ? "bg-green-50 border-green-200"
                          : result.change < 0
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {result.playerName}
                          </div>
                          <div className="text-sm text-gray-600">
                            Current: {Math.floor(result.currentRating)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              result.change > 0
                                ? "text-green-700"
                                : result.change < 0
                                ? "text-red-700"
                                : "text-gray-700"
                            }`}
                          >
                            {result.change > 0 ? "+" : ""}
                            {result.change.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">
                            New: {Math.floor(result.newRating)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

