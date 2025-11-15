# Padel Rating Bot — Starter (Aiogram 3)

# --- main.py ---
import asyncio
import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton
from dotenv import load_dotenv

# ---------- Config ----------
load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is required in .env")

# Месяцы на русском
MONTHS_RU = {
    1: "января", 2: "февраля", 3: "марта", 4: "апреля",
    5: "мая", 6: "июня", 7: "июля", 8: "августа",
    9: "сентября", 10: "октября", 11: "ноября", 12: "декабря"
}


def format_date_ru(date_str: str) -> str:
    """Format date as 'день месяц год' (e.g., '15 января 2025')."""
    if not date_str:
        return ""
    try:
        dt_obj = datetime.fromisoformat(date_str)
        day = dt_obj.day
        month = MONTHS_RU.get(dt_obj.month, "")
        year = dt_obj.year
        return f"{day} {month} {year}"
    except:
        return date_str[:10]


TZ = os.getenv("TZ", "Europe/Warsaw")  # for display only
WINDOW_DAYS = 182
START_RATING = 1000.0
K_BASE = 28.0
L_TO6 = 1.0
L_TO4 = 0.8
L_TO3 = 0.7
MIN_MATCHES_FOR_RATING = 3
DATA_PATH = os.getenv("DATA_PATH", "data.json")

# ---------- Simple JSON storage (MVP) ----------

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

@dataclass
class Player:
    id: int
    name: str  # display name
    tg_id: int | None = None

@dataclass
class Match:
    id: int
    date: str  # ISO8601 (UTC)
    type: str  # 'to6' | 'to4' | 'to3'
    team_a: List[int]  # player ids
    team_b: List[int]
    score_a: int
    score_b: int
    created_by: int | None = None  # tg user id

@dataclass
class Pair:
    id: int
    player1_id: int
    player2_id: int
    rating: float
    matches: int
    wins: int
    losses: int

@dataclass
class DB:
    players: Dict[int, Player]
    matches: Dict[int, Match]
    pairs: Dict[int, Pair]  # New field for pair ratings
    next_player_id: int
    next_match_id: int
    next_pair_id: int

    @staticmethod
    def empty():
        return DB(players={}, matches={}, pairs={}, next_player_id=1, next_match_id=1, next_pair_id=1)


def read_db() -> DB:
    if not os.path.exists(DATA_PATH):
        return DB.empty()
    with open(DATA_PATH, "r") as f:
        raw = json.load(f)
    # reconstruct
    players = {int(k): Player(**v) for k, v in raw.get("players", {}).items()}
    matches = {int(k): Match(**v) for k, v in raw.get("matches", {}).items()}
    pairs = {int(k): Pair(**v) for k, v in raw.get("pairs", {}).items()}
    return DB(players=players,
              matches=matches,
              pairs=pairs,
              next_player_id=raw.get("next_player_id", 1),
              next_match_id=raw.get("next_match_id", 1),
              next_pair_id=raw.get("next_pair_id", 1))


def write_db(db: DB):
    payload = {
        "players": {pid: asdict(p) for pid, p in db.players.items()},
        "matches": {mid: asdict(m) for mid, m in db.matches.items()},
        "pairs": {pid: asdict(p) for pid, p in db.pairs.items()},
        "next_player_id": db.next_player_id,
        "next_match_id": db.next_match_id,
        "next_pair_id": db.next_pair_id,
    }
    with open(DATA_PATH, "w") as f:
        json.dump(payload, f, indent=2)


# ---------- Statistics helpers ----------

def get_player_stats(db: DB, player_id: int) -> Dict:
    """Calculate statistics for a specific player."""
    matches_played = 0
    wins = 0
    losses = 0
    total_score_for = 0
    total_score_against = 0
    partner_stats = {}  # {partner_id: {"games": count, "wins": count, "losses": count}}
    opponent_stats = {}  # {opponent_id: {"games": count, "wins": count, "losses": count}}
    biggest_win = None  # (score_for, score_against)
    biggest_loss = None  # (score_for, score_against)
    to6_wins = 0
    to6_losses = 0
    to4_wins = 0
    to4_losses = 0
    to3_wins = 0
    to3_losses = 0
    
    for match in db.matches.values():
        if player_id in match.team_a:
            matches_played += 1
            partner_id = [p for p in match.team_a if p != player_id][0]
            
            if partner_id not in partner_stats:
                partner_stats[partner_id] = {"games": 0, "wins": 0, "losses": 0}
            partner_stats[partner_id]["games"] += 1
            
            total_score_for += match.score_a
            total_score_against += match.score_b
            
            # Track biggest win/loss
            if match.score_a > match.score_b:
                wins += 1
                partner_stats[partner_id]["wins"] += 1
                if not biggest_win or (match.score_a - match.score_b) > (biggest_win[0] - biggest_win[1]):
                    biggest_win = (match.score_a, match.score_b)
            else:
                losses += 1
                partner_stats[partner_id]["losses"] += 1
                if not biggest_loss or (match.score_b - match.score_a) > (biggest_loss[1] - biggest_loss[0]):
                    biggest_loss = (match.score_a, match.score_b)
            
            # Track match type stats
            if match.type == "to6":
                if match.score_a > match.score_b:
                    to6_wins += 1
                else:
                    to6_losses += 1
            elif match.type == "to4":
                if match.score_a > match.score_b:
                    to4_wins += 1
                else:
                    to4_losses += 1
            elif match.type == "to3":
                if match.score_a > match.score_b:
                    to3_wins += 1
                else:
                    to3_losses += 1
                
            # Track opponent stats
            for opp in match.team_b:
                if opp not in opponent_stats:
                    opponent_stats[opp] = {"games": 0, "wins": 0, "losses": 0}
                opponent_stats[opp]["games"] += 1
                if match.score_a > match.score_b:
                    opponent_stats[opp]["wins"] += 1
                else:
                    opponent_stats[opp]["losses"] += 1
                
        elif player_id in match.team_b:
            matches_played += 1
            partner_id = [p for p in match.team_b if p != player_id][0]
            
            if partner_id not in partner_stats:
                partner_stats[partner_id] = {"games": 0, "wins": 0, "losses": 0}
            partner_stats[partner_id]["games"] += 1
            
            total_score_for += match.score_b
            total_score_against += match.score_a
            
            # Track biggest win/loss
            if match.score_b > match.score_a:
                wins += 1
                partner_stats[partner_id]["wins"] += 1
                if not biggest_win or (match.score_b - match.score_a) > (biggest_win[0] - biggest_win[1]):
                    biggest_win = (match.score_b, match.score_a)
            else:
                losses += 1
                partner_stats[partner_id]["losses"] += 1
                if not biggest_loss or (match.score_a - match.score_b) > (biggest_loss[1] - biggest_loss[0]):
                    biggest_loss = (match.score_b, match.score_a)
            
            # Track match type stats
            if match.type == "to6":
                if match.score_b > match.score_a:
                    to6_wins += 1
                else:
                    to6_losses += 1
            elif match.type == "to4":
                if match.score_b > match.score_a:
                    to4_wins += 1
                else:
                    to4_losses += 1
            elif match.type == "to3":
                if match.score_b > match.score_a:
                    to3_wins += 1
                else:
                    to3_losses += 1
                
            # Track opponent stats
            for opp in match.team_a:
                if opp not in opponent_stats:
                    opponent_stats[opp] = {"games": 0, "wins": 0, "losses": 0}
                opponent_stats[opp]["games"] += 1
                if match.score_b > match.score_a:
                    opponent_stats[opp]["wins"] += 1
                else:
                    opponent_stats[opp]["losses"] += 1
    
    win_rate = (wins / matches_played * 100) if matches_played > 0 else 0
    avg_score_for = total_score_for / matches_played if matches_played > 0 else 0
    avg_score_against = total_score_against / matches_played if matches_played > 0 else 0
    
    # Find best partner (by win rate, minimum 3 games)
    best_partner_id = None
    best_partner_wr = 0
    for pid, stats in partner_stats.items():
        if stats["games"] >= 3:
            wr = (stats["wins"] / stats["games"] * 100) if stats["games"] > 0 else 0
            if wr > best_partner_wr:
                best_partner_id = pid
                best_partner_wr = wr
    
    # Find worst partner (by win rate, minimum 3 games)
    worst_partner_id = None
    worst_partner_wr = 100
    for pid, stats in partner_stats.items():
        if stats["games"] >= 3:
            wr = (stats["wins"] / stats["games"] * 100) if stats["games"] > 0 else 0
            if wr < worst_partner_wr:
                worst_partner_id = pid
                worst_partner_wr = wr
    
    # Find most frequent opponent (by number of games)
    most_frequent_opponent_id = None
    most_frequent_opponent_count = 0
    if opponent_stats:
        most_frequent_opponent_id = max(opponent_stats.items(), key=lambda x: x[1]["games"])[0]
        most_frequent_opponent_count = opponent_stats[most_frequent_opponent_id]["games"]
    
    # Find most frequent partner (by number of games)
    most_frequent_partner_id = None
    most_frequent_partner_count = 0
    if partner_stats:
        most_frequent_partner_id = max(partner_stats.items(), key=lambda x: x[1]["games"])[0]
        most_frequent_partner_count = partner_stats[most_frequent_partner_id]["games"]
    
    # Calculate win rates by match type
    to6_total = to6_wins + to6_losses
    to4_total = to4_wins + to4_losses
    to3_total = to3_wins + to3_losses
    to6_wr = (to6_wins / to6_total * 100) if to6_total > 0 else 0
    to4_wr = (to4_wins / to4_total * 100) if to4_total > 0 else 0
    to3_wr = (to3_wins / to3_total * 100) if to3_total > 0 else 0
    
    return {
        "matches": matches_played,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "avg_score_for": avg_score_for,
        "avg_score_against": avg_score_against,
        "best_partner": best_partner_id,
        "best_partner_wr": best_partner_wr if best_partner_id else None,
        "worst_partner": worst_partner_id,
        "worst_partner_wr": worst_partner_wr if worst_partner_id else None,
        "partner_stats": partner_stats,
        "opponent_stats": opponent_stats,
        "biggest_win": biggest_win,
        "biggest_loss": biggest_loss,
        "most_frequent_opponent": most_frequent_opponent_id,
        "most_frequent_opponent_count": most_frequent_opponent_count,
        "most_frequent_partner": most_frequent_partner_id,
        "most_frequent_partner_count": most_frequent_partner_count,
        "unique_partners": len(partner_stats),
        "to6_wins": to6_wins,
        "to6_losses": to6_losses,
        "to6_total": to6_total,
        "to6_wr": to6_wr,
        "to4_wins": to4_wins,
        "to4_losses": to4_losses,
        "to4_total": to4_total,
        "to4_wr": to4_wr,
        "to3_wins": to3_wins,
        "to3_losses": to3_losses,
        "to3_total": to3_total,
        "to3_wr": to3_wr,
    }


