"use client";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Help & Guide
          </h1>
          <p className="text-gray-600">Learn how the rating system works</p>
        </header>

        <div className="space-y-6">
          {/* Rating System */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📊 Rating System
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  How It Works
                </h3>
                <p>
                  Top Padla uses a modified Elo rating system (similar to chess)
                  to calculate player ratings. Your rating changes after each
                  match based on:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>
                    <strong>Opponent strength:</strong> Beating stronger players
                    gives more points
                  </li>
                  <li>
                    <strong>Score margin:</strong> Winning 6-0 gives more points
                    than 6-4
                  </li>
                  <li>
                    <strong>Match type:</strong> Different formats have
                    different point multipliers
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Starting Rating
                </h3>
                <p>
                  All players start with <strong>1000 points</strong>. Ratings
                  increase or decrease after each match.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Time Window
                </h3>
                <p>
                  Only matches from the last <strong>182 days</strong> (6
                  months) are considered for rating calculations. Older matches
                  don't affect your current rating, allowing it to adapt to your
                  current form.
                </p>
              </div>
            </div>
          </div>

          {/* Match Types */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎾 Match Types
            </h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🎾</span>
                <div>
                  <h3 className="font-semibold text-gray-900">To 6 Points</h3>
                  <p className="text-sm">
                    Full rating effect (100%). Valid scores: 6-0, 6-1, 6-2, 6-3,
                    6-4, 7-6 (tiebreak)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🏸</span>
                <div>
                  <h3 className="font-semibold text-gray-900">To 4 Points</h3>
                  <p className="text-sm">
                    80% rating effect. Valid scores: 4-0, 4-1, 4-2, 4-3, 5-4
                    (tiebreak)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold text-gray-900">To 3 Points</h3>
                  <p className="text-sm">
                    70% rating effect. Valid scores: 3-0, 3-1, 3-2, 4-3
                    (tiebreak)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Calculation */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🧮 Rating Calculation Formula
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  1. Expected Result (E)
                </h3>
                <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2">
                  E = 1 / (1 + 10^((opponent_rating - your_rating) / 400))
                </p>
                <p className="text-sm">
                  This calculates the probability of winning based on rating
                  difference.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  2. Actual Result (S)
                </h3>
                <p className="text-sm mb-2">
                  Based on the score difference, normalized by match type:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Win 6-0: S = 0.8 (maximum)</li>
                  <li>Win 6-3: S = 0.65</li>
                  <li>Win 6-5: S = 0.55</li>
                  <li>Lose 3-6: S = 0.35</li>
                  <li>Lose 0-6: S = 0.2 (minimum)</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Score influence is reduced by 40% (margin factor = 0.3) for
                  all match types
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  3. Rating Change (Δ)
                </h3>
                <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2">
                  Δ = K × L × (S - E)
                </p>
                <p className="text-sm">
                  Where:
                  <br />• K = 28 (base factor)
                  <br />• L = match type multiplier (1.0, 0.8, or 0.7)
                  <br />• S = actual result (0.2 to 0.8)
                  <br />• E = expected result (0 to 1)
                </p>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📈 Examples
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Example 1: Equal Teams
                </h3>
                <p className="text-sm">
                  Two teams with rating 1000 play each other. Expected result: E
                  = 0.5 (50% chance each).
                </p>
                <p className="text-sm mt-2">
                  If you win 6-3: S = 0.65, so Δ = 28 × 1.0 × (0.65 - 0.5) =
                  <strong> +4.2 points</strong>
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Example 2: Underdog Wins
                </h3>
                <p className="text-sm">
                  Your team (900) beats stronger team (1100). Expected result: E
                  = 0.24 (24% chance).
                </p>
                <p className="text-sm mt-2">
                  If you win 6-3: S = 0.65, so Δ = 28 × 1.0 × (0.65 - 0.24) =
                  <strong> +11.5 points</strong> (big bonus!)
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Example 3: Favorite Barely Wins
                </h3>
                <p className="text-sm">
                  Your team (1100) barely beats weaker team (900). Expected
                  result: E = 0.76 (76% chance).
                </p>
                <p className="text-sm mt-2">
                  If you win 6-5: S = 0.55, so Δ = 28 × 1.0 × (0.55 - 0.76) =
                  <strong> -5.9 points</strong> (you lose points!)
                </p>
              </div>
            </div>
          </div>

          {/* Pages */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📱 Pages Guide
            </h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900">🏆 Standings</h3>
                <p className="text-sm">
                  Current player rankings sorted by rating. Shows matches, W-L
                  record, and win rate.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">🎾 Matches</h3>
                <p className="text-sm">
                  Complete match history with infinite scroll. See all past
                  matches with scores and dates.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">👥 Players</h3>
                <p className="text-sm">
                  Detailed player statistics. Sort by rating, matches, or win
                  rate. See breakdown by match type.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">🤝 Pairs</h3>
                <p className="text-sm">
                  Team ratings and statistics. See how well different player
                  combinations perform together.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">📊 Records</h3>
                <p className="text-sm">
                  League records and achievements (coming soon).
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              💡 Tips to Improve Rating
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Play against stronger players:</strong> Even if you
                  lose, you'll lose fewer points. If you win, you get a big
                  bonus!
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Aim for decisive victories:</strong> Winning 6-0 gives
                  more points than 6-4.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Play regularly:</strong> Ratings are calculated from
                  the last 6 months, so consistent play keeps your rating
                  current.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Choose match type wisely:</strong> To6 gives full
                  points, while to3 gives only 70%.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