def get_player_streaks(db: DB, player_id: int) -> Dict:
    """Calculate win/loss streaks for a player."""
    matches = []
    for match in db.matches.values():
        if player_id in match.team_a or player_id in match.team_b:
            matches.append(match)
    
    matches.sort(key=lambda m: (m.date, m.id))
    
    results = []  # (True/False, match)
    for match in matches:
        if player_id in match.team_a:
            results.append((match.score_a > match.score_b, match))
        else:
            results.append((match.score_b > match.score_a, match))
    
    if not results:
        return {"current": 0, "current_type": None, "best_win": 0, "worst_loss": 0, "best_win_date": None, "worst_loss_date": None}
    
    # Current streak
    current_streak = 1
    current_type = results[-1][0]
    for i in range(len(results) - 2, -1, -1):
        if results[i][0] == current_type:
            current_streak += 1
        else:
            break
    
    # Best/worst streaks with dates
    best_win_streak = 0
    best_win_end_date = None
    worst_loss_streak = 0
    worst_loss_end_date = None
    current_win = 0
    current_loss = 0
    
    for i, (result, match) in enumerate(results):
        if result:
            current_win += 1
            current_loss = 0
            if current_win > best_win_streak:
                best_win_streak = current_win
                best_win_end_date = match.date
        else:
            current_loss += 1
            current_win = 0
            if current_loss > worst_loss_streak:
                worst_loss_streak = current_loss
                worst_loss_end_date = match.date
    
    return {
        "current": current_streak,
        "current_type": "win" if current_type else "loss",
        "best_win": best_win_streak,
        "best_win_date": best_win_end_date,
        "worst_loss": worst_loss_streak,
        "worst_loss_date": worst_loss_end_date
    }


def get_versus_stats(db: DB, p1_id: int, p2_id: int) -> Dict:
    """Get head-to-head stats between two players."""
    p1_wins = 0
    p2_wins = 0
    total_matches = 0
    scores_p1 = []
    scores_p2 = []
    
    for match in db.matches.values():
        p1_in_a = p1_id in match.team_a
        p2_in_a = p2_id in match.team_a
        p1_in_b = p1_id in match.team_b
        p2_in_b = p2_id in match.team_b
        
        # They played against each other
        if (p1_in_a and p2_in_b) or (p1_in_b and p2_in_a):
            total_matches += 1
            if p1_in_a:
                scores_p1.append(match.score_a)
                scores_p2.append(match.score_b)
                if match.score_a > match.score_b:
                    p1_wins += 1
                else:
                    p2_wins += 1
            else:
                scores_p1.append(match.score_b)
                scores_p2.append(match.score_a)
                if match.score_b > match.score_a:
                    p1_wins += 1
                else:
                    p2_wins += 1
    
    avg_p1 = sum(scores_p1) / len(scores_p1) if scores_p1 else 0
    avg_p2 = sum(scores_p2) / len(scores_p2) if scores_p2 else 0
    
    return {
        "total": total_matches,
        "p1_wins": p1_wins,
        "p2_wins": p2_wins,
        "avg_p1": avg_p1,
        "avg_p2": avg_p2
    }


def get_pair_stats(db: DB, p1_id: int, p2_id: int) -> Dict:
    """Get stats for a pair playing together."""
    matches_together = 0
    wins = 0
    losses = 0
    
    for match in db.matches.values():
        if p1_id in match.team_a and p2_id in match.team_a:
            matches_together += 1
            if match.score_a > match.score_b:
                wins += 1
            else:
                losses += 1
        elif p1_id in match.team_b and p2_id in match.team_b:
            matches_together += 1
            if match.score_b > match.score_a:
                wins += 1
            else:
                losses += 1
    
    win_rate = (wins / matches_together * 100) if matches_together > 0 else 0
    
    return {
        "total": matches_together,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate
    }


def get_or_create_pair(db: DB, player1_id: int, player2_id: int) -> Pair:
    """Get existing pair or create new one."""
    # Sort player IDs to ensure consistent pair identification
    p1_id, p2_id = sorted([player1_id, player2_id])
    
    # Look for existing pair
    for pair in db.pairs.values():
        if pair.player1_id == p1_id and pair.player2_id == p2_id:
            return pair
    
    # Create new pair
    pair_id = db.next_pair_id
    new_pair = Pair(
        id=pair_id,
        player1_id=p1_id,
        player2_id=p2_id,
        rating=START_RATING,
        matches=0,
        wins=0,
        losses=0
    )
    db.pairs[pair_id] = new_pair
    db.next_pair_id += 1
    return new_pair


def update_pair_rating(db: DB, pair: Pair, opponent_pair: Pair, won: bool, score_diff: int, match_type: str):
    """Update pair rating based on match result."""
    # Calculate expected result
    E = expected(pair.rating, opponent_pair.rating)
    
    # Calculate actual result based on score difference
    T = T_by_type(match_type)
    S = actual_S(score_diff if won else -score_diff, 0, T, match_type)
    
    # Calculate rating change
    L = L_by_type(match_type)
    delta = K_BASE * L * (S - E)
    
    # Update pair rating
    pair.rating += delta
    pair.matches += 1
    if won:
        pair.wins += 1
    else:
        pair.losses += 1


def initialize_pairs_from_history(db: DB):
    """Initialize pair ratings from existing match history."""
    # Clear existing pairs
    db.pairs = {}
    db.next_pair_id = 1
    
    # Process all matches chronologically
    matches = list(db.matches.values())
    matches.sort(key=lambda m: (m.date, m.id))
    
    for match in matches:
        if len(match.team_a) == 2 and len(match.team_b) == 2:
            # Get or create pairs
            pair_a = get_or_create_pair(db, match.team_a[0], match.team_a[1])
            pair_b = get_or_create_pair(db, match.team_b[0], match.team_b[1])
            
            # Update pair ratings
            score_diff = match.score_a - match.score_b
            update_pair_rating(db, pair_a, pair_b, match.score_a > match.score_b, abs(score_diff), match.type)
            update_pair_rating(db, pair_b, pair_a, match.score_b > match.score_a, abs(score_diff), match.type)


def get_pairs_rating(db: DB) -> Dict:
    """Get all pairs sorted by rating."""
    return dict(sorted(db.pairs.items(), key=lambda x: x[1].rating, reverse=True))


def get_league_records(db: DB) -> Dict:
    """Calculate historical league records."""
    all_stats = {pid: get_player_stats(db, pid) for pid in db.players.keys()}
    
    records = {}
    
    # === ИСТОРИЧЕСКИЕ РЕЙТИНГИ ===
    # Simulate all matches to find historical peaks
    historical_ratings = {}  # {player_id: {"rating": max_rating, "date": date}}
    historical_lows = {}  # {player_id: {"rating": min_rating, "date": date}}
    
    # Start with initial ratings
    current_ratings = {pid: START_RATING for pid in db.players.keys()}
    for pid in db.players.keys():
        historical_ratings[pid] = {"rating": START_RATING, "date": None}
        historical_lows[pid] = {"rating": START_RATING, "date": None}
    
    # Sort matches chronologically
    matches = list(db.matches.values())
    matches.sort(key=lambda m: (m.date, m.id))
    
    # Simulate each match and track rating changes
    for match in matches:
        if len(match.team_a) == 2 and len(match.team_b) == 2:
            # Get current ratings
            teamA_rating = sum(current_ratings[p] for p in match.team_a) / 2
            teamB_rating = sum(current_ratings[p] for p in match.team_b) / 2
            
            # Calculate expected and actual
            E_A = expected(teamA_rating, teamB_rating)
            E_B = 1 - E_A
            
            T = T_by_type(match.type)
            diff = match.score_a - match.score_b
            S_A = actual_S(diff, 0, T, match.type)
            S_B = 1 - S_A
            
            # Calculate deltas
            L = L_by_type(match.type)
            delta_A = K_BASE * L * (S_A - E_A)
            delta_B = K_BASE * L * (S_B - E_B)
            
            # Update ratings and track peaks with dates
            for pid in match.team_a:
                current_ratings[pid] += delta_A
                if current_ratings[pid] > historical_ratings[pid]["rating"]:
                    historical_ratings[pid] = {"rating": current_ratings[pid], "date": match.date}
                if current_ratings[pid] < historical_lows[pid]["rating"]:
                    historical_lows[pid] = {"rating": current_ratings[pid], "date": match.date}
            
            for pid in match.team_b:
                current_ratings[pid] += delta_B
                if current_ratings[pid] > historical_ratings[pid]["rating"]:
                    historical_ratings[pid] = {"rating": current_ratings[pid], "date": match.date}
                if current_ratings[pid] < historical_lows[pid]["rating"]:
                    historical_lows[pid] = {"rating": current_ratings[pid], "date": match.date}
    
    # Find highest and lowest historical ratings
    if historical_ratings:
        max_player = max(historical_ratings.items(), key=lambda x: x[1]["rating"])
        records["highest_rating"] = max_player[1]["rating"]
        records["highest_player"] = max_player[0]
        records["highest_date"] = max_player[1]["date"]
        
        min_player = min(historical_lows.items(), key=lambda x: x[1]["rating"])
        records["lowest_rating"] = min_player[1]["rating"]
        records["lowest_player"] = min_player[0]
        records["lowest_date"] = min_player[1]["date"]
    
    # === АКТИВНОСТЬ ===
    if all_stats:
        records["most_matches"] = max(stats["matches"] for stats in all_stats.values())
        records["most_matches_player"] = max(all_stats.items(), key=lambda x: x[1]["matches"])[0]
    
    # === ВИНРЕЙТЫ ===
    qualified = {pid: stats for pid, stats in all_stats.items() if stats["matches"] >= 5}
    if qualified:
        records["best_wr"] = max(stats["win_rate"] for stats in qualified.values())
        records["best_wr_player"] = max(qualified.items(), key=lambda x: x[1]["win_rate"])[0]
        records["worst_wr"] = min(stats["win_rate"] for stats in qualified.values())
        records["worst_wr_player"] = min(qualified.items(), key=lambda x: x[1]["win_rate"])[0]
    
    # === СТРИКИ ===
    longest_win_streak = 0
    longest_win_player = None
    longest_win_date = None
    longest_loss_streak = 0
    longest_loss_player = None
    longest_loss_date = None
    
    for pid in db.players.keys():
        streaks = get_player_streaks(db, pid)
        if streaks["best_win"] > longest_win_streak:
            longest_win_streak = streaks["best_win"]
            longest_win_player = pid
            longest_win_date = streaks["best_win_date"]
        if streaks["worst_loss"] > longest_loss_streak:
            longest_loss_streak = streaks["worst_loss"]
            longest_loss_player = pid
            longest_loss_date = streaks["worst_loss_date"]
    
    records["longest_win_streak"] = longest_win_streak
    records["longest_win_player"] = longest_win_player
    records["longest_win_date"] = longest_win_date
    records["longest_loss_streak"] = longest_loss_streak
    records["longest_loss_player"] = longest_loss_player
    records["longest_loss_date"] = longest_loss_date
    
    # === СЧЕТЫ ===
    biggest_win = None
    biggest_diff = 0
    for match in db.matches.values():
        diff = abs(match.score_a - match.score_b)
        if diff > biggest_diff:
            biggest_diff = diff
            biggest_win = match
    
    records["biggest_win"] = biggest_win
    records["biggest_diff"] = biggest_diff
    
    # === ПАРТНЕРЫ ===
    best_partner_stats = {}
    worst_partner_stats = {}
    
    for pid in db.players.keys():
        stats = get_player_stats(db, pid)
        if stats.get("best_partner"):
            partner_id = stats["best_partner"]
            partner = db.players.get(partner_id)
            partner_name = partner.name if partner else "Unknown"
            partner_games = stats["partner_stats"][partner_id]["games"]
            best_partner_stats[pid] = {
                "partner": partner_name,
                "winrate": stats.get("best_partner_wr", 0),
                "games": partner_games,
            }
        
        if stats.get("worst_partner"):
            partner_id = stats["worst_partner"]
            partner = db.players.get(partner_id)
            partner_name = partner.name if partner else "Unknown"
            partner_games = stats["partner_stats"][partner_id]["games"]
            worst_partner_stats[pid] = {
                "partner": partner_name,
                "winrate": stats.get("worst_partner_wr", 0),
                "games": partner_games,
            }
    
    # Лучший дуэт (по винрейту)
    if best_partner_stats:
        best_duo_player = max(best_partner_stats.items(), key=lambda x: x[1]["winrate"])[0]
        records["best_duo_player"] = best_duo_player
        records["best_duo_partner"] = best_partner_stats[best_duo_player]["partner"]
        records["best_duo_wr"] = best_partner_stats[best_duo_player]["winrate"]
        records["best_duo_games"] = best_partner_stats[best_duo_player]["games"]
    
    # Худший дуэт (по винрейту)
    if worst_partner_stats:
        worst_duo_player = min(worst_partner_stats.items(), key=lambda x: x[1]["winrate"])[0]
        records["worst_duo_player"] = worst_duo_player
        records["worst_duo_partner"] = worst_partner_stats[worst_duo_player]["partner"]
        records["worst_duo_wr"] = worst_partner_stats[worst_duo_player]["winrate"]
        records["worst_duo_games"] = worst_partner_stats[worst_duo_player]["games"]
    
    return records


# ---------- Elo helpers ----------

def expected(teamA: float, teamB: float) -> float:
    return 1.0 / (1.0 + 10 ** ((teamB - teamA) / 400.0))


def actual_S(a: int, b: int, T: int, match_type: str = "to6") -> float:
    gd = a - b
    margin = max(-1.0, min(1.0, gd / float(T)))
    # Reduce score influence by 40% for all match types (0.5 * 0.6 = 0.3)
    margin_factor = 0.3
    return 0.5 + margin_factor * margin


def L_by_type(t: str) -> float:
    if t == "to6":
        return L_TO6
    elif t == "to4":
        return L_TO4
    elif t == "to3":
        return L_TO3
    else:
        return L_TO6  # default


def T_by_type(t: str) -> int:
    """Get maximum score for match type."""
    if t == "to6":
        return 6
    elif t == "to4":
        return 4
    elif t == "to3":
        return 3
    else:
        return 6  # default


def rating_table(db: DB, now: datetime | None = None) -> Dict[int, float]:
    """Compute ratings from scratch using only matches within WINDOW_DAYS."""
    now = now or _now_utc()
    cutoff = now - timedelta(days=WINDOW_DAYS)

    ratings: Dict[int, float] = {pid: START_RATING for pid in db.players.keys()}

    # Sort matches by date
    matches = list(db.matches.values())
    matches.sort(key=lambda m: (m.date, m.id))

    for m in matches:
        dt = datetime.fromisoformat(m.date)
        if dt < cutoff:
            continue
        a1, a2 = m.team_a
        b1, b2 = m.team_b
        rA = (ratings.get(a1, START_RATING) + ratings.get(a2, START_RATING)) / 2.0
        rB = (ratings.get(b1, START_RATING) + ratings.get(b2, START_RATING)) / 2.0
        E = expected(rA, rB)
        T = T_by_type(m.type)
        S = actual_S(m.score_a, m.score_b, T, m.type)
        delta_team = K_BASE * L_by_type(m.type) * (S - E)
        ratings[a1] = ratings.get(a1, START_RATING) + delta_team
        ratings[a2] = ratings.get(a2, START_RATING) + delta_team
        ratings[b1] = ratings.get(b1, START_RATING) - delta_team
        ratings[b2] = ratings.get(b2, START_RATING) - delta_team

    return ratings


# ---------- Bot setup ----------
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ---------- Keyboard ----------
def get_main_keyboard():
    """Create main keyboard with buttons."""
    keyboard = [
        [KeyboardButton(text="🏆 Рейтинг"), KeyboardButton(text="📊 Моя статистика")],
        [KeyboardButton(text="📜 Моя История"), KeyboardButton(text="📈 Моя форма")],
        [KeyboardButton(text="🎯 Прогресс"), KeyboardButton(text="💪 Производительность")],
        [KeyboardButton(text="🎾 Все матчи"), KeyboardButton(text="👥 Все падлы")],
        [KeyboardButton(text="🔥 Мой стрик"), KeyboardButton(text="🏅 Рекорды")],
        [KeyboardButton(text="👥 Топ пар"), KeyboardButton(text="⚔️ Противостояния")],
        [KeyboardButton(text="📚 Как работает рейтинг"), KeyboardButton(text="ℹ️ Помощь")]
    ]
    return ReplyKeyboardMarkup(keyboard=keyboard, resize_keyboard=True, is_persistent=True)


@dp.message(Command("start"))
async def start_cmd(m: Message):
    await m.answer(
        "👋 Привет! Я бот для рейтинга TOP ПАДЛА.\n\n"
        "🎾 Используй кнопки меню ниже для навигации.\n\n"
        "Чтобы привязать свой аккаунт: /link Имя\n"
        "Для помощи: /help или кнопка ℹ️ Помощь",
        reply_markup=get_main_keyboard()
    )


@dp.message(Command("help"))
async def help_cmd(m: Message):
    await m.answer(
        "Как вносить матч (быстро):\n"
        "`/result @user1 @user2 vs @user3 @user4 6-3`\n"
        "Тип матча (to6/to4/to3) определяется автоматически по счёту.\n"
        "Валидные счета:\n"
        "• to6: 6-0, 6-1, 6-2, 6-3, 6-4, 7-6 (тайбрейк)\n"
        "• to4: 4-0, 4-1, 4-2, 4-3, 5-4 (тайбрейк)\n"
        "• to3: 3-0, 3-1, 3-2, 4-3 (тайбрейк)\n"
        "Можно указать дату в конце: `YYYY-MM-DD`.\n\n"
        "📊 Основные команды:\n"
        "/players — список игроков\n"
        "/addplayer Имя — добавить игрока (для админов)\n"
        "/link Имя — привязать свой Telegram к игроку\n"
        "/standings — рейтинг TOP ПАДЛЫ\n"
        "/matches — история всех матчей\n"
        "/rating — как работает рейтинг\n"
        "/rating подробно — детальное объяснение\n\n"
        "📈 Статистика:\n"
        "/stats [@user] — полная статистика\n"
        "/history [@user] — история матчей\n"
        "/form [@user] — текущая форма\n"
        "/streak [@user] — серии побед/поражений\n"
        "/progress [@user] — прогресс рейтинга\n"
        "/performance [@user] — производительность против сильных/слабых\n\n"
        "⚔️ Сравнения:\n"
        "/versus @p1 @p2 — противостояние\n"
        "/h2h @p1 @p2 — статистика пары\n"
        "/predict @A @B vs @C @D — предсказание\n"
        "/rivalry — топ противостояний\n\n"
        "🏆 Топы:\n"
        "/leaderboard [rating/wins/matches/winrate]\n"
        "/records — рекорды лиги\n"
        "/pairs — топ пар по рейтингу"
        , parse_mode="Markdown", reply_markup=get_main_keyboard()
    )


@dp.message(Command("rating"))
async def rating_explanation_cmd(m: Message):
    """Explain how the rating system works."""
    text_parts = m.text.split()
    detailed = len(text_parts) > 1 and text_parts[1].lower() in ["подробно", "детально", "полно", "максимально"]
    
    if detailed:
        # Detailed explanation
        message = (
            "📚 <b>ПОДРОБНОЕ ОБЪЯСНЕНИЕ РЕЙТИНГОВОЙ СИСТЕМЫ</b>\n\n"
            
            "🎯 <b>ОСНОВА СИСТЕМЫ:</b>\n"
            "• Используется модифицированная система Elo\n"
            "• Стартовый рейтинг: <code>1000</code> очков\n"
            "• Базовая константа K: <code>28</code>\n\n"
            
            "⚖️ <b>КАК РАССЧИТЫВАЕТСЯ ИЗМЕНЕНИЕ:</b>\n"
            "1. <b>Ожидаемый результат:</b> E = 1/(1 + 10^((R_B - R_A)/400))\n"
            "   где R_A и R_B - средние рейтинги команд\n\n"
            
            "2. <b>Фактический результат:</b> S = 0.5 + 0.5 * (разница_очков / максимум_очков)\n"
            "   • Победа 6-0: S = 1.0 (максимум)\n"
            "   • Победа 6-3: S = 0.75\n"
            "   • Победа 6-5: S = 0.58\n"
            "   • Поражение 5-6: S = 0.42\n"
            "   • Поражение 3-6: S = 0.25\n"
            "   • Поражение 0-6: S = 0.0 (минимум)\n\n"
            
            "3. <b>Изменение рейтинга:</b> Δ = K × L × (S - E)\n"
            "   где L - модификатор типа игры\n\n"
            
            "🎾 <b>ТИПЫ ИГР И МОДИФИКАТОРЫ:</b>\n"
            "• <b>До 6 очков:</b> L = 1.0 (полный эффект)\n"
            "• <b>До 4 очков:</b> L = 0.8 (80% эффекта)\n"
            "• <b>До 3 очков:</b> L = 0.7 (70% эффекта)\n\n"
            
            "📊 <b>ПРИМЕРЫ РАСЧЕТОВ:</b>\n"
            "• Команда с рейтингом 1100 играет против 1000\n"
            "• Ожидаемый результат: E = 1/(1 + 10^(-100/400)) ≈ 0.64\n"
            "• Если выиграли 6-3: S = 0.75\n"
            "• Изменение: Δ = 28 × 1.0 × (0.75 - 0.64) = +3.1 очка\n\n"
            
            "⏰ <b>ВРЕМЕННОЕ ОКНО:</b>\n"
            "• Учитываются только матчи за последние <code>182 дня</code> (6 месяцев)\n"
            "• Старые матчи не влияют на текущий рейтинг\n"
            "• Это позволяет рейтингу адаптироваться к текущей форме\n\n"
            
            "🎯 <b>ОСОБЕННОСТИ:</b>\n"
            "• <b>Размер победы важен:</b> крупная победа дает больше очков\n"
            "• <b>Неожиданные результаты:</b> победа над сильным соперником дает больше очков\n"
            "• <b>Командный рейтинг:</b> используется средний рейтинг команды\n"
            "• <b>Минимум матчей:</b> для стабильного рейтинга нужно минимум 3 матча\n\n"
            
            "📈 <b>СТРАТЕГИЯ ПОВЫШЕНИЯ РЕЙТИНГА:</b>\n"
            "• Играй против сильных соперников\n"
            "• Стремись к крупным победам\n"
            "• Играй регулярно (не реже раза в месяц)\n"
            "• Выбирай формат 'до 6' для максимального эффекта"
        )
    else:
        # Brief explanation
        message = (
            "📚 <b>КАК РАБОТАЕТ РЕЙТИНГ (кратко)</b>\n\n"
            
            "🎯 <b>Основы:</b>\n"
            "• Стартовый рейтинг: <code>1000</code> очков\n"
            "• Система Elo (как в шахматах)\n"
            "• Учитываются матчи за последние 6 месяцев\n\n"
            
            "⚖️ <b>Что влияет на изменение:</b>\n"
            "• <b>Сила соперника:</b> победа над сильным = больше очков\n"
            "• <b>Размер победы:</b> 6-0 дает больше очков чем 6-5\n"
            "• <b>Тип игры:</b> до 6 очков = полный эффект, до 4 = 80%, до 3 = 70%\n\n"
            
            "📊 <b>Примеры:</b>\n"
            "• Победа 6-3 над равным соперником: +3-5 очков\n"
            "• Победа 6-0 над сильным: +8-12 очков\n"
            "• Поражение 3-6 от сильного: -2-4 очка\n\n"
            
            "💡 <b>Для подробного объяснения:</b> <code>/rating подробно</code>"
        )
    
    await m.answer(message, parse_mode="HTML", reply_markup=get_main_keyboard())


# ---------- Button handlers ----------
@dp.message(F.text == "🏆 Рейтинг")
async def button_standings(m: Message):
    await standings_cmd(m)


@dp.message(F.text == "📊 Моя статистика")
async def button_stats(m: Message):
    print(f"DEBUG: Button stats pressed by {m.from_user.id} in chat {m.chat.id} ({m.chat.type})")
    await stats_cmd(m)


@dp.message(F.text == "📜 Моя История")
async def button_history(m: Message):
    await history_cmd(m)


@dp.message(F.text == "📈 Моя форма")
async def button_form(m: Message):
    await form_cmd(m)


@dp.message(F.text == "🎾 Все матчи")
async def button_matches(m: Message):
    await matches_cmd(m)


@dp.message(F.text == "👥 Все падлы")
async def button_players(m: Message):
    await players_cmd(m)


@dp.message(F.text == "🔥 Мой стрик")
async def button_streak(m: Message):
    await streak_cmd(m)


@dp.message(F.text == "🏅 Рекорды")
async def button_records(m: Message):
    await records_cmd(m)


@dp.message(F.text == "👥 Топ пар")
async def button_pairs(m: Message):
    await pairs_cmd(m)


@dp.message(F.text == "📚 Как работает рейтинг")
async def button_rating_explanation(m: Message):
    await rating_explanation_cmd(m)


@dp.message(F.text == "ℹ️ Помощь")
async def button_help(m: Message):
    print(f"DEBUG: Button help pressed by {m.from_user.id} in chat {m.chat.id} ({m.chat.type})")
    await help_cmd(m)


@dp.message(F.text == "🎯 Прогресс")
async def button_progress(m: Message):
    await progress_cmd(m)


@dp.message(F.text == "💪 Производительность")
async def button_performance(m: Message):
    await performance_cmd(m)


@dp.message(F.text == "⚔️ Противостояния")
async def button_rivalry(m: Message):
    await rivalry_cmd(m)


@dp.message(Command("players"))
async def players_cmd(m: Message):
    db = read_db()
    if not db.players:
        await m.answer("Пока нет игроков.", reply_markup=get_main_keyboard())
        return
    lines = [f"{p.id}. {p.name} {'(tg)' if p.tg_id else ''}" for p in db.players.values()]
    await m.answer("Все ПАДЛЫ:\n" + "\n".join(lines), reply_markup=get_main_keyboard())


@dp.message(Command("addplayer"))
async def addplayer_cmd(m: Message):
    db = read_db()
    name = m.text.split(" ", 1)[1] if " " in m.text else None
    if not name:
        await m.answer("Укажи имя: /addplayer Имя", reply_markup=get_main_keyboard())
        return
    pid = db.next_player_id
    db.players[pid] = Player(id=pid, name=name)
    db.next_player_id += 1
    write_db(db)
    await m.answer(
        f"Падла '{name}' добавлена с id {pid}.\n\n"
        f"Пусть пользователь привяжет свой Telegram:\n"
        f"/link {name}",
        reply_markup=get_main_keyboard()
    )


@dp.message(Command("link"))
async def link_cmd(m: Message):
    """Link Telegram account to existing player."""
    db = read_db()
    
    # Check if already linked
    existing = next((p for p in db.players.values() if p.tg_id == m.from_user.id), None)
    if existing:
        await m.answer(
            f"Ты уже привязан к игроку '{existing.name}'.\n"
            f"Чтобы изменить, попроси админа удалить старую привязку.",
            reply_markup=get_main_keyboard()
        )
        return
    
    # Get player name from command
    name = m.text.split(" ", 1)[1] if " " in m.text else None
    if not name:
        await m.answer(
            "Укажи своё имя: /link Имя\n"
            "Например: /link Dmitry",
            reply_markup=get_main_keyboard()
        )
        return
    
    # Find player by name
    player = next((p for p in db.players.values() if p.name.lower() == name.lower()), None)
    if not player:
        await m.answer(
            f"Падла '{name}' не найдена!\n"
            f"Попроси админа добавить через /addplayer {name}",
            reply_markup=get_main_keyboard()
        )
        return
    
    # Check if player already linked to someone else
    if player.tg_id:
        await m.answer(
            f"Игрок '{player.name}' уже привязан к другому Telegram аккаунту.",
            reply_markup=get_main_keyboard()
        )
        return
    
    # Link player to telegram account
    player.tg_id = m.from_user.id
    db.players[player.id] = player
    write_db(db)
    
    await m.answer(
        f"✅ Успешно привязан!\n"
        f"Теперь ты — {player.name}\n\n"
        f"Кнопки 'Моя статистика', 'Моя форма' и 'История' теперь работают!",
        reply_markup=get_main_keyboard()
    )


# --- /result parser ---
# Syntax: /result @A @B vs @C @D 6-3 [YYYY-MM-DD]
# Тип матча (to6/to4/to3) определяется автоматически по счёту

def _parse_result(text: str) -> Tuple[str, List[str], List[str], Tuple[int,int], datetime]:
    parts = text.split()
    # Expect at least: /result A B vs C D 6-3
    if len(parts) < 7:
        raise ValueError("Неполные данные. Пример: /result @A @B vs @C @D 6-3")
    
    try:
        vs_idx = parts.index("vs")
    except ValueError:
        raise ValueError("Отсутствует 'vs'")
    
    team_a = parts[1:vs_idx]
    
    # after vs we expect two users then score then optional date
    score_token_idx = len(parts) - 1
    date = _now_utc()
    # optional date at end
    if len(parts[-1]) == 10 and parts[-1].count("-") == 2:
        try:
            date = datetime.fromisoformat(parts[-1]).replace(tzinfo=timezone.utc)
            score_token_idx -= 1
        except Exception:
            pass
    
    score_token = parts[score_token_idx]
    if "-" not in score_token:
        raise ValueError("Счёт должен быть формата 6-3")
    
    sA, sB = score_token.split("-", 1)
    try:
        score_a = int(sA)
        score_b = int(sB)
    except ValueError:
        raise ValueError("Счёт должен быть числами")
    
    # Определяем тип матча по счёту
    max_score = max(score_a, score_b)
    min_score = min(score_a, score_b)
    
    # Валидные счета для to6: 
    # - обычные: один из счетов 6, другой от 0 до 4
    # - тайбрейк: 7-6 или 6-7
    if (max_score == 6 and min_score <= 4) or (max_score == 7 and min_score == 6):
        typ = "to6"
    # Валидные счета для to4:
    # - обычные: один счет 4, другой от 0 до 3
    # - тайбрейк: 5-4 или 4-5
    elif (max_score == 4 and min_score <= 3) or (max_score == 5 and min_score == 4):
        typ = "to4"
    # Валидные счета для to3:
    # - обычные: один счет 3, другой от 0 до 2
    # - тайбрейк: 4-3 или 3-4
    elif (max_score == 3 and min_score <= 2) or (max_score == 4 and min_score == 3):
        typ = "to3"
    else:
        raise ValueError(
            f"Некорректный счёт: {score_a}-{score_b}. "
            f"Валидные счета для to6: 6-0, 6-1, 6-2, 6-3, 6-4, 7-6 (тайбрейк). "
            f"Валидные счета для to4: 4-0, 4-1, 4-2, 4-3, 5-4 (тайбрейк). "
            f"Валидные счета для to3: 3-0, 3-1, 3-2, 4-3 (тайбрейк)."
        )
    
    score = (score_a, score_b)
    team_b = parts[vs_idx + 1:score_token_idx]
    
    if len(team_a) != 2 or len(team_b) != 2:
        raise ValueError("Каждая команда должна состоять из двух игроков")
    
    return typ, team_a, team_b, score, date


def _resolve_players(db: DB, tokens: List[str]) -> Tuple[List[int] | None, str | None]:
    """Resolve tokens like @username or plain name into player ids. Returns (ids, error_message)."""
    ids = []
    for t in tokens:
        t = t.strip()
        if t.startswith("@"):
            # try by Telegram username
            uname = t[1:].lower()
            p = next((p for p in db.players.values() if p.name.lower() == uname), None)
            if p:
                ids.append(p.id)
                continue
        # try exact name match
        p = next((p for p in db.players.values() if p.name.lower() == t.lower()), None)
        if p:
            ids.append(p.id)
        else:
            # Player not found - return error
            return None, f"Падла '{t}' не найдена! Сначала добавь через /addplayer "
    return ids, None


@dp.message(Command("result"))
async def result_cmd(m: Message):
    db = read_db()
    try:
        typ, team_a_tokens, team_b_tokens, (sa, sb), dt = _parse_result(m.text)
    except Exception as e:
        await m.answer(f"Ошибка: {e}")
        return

    a_ids, error = _resolve_players(db, team_a_tokens)
    if error:
        await m.answer(error)
        return
    if len(a_ids) != len(set(a_ids)):
        await m.answer("Каждая команда должна состоять из двух разных игроков.")
        return
    
    b_ids, error = _resolve_players(db, team_b_tokens)
    if error:
        await m.answer(error)
        return
    if len(b_ids) != len(set(b_ids)):
        await m.answer("Каждая команда должна состоять из двух разных игроков.")
        return

    if set(a_ids) & set(b_ids):
        await m.answer("Игрок не может играть одновременно в обеих командах.")
        return

    # Calculate ratings BEFORE adding match
    ratings_before = rating_table(db)

    # Get or create pairs
    pair_a = get_or_create_pair(db, a_ids[0], a_ids[1])
    pair_b = get_or_create_pair(db, b_ids[0], b_ids[1])

    mid = db.next_match_id
    match = Match(
        id=mid,
        date=dt.isoformat(),
        type=typ,
        team_a=a_ids,
        team_b=b_ids,
        score_a=sa,
        score_b=sb,
        created_by=m.from_user.id if m.from_user else None,
    )
    db.matches[mid] = match
    db.next_match_id += 1

    # Update pair ratings
    score_diff = sa - sb
    update_pair_rating(db, pair_a, pair_b, sa > sb, abs(score_diff), typ)
    update_pair_rating(db, pair_b, pair_a, sb > sa, abs(score_diff), typ)

    write_db(db)

    # Calculate ratings AFTER adding match
    db = read_db()  # Re-read to get updated data
    ratings_after = rating_table(db)
    
    # Build rating change message
    lines = [f"✅ Матч сохранён: {typ} | {sa}-{sb}\n"]
    
    # Team A
    for pid in a_ids:
        player = db.players.get(pid)
        if player:
            before = ratings_before.get(pid, START_RATING)
            after = ratings_after.get(pid, START_RATING)
            change = after - before
            emoji = "📈" if change > 0 else "📉" if change < 0 else "➡️"
            sign = "+" if change > 0 else ""
            lines.append(f"{emoji} {player.name}: {before:.1f} → {after:.1f} ({sign}{change:.1f})")
    
    lines.append("")
    
    # Team B
    for pid in b_ids:
        player = db.players.get(pid)
        if player:
            before = ratings_before.get(pid, START_RATING)
            after = ratings_after.get(pid, START_RATING)
            change = after - before
            emoji = "📈" if change > 0 else "📉" if change < 0 else "➡️"
            sign = "+" if change > 0 else ""
            lines.append(f"{emoji} {player.name}: {before:.1f} → {after:.1f} ({sign}{change:.1f})")

    await m.answer("\n".join(lines))


@dp.message(Command("standings"))
async def standings_cmd(m: Message):
    db = read_db()
    ratings = rating_table(db)
    if not ratings:
        await m.answer("Пока нет рейтингов.")
        return
    
    # Sort by rating desc
    items = sorted(ratings.items(), key=lambda kv: kv[1], reverse=True)
    lines = ["🏆 ТОП ПАДЛЫ:\n"]
    
    for pos, (pid, rating) in enumerate(items, start=1):
        player = db.players.get(pid)
        if not player:
            continue
            
        stats = get_player_stats(db, pid)
        
        # Medal emoji for top 3
        medal = ""
        if pos == 1:
            medal = "🥇 "
        elif pos == 2:
            medal = "🥈 "
        elif pos == 3:
            medal = "🥉 "
        
        line = (f"{medal}{pos}. {player.name} — {rating:.1f}\n"
                f"   Матчи: {stats['matches']} | "
                f"Побед: {stats['wins']} ({stats['win_rate']:.0f}%)\n")
        lines.append(line)
    
    await m.answer("\n".join(lines), reply_markup=get_main_keyboard())


@dp.message(Command("stats"))
async def stats_cmd(m: Message):
    db = read_db()
    
    # Check if user mentioned someone or wants their own stats
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user
    if len(text_parts) > 1 and not text_parts[0].startswith("📊"):
        # User mentioned someone: /stats @username or /stats Name
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            # Try to find by name
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("📊"):
            # Button press - user wants their own stats but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свою статистику, нужно привязать Telegram к игроку:\n"
                "• /link @username - если знаешь свой ник\n"
                "• /players - посмотреть всех игроков\n"
                "• /stats @username - посмотреть чужую статистику\n\n"
                "Или попроси админа добавить тебя командой /addplayer",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    stats = get_player_stats(db, target_player.id)
    
    if stats["matches"] == 0:
        await m.answer(f"{target_player.name} ещё не сыграл ни одного матча.")
        return
    
    # Get current rating and position
    ratings = rating_table(db)
    current_rating = ratings.get(target_player.id, START_RATING)
    sorted_ratings = sorted(ratings.items(), key=lambda kv: kv[1], reverse=True)
    position = next((i for i, (pid, _) in enumerate(sorted_ratings, 1) 
                    if pid == target_player.id), None)
    
    # Best partner
    best_partner_text = "—"
    if stats["best_partner"]:
        partner = db.players.get(stats["best_partner"])
        if partner:
            partner_games = stats["partner_stats"][stats["best_partner"]]["games"]
            partner_wins = stats["partner_stats"][stats["best_partner"]]["wins"]
            partner_losses = stats["partner_stats"][stats["best_partner"]]["losses"]
            best_partner_text = f"{partner.name} ({partner_wins}-{partner_losses}, {partner_games} матчей)"
    
    # Worst partner
    worst_partner_text = "—"
    if stats["worst_partner"]:
        partner = db.players.get(stats["worst_partner"])
        if partner:
            partner_games = stats["partner_stats"][stats["worst_partner"]]["games"]
            partner_wins = stats["partner_stats"][stats["worst_partner"]]["wins"]
            partner_losses = stats["partner_stats"][stats["worst_partner"]]["losses"]
            worst_partner_text = f"{partner.name} ({partner_wins}-{partner_losses}, {partner_games} матчей)"
    
    # Format biggest win/loss
    biggest_win_text = "—"
    if stats["biggest_win"]:
        biggest_win_text = f"{stats['biggest_win'][0]}-{stats['biggest_win'][1]}"
    
    biggest_loss_text = "—"
    if stats["biggest_loss"]:
        biggest_loss_text = f"{stats['biggest_loss'][0]}-{stats['biggest_loss'][1]}"
    
    # Most frequent opponent
    most_freq_opponent_text = "—"
    if stats["most_frequent_opponent"]:
        opponent = db.players.get(stats["most_frequent_opponent"])
        if opponent:
            opponent_games = stats["opponent_stats"][stats["most_frequent_opponent"]]["games"]
            opponent_wins = stats["opponent_stats"][stats["most_frequent_opponent"]]["wins"]
            opponent_losses = stats["opponent_stats"][stats["most_frequent_opponent"]]["losses"]
            most_freq_opponent_text = f"{opponent.name} ({opponent_wins}-{opponent_losses}, {opponent_games} встреч)"
    
    # Most frequent partner
    most_freq_partner_text = "—"
    if stats["most_frequent_partner"]:
        partner = db.players.get(stats["most_frequent_partner"])
        if partner:
            partner_games = stats["partner_stats"][stats["most_frequent_partner"]]["games"]
            partner_wins = stats["partner_stats"][stats["most_frequent_partner"]]["wins"]
            partner_losses = stats["partner_stats"][stats["most_frequent_partner"]]["losses"]
            most_freq_partner_text = f"{partner.name} ({partner_wins}-{partner_losses}, {partner_games} матчей)"
    
    # Match type stats
    to6_stats_text = ""
    if stats["to6_total"] > 0:
        to6_stats_text = f"\n🎾 До 6: {stats['to6_wins']}-{stats['to6_losses']} ({stats['to6_wr']:.0f}%)"
    
    to4_stats_text = ""
    if stats["to4_total"] > 0:
        to4_stats_text = f"\n🏸 До 4: {stats['to4_wins']}-{stats['to4_losses']} ({stats['to4_wr']:.0f}%)"
    
    to3_stats_text = ""
    if stats["to3_total"] > 0:
        to3_stats_text = f"\n🎯 До 3: {stats['to3_wins']}-{stats['to3_losses']} ({stats['to3_wr']:.0f}%)"
    
    message = (
        f"📊 Статистика: {target_player.name}\n\n"
        f"🏆 Рейтинг: {current_rating:.1f} (Падла номер {position})\n"
        f"🎾 Всего матчей: {stats['matches']}\n"
        f"✅ Побед: {stats['wins']}\n"
        f"❌ Поражений: {stats['losses']}\n"
        f"📈 Винрейт: {stats['win_rate']:.1f}%{to6_stats_text}{to4_stats_text}{to3_stats_text}\n"
        f"⚡ Средний счёт: {stats['avg_score_for']:.1f} — {stats['avg_score_against']:.1f}\n"
        f"💪 Самая крупная победа: {biggest_win_text}\n"
        f"💔 Самое крупное поражение: {biggest_loss_text}\n"
        f"🤝 Лучший тимейт: {best_partner_text}\n"
        f"💔 Худший тимейт: {worst_partner_text}\n"
        f"👥 Самый частый партнёр: {most_freq_partner_text}\n"
        f"⚔️ Самый частый соперник: {most_freq_opponent_text}\n"
        f"🔢 Уникальных партнёров: {stats['unique_partners']}"
    )
    
    await m.answer(message)


@dp.message(Command("history"))
async def history_cmd(m: Message):
    db = read_db()
    
    # Check if user mentioned someone
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user
    if len(text_parts) > 1 and not text_parts[0].startswith("📜"):
        # User mentioned someone: /history @username or /history Name
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            # Try to find by name
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("📜"):
            # Button press - user wants their own history but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свою историю, нужно привязать Telegram к игроку:\n"
                "• <code>/link @username</code> - если знаешь свой ник\n"
                "• <code>/players</code> - посмотреть всех игроков\n"
                "• <code>/history @username</code> - посмотреть чужую историю\n\n"
                "Или попроси админа добавить тебя командой <code>/addplayer</code>",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    # Find all matches with this player
    player_matches = []
    for match in db.matches.values():
        if target_player.id in match.team_a or target_player.id in match.team_b:
            player_matches.append(match)
    
    if not player_matches:
        await m.answer(f"{target_player.name} ещё не сыграл ни одного матча.")
        return
    
    # Sort by date (newest first)
    player_matches.sort(key=lambda m: (m.date, m.id), reverse=True)
    
    # Limit to last 15 matches
    player_matches = player_matches[:15]
    
    # Number emojis for scores
    num_emoji = {
        0: "0⃣", 1: "1⃣", 2: "2⃣", 3: "3⃣", 4: "4⃣",
        5: "5⃣", 6: "6⃣", 7: "7⃣", 8: "8⃣", 9: "9⃣"
    }
    
    lines = [f"📜 История: {target_player.name} (последние 15)\n"]
    
    for match in player_matches:
        # Determine if player was in team A or B
        in_team_a = target_player.id in match.team_a
        
        if in_team_a:
            my_team = match.team_a
            opponent_team = match.team_b
            my_score = match.score_a
            opp_score = match.score_b
        else:
            my_team = match.team_b
            opponent_team = match.team_a
            my_score = match.score_b
            opp_score = match.score_a
        
        # Get teammate name
        teammate_id = [p for p in my_team if p != target_player.id][0]
        teammate = db.players.get(teammate_id)
        teammate_name = teammate.name if teammate else f"#{teammate_id}"
        
        # Get opponent names
        opp_names = [db.players.get(p).name if db.players.get(p) else f"#{p}" 
                    for p in opponent_team]
        
        # Format date
        match_date = datetime.fromisoformat(match.date)
        date_str = match_date.strftime("%d.%m")
        
        # Format scores with emojis
        my_score_emoji = num_emoji.get(my_score, str(my_score))
        opp_score_emoji = num_emoji.get(opp_score, str(opp_score))
        
        # Win/loss indicator
        result = "✅" if my_score > opp_score else "❌"
        
        # Format match type emoji
        type_emoji = "🎾" if match.type == "to6" else ("🏸" if match.type == "to4" else "🎯")
        
        line = (f"{date_str} {type_emoji} {result} + {teammate_name} "
                f"{my_score_emoji} — {opp_score_emoji} {' + '.join(opp_names)}\n")
        lines.append(line)
    
    await m.answer("".join(lines))


@dp.message(Command("streak"))
async def streak_cmd(m: Message):
    db = read_db()
    
    # Check if user mentioned someone
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user  
    if len(text_parts) > 1 and not text_parts[0].startswith("🔥"):
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("🔥"):
            # Button press - user wants their own streak but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свои серии, нужно привязать Telegram к игроку:\n"
                "• <code>/link @username</code> - если знаешь свой ник\n"
                "• <code>/players</code> - посмотреть всех игроков\n"
                "• <code>/streak @username</code> - посмотреть чужие серии\n\n"
                "Или попроси админа добавить тебя командой <code>/addplayer</code>",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    streaks = get_player_streaks(db, target_player.id)
    
    if streaks["current"] == 0:
        await m.answer(f"{target_player.name} ещё не сыграл ни одного матча.", reply_markup=get_main_keyboard())
        return
    
    current_emoji = "🔥" if streaks["current_type"] == "win" else "❄️"
    current_text = "победы" if streaks["current_type"] == "win" else "поражения"
    
    message = (
        f"🔥 Серии: {target_player.name}\n\n"
        f"Текущая серия: {current_emoji} {streaks['current']} {current_text} подряд\n"
        f"Лучшая серия побед: 🔥 {streaks['best_win']} матч(ей)\n"
        f"Худшая серия поражений: ❄️ {streaks['worst_loss']} матч(ей)"
    )
    
    await m.answer(message, reply_markup=get_main_keyboard())


@dp.message(Command("versus"))
async def versus_cmd(m: Message):
    db = read_db()
    
    text_parts = m.text.split()
    if len(text_parts) < 3:
        await m.answer("Используй: /versus @player1 @player2")
        return
    
    # Find both players
    players = []
    for i in range(1, 3):
        mention = text_parts[i].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            player = next((p for p in db.players.values() 
                          if p.name.lower() == mention), None)
        else:
            player = next((p for p in db.players.values() 
                          if p.name.lower() == mention.lower()), None)
        if player:
            players.append(player)
    
    if len(players) < 2:
        await m.answer("Не удалось найти обоих игроков.")
        return
    
    p1, p2 = players
    stats = get_versus_stats(db, p1.id, p2.id)
    
    if stats["total"] == 0:
        await m.answer(f"{p1.name} и {p2.name} ещё не встречались друг против друга.")
        return
    
    p1_wr = (stats["p1_wins"] / stats["total"] * 100) if stats["total"] > 0 else 0
    p2_wr = (stats["p2_wins"] / stats["total"] * 100) if stats["total"] > 0 else 0
    
    message = (
        f"⚔️ Противостояние:\n"
        f"{p1.name} vs {p2.name}\n\n"
        f"Личные встречи: {stats['total']} матч(ей)\n"
        f"Победы {p1.name}: {stats['p1_wins']} ({p1_wr:.1f}%)\n"
        f"Победы {p2.name}: {stats['p2_wins']} ({p2_wr:.1f}%)\n"
        f"Средний счёт: {stats['avg_p1']:.1f} — {stats['avg_p2']:.1f}"
    )
    
    await m.answer(message)


@dp.message(Command("form"))
async def form_cmd(m: Message):
    db = read_db()
    
    # Check if user mentioned someone
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user
    if len(text_parts) > 1 and not text_parts[0].startswith("📈"):
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("📈"):
            # Button press - user wants their own form but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свою форму, нужно привязать Telegram к игроку:\n"
                "• <code>/link @username</code> - если знаешь свой ник\n"
                "• <code>/players</code> - посмотреть всех игроков\n"
                "• <code>/form @username</code> - посмотреть чужую форму\n\n"
                "Или попроси админа добавить тебя командой <code>/addplayer</code>",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    # Get last matches
    player_matches = []
    for match in db.matches.values():
        if target_player.id in match.team_a or target_player.id in match.team_b:
            player_matches.append(match)
    
    if not player_matches:
        await m.answer(f"{target_player.name} ещё не сыграл ни одного матча.")
        return
    
    player_matches.sort(key=lambda m: (m.date, m.id), reverse=True)
    
    # Last 5 and 10
    last_5 = player_matches[:5]
    last_10 = player_matches[:10]
    
    def count_wins(matches):
        wins = 0
        for match in matches:
            if target_player.id in match.team_a:
                if match.score_a > match.score_b:
                    wins += 1
            else:
                if match.score_b > match.score_a:
                    wins += 1
        return wins
    
    wins_5 = count_wins(last_5)
    wins_10 = count_wins(last_10)
    
    # Form string for last 5
    form_str = ""
    for match in reversed(last_5):
        if target_player.id in match.team_a:
            form_str += "✅" if match.score_a > match.score_b else "❌"
        else:
            form_str += "✅" if match.score_b > match.score_a else "❌"
    
    wr_5 = (wins_5 / len(last_5) * 100) if last_5 else 0
    wr_10 = (wins_10 / len(last_10) * 100) if last_10 else 0
    
    message = (
        f"📈 Форма: {target_player.name}\n\n"
        f"{form_str}\n\n"
        f"Последние {len(last_5)}: {wins_5}-{len(last_5)-wins_5} ({wr_5:.0f}%)\n"
        f"Последние {len(last_10)}: {wins_10}-{len(last_10)-wins_10} ({wr_10:.0f}%)"
    )
    
    await m.answer(message)


@dp.message(Command("records"))
async def records_cmd(m: Message):
    db = read_db()
    records = get_league_records(db)
    
    if not records.get("highest_player"):
        await m.answer("Недостаточно данных для рекордов.", reply_markup=get_main_keyboard())
        return
    
    lines = ["🏆 <b>РЕКОРДЫ ЛИГИ:</b>\n"]
    
    # === РЕЙТИНГИ ===
    lines.append("📈 <b>Рейтинги:</b>")
    if records.get("highest_player"):
        player = db.players.get(records["highest_player"])
        date_str = f" ({format_date_ru(records['highest_date'])})" if records.get("highest_date") else ""
        lines.append(f"🥇 Самый высокий: {player.name} ({records['highest_rating']:.1f}){date_str}")
    
    if records.get("lowest_player"):
        player = db.players.get(records["lowest_player"])
        date_str = f" ({format_date_ru(records['lowest_date'])})" if records.get("lowest_date") else ""
        lines.append(f"📉 Самый низкий: {player.name} ({records['lowest_rating']:.1f}){date_str}")
    
    lines.append("")
    
    # === АКТИВНОСТЬ ===
    lines.append("⚡ <b>Активность:</b>")
    if records.get("most_matches_player"):
        player = db.players.get(records["most_matches_player"])
        lines.append(f"🎾 Самый активный: {player.name} ({records['most_matches']} матчей)")
    
    lines.append("")
    
    # === ВИНРЕЙТЫ ===
    lines.append("🎯 <b>Винрейты (мин 5 матчей):</b>")
    if records.get("best_wr_player"):
        player = db.players.get(records["best_wr_player"])
        lines.append(f"✅ Лучший: {player.name} ({records['best_wr']:.1f}%)")
    
    if records.get("worst_wr_player"):
        player = db.players.get(records["worst_wr_player"])
        lines.append(f"❌ Худший: {player.name} ({records['worst_wr']:.1f}%)")
    
    lines.append("")
    
    # === СТРИКИ ===
    lines.append("🔥 <b>Стрики:</b>")
    if records.get("longest_win_player"):
        player = db.players.get(records["longest_win_player"])
        date_str = f" ({format_date_ru(records['longest_win_date'])})" if records.get("longest_win_date") else ""
        lines.append(f"🏆 Лучшая серия побед: {player.name} ({records['longest_win_streak']} матчей){date_str}")
    
    if records.get("longest_loss_player"):
        player = db.players.get(records["longest_loss_player"])
        date_str = f" ({format_date_ru(records['longest_loss_date'])})" if records.get("longest_loss_date") else ""
        lines.append(f"💔 Худшая серия поражений: {player.name} ({records['longest_loss_streak']} матчей){date_str}")
    
    lines.append("")
    
    # === ДУЭТЫ ===
    lines.append("👥 <b>Лучшие/худшие дуэты:</b>")
    if records.get("best_duo_player"):
        player = db.players.get(records["best_duo_player"])
        games = records.get("best_duo_games")
        games_text = f", {games} игр" if games is not None else ""
        lines.append(f"💪 Лучший дуэт: {player.name} + {records['best_duo_partner']} ({records['best_duo_wr']:.1f}%{games_text})")
    
    if records.get("worst_duo_player"):
        player = db.players.get(records["worst_duo_player"])
        games = records.get("worst_duo_games")
        games_text = f", {games} игр" if games is not None else ""
        lines.append(f"😅 Худший дуэт: {player.name} + {records['worst_duo_partner']} ({records['worst_duo_wr']:.1f}%{games_text})")
    
    lines.append("")
    
    # === СЧЕТЫ ===
    lines.append("⚽ <b>Счета:</b>")
    if records.get("biggest_win"):
        match = records["biggest_win"]
        team_a = [db.players.get(p).name for p in match.team_a]
        team_b = [db.players.get(p).name for p in match.team_b]
        lines.append(f"💥 Самая крупная победа: {' + '.join(team_a)} vs {' + '.join(team_b)} ({match.score_a}-{match.score_b})")
    
    await m.answer("\n".join(lines), parse_mode="HTML", reply_markup=get_main_keyboard())


@dp.message(Command("h2h"))
async def h2h_cmd(m: Message):
    db = read_db()
    
    text_parts = m.text.split()
    if len(text_parts) < 3:
        await m.answer("Используй: /h2h @player1 @player2")
        return
    
    # Find both players
    players = []
    for i in range(1, 3):
        mention = text_parts[i].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            player = next((p for p in db.players.values() 
                          if p.name.lower() == mention), None)
        else:
            player = next((p for p in db.players.values() 
                          if p.name.lower() == mention.lower()), None)
        if player:
            players.append(player)
    
    if len(players) < 2:
        await m.answer("Не удалось найти обоих игроков.")
        return
    
    p1, p2 = players
    stats = get_pair_stats(db, p1.id, p2.id)
    
    if stats["total"] == 0:
        await m.answer(f"{p1.name} и {p2.name} ещё не играли вместе.")
        return
    
    ratings = rating_table(db)
    avg_rating = (ratings.get(p1.id, START_RATING) + ratings.get(p2.id, START_RATING)) / 2
    
    message = (
        f"🤝 В паре: {p1.name} + {p2.name}\n\n"
        f"Вместе сыграли: {stats['total']} матч(ей)\n"
        f"Побед: {stats['wins']} ({stats['win_rate']:.1f}%)\n"
        f"Поражений: {stats['losses']}\n"
        f"Средний рейтинг пары: {avg_rating:.1f}"
    )
    
    await m.answer(message)


@dp.message(Command("leaderboard"))
async def leaderboard_cmd(m: Message):
    db = read_db()
    
    text_parts = m.text.split()
    category = text_parts[1] if len(text_parts) > 1 else "rating"
    
    if category not in ["rating", "wins", "matches", "winrate"]:
        await m.answer("Используй: /leaderboard [rating/wins/matches/winrate]")
        return
    
    all_stats = {}
    ratings = rating_table(db)
    
    for pid, player in db.players.items():
        stats = get_player_stats(db, pid)
        all_stats[pid] = {
            "name": player.name,
            "rating": ratings.get(pid, START_RATING),
            "wins": stats["wins"],
            "matches": stats["matches"],
            "winrate": stats["win_rate"]
        }
    
    # Sort by category
    if category == "rating":
        sorted_players = sorted(all_stats.items(), key=lambda x: x[1]["rating"], reverse=True)
        title = "🏆 Топ по рейтингу:"
    elif category == "wins":
        sorted_players = sorted(all_stats.items(), key=lambda x: x[1]["wins"], reverse=True)
        title = "🏆 Топ по победам:"
    elif category == "matches":
        sorted_players = sorted(all_stats.items(), key=lambda x: x[1]["matches"], reverse=True)
        title = "🏆 Топ по активности:"
    else:  # winrate
        qualified = {k: v for k, v in all_stats.items() if v["matches"] >= 10}
        sorted_players = sorted(qualified.items(), key=lambda x: x[1]["winrate"], reverse=True)
        title = "🏆 Топ по винрейту (мин 10 матчей):"
    
    lines = [title + "\n"]
    for pos, (pid, data) in enumerate(sorted_players[:10], start=1):
        if category == "rating":
            lines.append(f"{pos}. {data['name']} — {data['rating']:.1f}")
        elif category == "wins":
            lines.append(f"{pos}. {data['name']} — {data['wins']} побед")
        elif category == "matches":
            lines.append(f"{pos}. {data['name']} — {data['matches']} матчей")
        else:
            lines.append(f"{pos}. {data['name']} — {data['winrate']:.1f}%")
    
    await m.answer("\n".join(lines))


@dp.message(Command("pairs"))
async def pairs_cmd(m: Message):
    """Show top pairs by rating."""
    db = read_db()
    
    # If no pairs exist, initialize from history
    if not db.pairs:
        initialize_pairs_from_history(db)
        write_db(db)
        db = read_db()  # Re-read after initialization
    
    pairs_data = get_pairs_rating(db)
    
    if not pairs_data:
        await m.answer("Пока нет пар с матчами.", reply_markup=get_main_keyboard())
        return
    
    lines = ["👥 <b>ТОП ПАР ПО РЕЙТИНГУ:</b>\n"]
    
    for pos, (pair_id, pair) in enumerate(list(pairs_data.items())[:10], start=1):
        p1 = db.players.get(pair.player1_id)
        p2 = db.players.get(pair.player2_id)
        
        if not p1 or not p2:
            continue
        
        # Medal emoji for top 3
        medal = ""
        if pos == 1:
            medal = "🥇 "
        elif pos == 2:
            medal = "🥈 "
        elif pos == 3:
            medal = "🥉 "
        
        win_rate = (pair.wins / pair.matches * 100) if pair.matches > 0 else 0
        
        line = (
            f"{medal}{pos}. <b>{p1.name} + {p2.name}</b>\n"
            f"   Рейтинг: {pair.rating:.1f} | "
            f"Матчи: {pair.matches} | "
            f"Винрейт: {win_rate:.0f}%\n"
        )
        lines.append(line)
    
    await m.answer("\n".join(lines), parse_mode="HTML", reply_markup=get_main_keyboard())


@dp.message(Command("initpairs"))
async def initpairs_cmd(m: Message):
    """Initialize pair ratings from match history."""
    db = read_db()
    
    if not db.matches:
        await m.answer("Нет матчей для инициализации пар.", reply_markup=get_main_keyboard())
        return
    
    initialize_pairs_from_history(db)
    write_db(db)
    
    pairs_count = len(db.pairs)
    await m.answer(f"✅ Инициализировано {pairs_count} пар из истории матчей.", reply_markup=get_main_keyboard())


@dp.message(Command("predict"))
async def predict_cmd(m: Message):
    db = read_db()
    
    # Parse: /predict @A @B vs @C @D
    text_parts = m.text.split()
    if len(text_parts) < 6 or "vs" not in text_parts:
        await m.answer("Используй: /predict @player1 @player2 vs @player3 @player4")
        return
    
    try:
        vs_idx = text_parts.index("vs")
        team_a_names = text_parts[1:vs_idx]
        team_b_names = text_parts[vs_idx+1:vs_idx+3]
        
        if len(team_a_names) != 2 or len(team_b_names) != 2:
            await m.answer("Каждая команда должна состоять из двух игроков.")
            return
        
        # Find players
        def find_player(name):
            name = name.strip()
            if name.startswith("@"):
                name = name[1:].lower()
            return next((p for p in db.players.values() 
                        if p.name.lower() == name.lower()), None)
        
        team_a = [find_player(n) for n in team_a_names]
        team_b = [find_player(n) for n in team_b_names]
        
        if None in team_a or None in team_b:
            await m.answer("Не удалось найти всех игроков.")
            return
        
        ratings = rating_table(db)
        
        r_a = (ratings.get(team_a[0].id, START_RATING) + ratings.get(team_a[1].id, START_RATING)) / 2
        r_b = (ratings.get(team_b[0].id, START_RATING) + ratings.get(team_b[1].id, START_RATING)) / 2
        
        prob_a = expected(r_a, r_b)
        prob_b = 1 - prob_a
        
        # Expected score
        exp_score_a = 3 + (prob_a - 0.5) * 6
        exp_score_b = 3 + (prob_b - 0.5) * 6
        
        message = (
            f"🔮 Предсказание матча:\n\n"
            f"{team_a[0].name} + {team_a[1].name} ({r_a:.1f})\n"
            f"vs\n"
            f"{team_b[0].name} + {team_b[1].name} ({r_b:.1f})\n\n"
            f"Вероятность победы:\n"
            f"Team 1: {prob_a*100:.0f}% {'🟢' if prob_a > 0.5 else ''}\n"
            f"Team 2: {prob_b*100:.0f}% {'🟢' if prob_b > 0.5 else ''}\n\n"
            f"Ожидаемый счёт: {exp_score_a:.0f}:{exp_score_b:.0f}"
        )
        
        await m.answer(message)
        
    except Exception as e:
        await m.answer(f"Ошибка разбора команды: {e}")


@dp.message(Command("matches"))
async def matches_cmd(m: Message):
    db = read_db()
    if not db.matches:
        await m.answer("Пока нет сыгранных матчей.")
        return
    
    # Sort matches by date (newest first)
    matches = list(db.matches.values())
    matches.sort(key=lambda match: (match.date, match.id), reverse=True)
    
    # Limit to last 20 matches to avoid message being too long
    matches = matches[:20]
    
    # Number emojis for scores
    num_emoji = {
        0: "0⃣", 1: "1⃣", 2: "2⃣", 3: "3⃣", 4: "4⃣",
        5: "5⃣", 6: "6⃣", 7: "7⃣", 8: "8⃣", 9: "9⃣"
    }
    
    lines = ["📋 История матчей (последние 20):\n"]
    for match in matches:
        # Get player names
        team_a_names = [db.players.get(pid).name if pid in db.players else f"#{pid}" 
                       for pid in match.team_a]
        team_b_names = [db.players.get(pid).name if pid in db.players else f"#{pid}" 
                       for pid in match.team_b]
        
        # Format date
        match_date = datetime.fromisoformat(match.date)
        date_str = match_date.strftime("%d.%m.%Y")
        
        # Format scores with emojis
        score_a_emoji = num_emoji.get(match.score_a, str(match.score_a))
        score_b_emoji = num_emoji.get(match.score_b, str(match.score_b))
        
        # Format match type emoji
        type_emoji = "🎾" if match.type == "to6" else ("🏸" if match.type == "to4" else "🎯")
        
        line = (f"{date_str} {type_emoji}\n"
                f"{' + '.join(team_a_names)} {score_a_emoji}    {score_b_emoji} {' + '.join(team_b_names)}\n")
        lines.append(line)
    
    await m.answer("\n".join(lines))


# ---------- Helper functions for new commands ----------

def get_rating_history(db: DB, player_id: int) -> List[Tuple[datetime, float]]:
    """Get rating history for a player over time."""
    history = []
    
    # Start with initial rating
    current_rating = START_RATING
    history.append((None, START_RATING))  # Initial rating
    
    # Sort matches chronologically
    matches = list(db.matches.values())
    matches.sort(key=lambda m: (m.date, m.id))
    
    # Simulate rating changes over time (using window approach)
    now = _now_utc()
    
    for match in matches:
        dt = datetime.fromisoformat(match.date)
        
        if player_id in match.team_a or player_id in match.team_b:
            # Calculate rating at this point using window
            cutoff = dt - timedelta(days=WINDOW_DAYS)
            ratings = {pid: START_RATING for pid in db.players.keys()}
            
            # Process all matches before this one within window
            for m in matches:
                m_dt = datetime.fromisoformat(m.date)
                if m_dt < cutoff or m_dt > dt:
                    continue
                
                if len(m.team_a) == 2 and len(m.team_b) == 2:
                    a1, a2 = m.team_a
                    b1, b2 = m.team_b
                    rA = (ratings.get(a1, START_RATING) + ratings.get(a2, START_RATING)) / 2.0
                    rB = (ratings.get(b1, START_RATING) + ratings.get(b2, START_RATING)) / 2.0
                    E = expected(rA, rB)
                    T = T_by_type(m.type)
                    S = actual_S(m.score_a, m.score_b, T, m.type)
                    delta_team = K_BASE * L_by_type(m.type) * (S - E)
                    ratings[a1] = ratings.get(a1, START_RATING) + delta_team
                    ratings[a2] = ratings.get(a2, START_RATING) + delta_team
                    ratings[b1] = ratings.get(b1, START_RATING) - delta_team
                    ratings[b2] = ratings.get(b2, START_RATING) - delta_team
            
            if player_id in ratings:
                current_rating = ratings[player_id]
                history.append((dt, current_rating))
    
    return history


def get_top_rivalries(db: DB, limit: int = 10) -> List[Tuple[int, int, int]]:
    """Get top player pairs who play against each other most often."""
    rivalry_counts = {}  # {(p1_id, p2_id): count} where p1_id < p2_id
    
    for match in db.matches.values():
        if len(match.team_a) == 2 and len(match.team_b) == 2:
            # Check all combinations between teams
            for p1 in match.team_a:
                for p2 in match.team_b:
                    pair = tuple(sorted([p1, p2]))
                    rivalry_counts[pair] = rivalry_counts.get(pair, 0) + 1
    
    # Sort by count and return top
    sorted_rivalries = sorted(rivalry_counts.items(), key=lambda x: x[1], reverse=True)
    return [(p1, p2, count) for (p1, p2), count in sorted_rivalries[:limit]]


def get_performance_by_opponent_strength(db: DB, player_id: int) -> Dict:
    """Get player's performance against strong/weak opponents."""
    ratings = rating_table(db)
    current_player_rating = ratings.get(player_id, START_RATING)
    
    # Categorize opponents
    strong_opponents = []  # Rating > player + 50
    weak_opponents = []  # Rating < player - 50
    equal_opponents = []  # Within +/- 50
    
    for match in db.matches.values():
        if player_id in match.team_a:
            opponent_team = match.team_b
            my_score = match.score_a
            opp_score = match.score_b
        elif player_id in match.team_b:
            opponent_team = match.team_a
            my_score = match.score_b
            opp_score = match.score_a
        else:
            continue
        
        # Calculate average opponent rating at match time
        # For simplicity, use current ratings (could be improved)
        avg_opp_rating = sum(ratings.get(p, START_RATING) for p in opponent_team) / 2
        
        won = my_score > opp_score
        diff = avg_opp_rating - current_player_rating
        
        if diff > 50:
            strong_opponents.append((won, diff))
        elif diff < -50:
            weak_opponents.append((won, diff))
        else:
            equal_opponents.append((won, diff))
    
    def calc_stats(matches):
        if not matches:
            return {"total": 0, "wins": 0, "losses": 0, "win_rate": 0}
        wins = sum(1 for won, _ in matches if won)
        return {
            "total": len(matches),
            "wins": wins,
            "losses": len(matches) - wins,
            "win_rate": (wins / len(matches) * 100) if matches else 0
        }
    
    return {
        "vs_strong": calc_stats(strong_opponents),
        "vs_weak": calc_stats(weak_opponents),
        "vs_equal": calc_stats(equal_opponents),
        "current_rating": current_player_rating
    }


# ---------- New commands ----------

@dp.message(Command("progress"))
async def progress_cmd(m: Message):
    """Show player's rating progress over time."""
    db = read_db()
    
    # Check if user mentioned someone or wants their own stats
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user
    if len(text_parts) > 1 and not text_parts[0].startswith("🎯"):
        # User mentioned someone: /progress @username or /progress Name
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("🎯"):
            # Button press - user wants their own progress but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свой прогресс, нужно привязать Telegram к игроку:\n"
                "• <code>/link @username</code> - если знаешь свой ник\n"
                "• <code>/players</code> - посмотреть всех игроков\n"
                "• <code>/progress @username</code> - посмотреть чужой прогресс\n\n"
                "Или попроси админа добавить тебя командой <code>/addplayer</code>",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    history = get_rating_history(db, target_player.id)
    
    if len(history) < 2:
        await m.answer(f"{target_player.name} ещё не играл достаточно матчей для истории рейтинга.")
        return
    
    # Get current rating
    current_ratings = rating_table(db)
    current_rating = current_ratings.get(target_player.id, START_RATING)
    
    # Calculate stats
    ratings_only = [r for _, r in history]
    peak_rating = max(ratings_only)
    min_rating = min(ratings_only)
    start_rating = ratings_only[0]
    
    # Find peak date
    peak_date = None
    for dt, rating in history:
        if rating == peak_rating:
            peak_date = dt
            break
    
    # Calculate change
    rating_change = current_rating - start_rating
    change_emoji = "📈" if rating_change > 0 else "📉" if rating_change < 0 else "➡️"
    change_sign = "+" if rating_change > 0 else ""
    
    message = (
        f"📊 Прогресс: {target_player.name}\n\n"
        f"🏆 Текущий рейтинг: {current_rating:.1f}\n"
        f"{change_emoji} Изменение: {change_sign}{rating_change:.1f} ({current_rating:.1f} - {start_rating:.1f})\n\n"
        f"📈 Пик рейтинга: {peak_rating:.1f}"
    )
    
    if peak_date:
        peak_date_str = format_date_ru(peak_date.isoformat())
        message += f" ({peak_date_str})"
    
    message += f"\n📉 Минимум: {min_rating:.1f}\n"
    message += f"🎯 Стартовый: {start_rating:.1f}\n"
    message += f"📏 Диапазон: {peak_rating - min_rating:.1f} очков"
    
    await m.answer(message, reply_markup=get_main_keyboard())


@dp.message(Command("rivalry"))
async def rivalry_cmd(m: Message):
    """Show top player rivalries (most frequent matchups)."""
    db = read_db()
    
    if not db.matches:
        await m.answer("Пока нет матчей для анализа противостояний.")
        return
    
    rivalries = get_top_rivalries(db, limit=10)
    
    if not rivalries:
        await m.answer("Недостаточно данных для анализа противостояний.")
        return
    
    lines = ["⚔️ <b>ТОП ПРОТИВОСТОЯНИЙ:</b>\n"]
    
    for pos, (p1_id, p2_id, count) in enumerate(rivalries, start=1):
        p1 = db.players.get(p1_id)
        p2 = db.players.get(p2_id)
        
        if not p1 or not p2:
            continue
        
        # Get head-to-head stats
        h2h = get_versus_stats(db, p1_id, p2_id)
        
        medal = ""
        if pos == 1:
            medal = "🥇 "
        elif pos == 2:
            medal = "🥈 "
        elif pos == 3:
            medal = "🥉 "
        
        line = (
            f"{medal}{pos}. {p1.name} vs {p2.name}\n"
            f"   Встреч: {count} | "
            f"Побед {p1.name}: {h2h['p1_wins']} | "
            f"Побед {p2.name}: {h2h['p2_wins']}\n"
        )
        lines.append(line)
    
    await m.answer("\n".join(lines), parse_mode="HTML", reply_markup=get_main_keyboard())


@dp.message(Command("performance"))
async def performance_cmd(m: Message):
    """Show player's performance against strong/weak opponents."""
    db = read_db()
    
    # Check if user mentioned someone or wants their own stats
    text_parts = m.text.split()
    target_player = None
    
    # If it's a button press or command without args, use current user
    if len(text_parts) > 1 and not text_parts[0].startswith("💪"):
        # User mentioned someone: /performance @username or /performance Name
        mention = text_parts[1].strip()
        if mention.startswith("@"):
            mention = mention[1:].lower()
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention), None)
        else:
            target_player = next((p for p in db.players.values() 
                                if p.name.lower() == mention.lower()), None)
    else:
        # Button press or no args - use current user
        target_player = next((p for p in db.players.values() 
                            if p.tg_id == m.from_user.id), None)
    
    if not target_player:
        if len(text_parts) == 1 or text_parts[0].startswith("💪"):
            # Button press - user wants their own performance but not linked
            await m.answer(
                "🔗 <b>Аккаунт не привязан!</b>\n\n"
                "Чтобы видеть свою производительность, нужно привязать Telegram к игроку:\n"
                "• <code>/link @username</code> - если знаешь свой ник\n"
                "• <code>/players</code> - посмотреть всех игроков\n"
                "• <code>/performance @username</code> - посмотреть чужую производительность\n\n"
                "Или попроси админа добавить тебя командой <code>/addplayer</code>",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
        else:
            # User mentioned someone but not found
            await m.answer("Падла не найдена. Используй /players чтобы посмотреть всех игроков.", reply_markup=get_main_keyboard())
        return
    
    perf = get_performance_by_opponent_strength(db, target_player.id)
    
    if perf["vs_strong"]["total"] == 0 and perf["vs_weak"]["total"] == 0 and perf["vs_equal"]["total"] == 0:
        await m.answer(f"{target_player.name} ещё не играл достаточно матчей для анализа.")
        return
    
    message = (
        f"📊 <b>Производительность против разных соперников</b>\n"
        f"Игрок: {target_player.name}\n"
        f"🏆 Текущий рейтинг: {perf['current_rating']:.1f}\n\n"
        f"<i>Статистика разбита по силе соперников (средний рейтинг команды противника относительно твоего рейтинга):</i>\n\n"
    )
    
    if perf["vs_strong"]["total"] > 0:
        strong = perf["vs_strong"]
        message += (
            f"💪 <b>Против сильных (+50 и выше):</b>\n"
            f"   Соперники с рейтингом минимум на 50 очков выше\n"
            f"   {strong['wins']}-{strong['losses']} ({strong['win_rate']:.0f}%) из {strong['total']} матчей\n\n"
        )
    
    if perf["vs_equal"]["total"] > 0:
        equal = perf["vs_equal"]
        message += (
            f"⚖️ <b>Против равных (±50):</b>\n"
            f"   Соперники с рейтингом в пределах ±50 очков\n"
            f"   {equal['wins']}-{equal['losses']} ({equal['win_rate']:.0f}%) из {equal['total']} матчей\n\n"
        )
    
    if perf["vs_weak"]["total"] > 0:
        weak = perf["vs_weak"]
        message += (
            f"📉 <b>Против слабых (-50 и ниже):</b>\n"
            f"   Соперники с рейтингом минимум на 50 очков ниже\n"
            f"   {weak['wins']}-{weak['losses']} ({weak['win_rate']:.0f}%) из {weak['total']} матчей"
        )
    
    await m.answer(message, parse_mode="HTML", reply_markup=get_main_keyboard())


async def main():
    await dp.start_polling(bot, allowed_updates=["message"])  # polling MVP

if __name__ == "__main__":
    asyncio.run(main())
