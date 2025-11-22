# Padel Rating Bot — Template

# --- main.py ---
import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List
from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardRemove
from dotenv import load_dotenv
import aiohttp

# ---------- Config ----------
# Load .env file if it exists (for local development)
# On production platforms (Railway, Render, etc.) variables come from environment
load_dotenv()

# Debug: print all environment variables (without sensitive values)
print("Environment check:")
print(f"BOT_TOKEN exists: {bool(os.getenv('BOT_TOKEN'))}")
print(f"WEB_API_URL: {os.getenv('WEB_API_URL', 'NOT SET')}")

BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    # Try to get from different possible names
    BOT_TOKEN = os.getenv("BOT_TOKEN") or os.environ.get("BOT_TOKEN")
    if not BOT_TOKEN:
        raise RuntimeError(
            "BOT_TOKEN is required. Set it as environment variable.\n"
            f"Current env vars: {list(os.environ.keys())}"
        )

WEB_API_URL = os.getenv("WEB_API_URL", "http://localhost:3000")
# WEB_API_URL - URL веб-приложения для API запросов

# Constants removed - now using web API instead of direct DB access

# ---------- Bot setup ----------
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# ---------- API functions ----------
async def get_day_summary() -> Dict:
    """Get today's summary from web API."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{WEB_API_URL}/api/day-summary") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"API error {response.status}: {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to API: {str(e)}")


async def get_upcoming_games() -> List[Dict]:
    """Get proposed games for the next 5 days from web API."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{WEB_API_URL}/api/games") as response:
                if response.status == 200:
                    games = await response.json()
                    
                    # Filter games for next 5 days
                    now = datetime.now(timezone.utc)
                    warsaw_tz = None
                    try:
                        import zoneinfo
                        warsaw_tz = zoneinfo.ZoneInfo("Europe/Warsaw")
                    except ImportError:
                        from zoneinfo import ZoneInfo
                        warsaw_tz = ZoneInfo("Europe/Warsaw")
                    
                    warsaw_now = now.astimezone(warsaw_tz)
                    today = warsaw_now.date()
                    five_days_later = today + timedelta(days=5)
                    
                    upcoming_games = []
                    for game in games:
                        game_date_str = game.get('date')
                        if not game_date_str:
                            continue
                        
                        # Parse date (YYYY-MM-DD format)
                        try:
                            game_date = datetime.strptime(game_date_str, "%Y-%m-%d").date()
                            
                            # Check if game is in the next 5 days and not in the past
                            if today <= game_date <= five_days_later:
                                # Check if game hasn't passed yet (consider time)
                                if game_date > today:
                                    upcoming_games.append(game)
                                elif game_date == today:
                                    # For today, check if time hasn't passed
                                    start_time_str = game.get('start_time', '00:00')
                                    try:
                                        game_time = datetime.strptime(start_time_str, "%H:%M").time()
                                        current_time = warsaw_now.time()
                                        if game_time >= current_time:
                                            upcoming_games.append(game)
                                    except ValueError:
                                        # If time parsing fails, include the game
                                        upcoming_games.append(game)
                        except ValueError:
                            continue
                    
                    return upcoming_games
                else:
                    error_text = await response.text()
                    raise Exception(f"API error {response.status}: {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to API: {str(e)}")


@dp.message(Command("start"))
async def start_cmd(m: Message):
    # Remove keyboard if exists
    await m.answer(
        "👋 Бот готов к работе!",
        reply_markup=ReplyKeyboardRemove()
    )


@dp.message(Command("day-summary"))
async def day_summary_cmd(m: Message):
    """Show today's game summary with rating changes."""
    try:
        await m.answer("📊 Подсчитываю итоги дня...")
        
        data = await get_day_summary()
        
        today_str = data.get('today', datetime.now().strftime("%d.%m.%Y"))
        players = data.get('players', [])
        
        if not players:
            message = data.get('message', 'Сегодня еще не было матчей.')
            
            # Add upcoming games info
            try:
                upcoming_games = await get_upcoming_games()
                if upcoming_games:
                    footer = (
                        f"💡 <i>Вы можете присоединиться к игре или предложить новую игру "
                        f"по ссылке: <a href=\"https://www.qwerty123.eu/schedule\">"
                        f"https://www.qwerty123.eu/schedule</a></i>"
                    )
                else:
                    footer = (
                        f"💡 <i>Вы можете предложить игру по ссылке: "
                        f"<a href=\"https://www.qwerty123.eu/schedule\">"
                        f"https://www.qwerty123.eu/schedule</a></i>"
                    )
            except Exception as e:
                # If we can't get games, still show the basic link
                print(f"Error getting upcoming games: {e}")
                footer = (
                    f"💡 <i>Вы можете предложить игру по ссылке: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">"
                    f"https://www.qwerty123.eu/schedule</a></i>"
                )
            
            await m.answer(
                f"📅 <b>Итоги дня ({today_str})</b>\n\n"
                f"{message}\n\n"
                f"{footer}",
                parse_mode="HTML",
                reply_markup=ReplyKeyboardRemove(),
                disable_web_page_preview=True
            )
            return
        
        # Format message with aligned columns and better styling
        header = f"📅 <b>Итоги дня ({today_str})</b>\n"
        subtitle = f"<b>Сегодня играли:</b>\n\n"
        
        # Find max width for alignment
        max_name_len = max(len(p.get('name', 'Unknown')) for p in players)
        max_name_len = max(max_name_len, 6)  # Minimum width for alignment
        
        # Format each player with aligned columns
        player_lines = []
        for i, player in enumerate(players, 1):
            change = player.get('change', 0.0)
            matches = player.get('matches', 0)
            name = player.get('name', 'Unknown')
            
            # Format change with color indicators
            if change > 0:
                change_str = f"+{change:.1f}"
                change_emoji = "🟢"
            elif change < 0:
                change_str = f"{change:.1f}"
                change_emoji = "🔴"
            else:
                change_str = "0.0"
                change_emoji = "⚪"
            
            # Format with perfect alignment using monospace
            # Format: "1. Name       (X игр)  🟢 +15.1 pts"
            name_padded = name.ljust(max_name_len)
            matches_str = f"({matches} игр)"
            change_with_pts = f"{change_str} pts"
            
            # Create aligned line - all numbers will be at same position
            line = (
                f"<code>{i}. {name_padded}  {matches_str:>8}  "
                f"{change_emoji} {change_with_pts:>10}</code>"
            )
            player_lines.append(line)
        
        message = header + subtitle + "\n".join(player_lines)
        
        # Add upcoming games info
        try:
            upcoming_games = await get_upcoming_games()
            if upcoming_games:
                message += (
                    f"\n\n💡 <i>Вы можете присоединиться к игре или предложить новую игру "
                    f"по ссылке: <a href=\"https://www.qwerty123.eu/schedule\">"
                    f"https://www.qwerty123.eu/schedule</a></i>"
                )
            else:
                message += (
                    f"\n\n💡 <i>Вы можете предложить игру по ссылке: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">"
                    f"https://www.qwerty123.eu/schedule</a></i>"
                )
        except Exception as e:
            # If we can't get games, still show the basic link
            print(f"Error getting upcoming games: {e}")
            message += (
                f"\n\n💡 <i>Вы можете предложить игру по ссылке: "
                f"<a href=\"https://www.qwerty123.eu/schedule\">"
                f"https://www.qwerty123.eu/schedule</a></i>"
            )
        
        await m.answer(
            message,
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove(),
            disable_web_page_preview=True
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in day_summary_cmd: {error_details}")
        await m.answer(
            f"❌ Ошибка при получении данных: {str(e)}\n\n"
            f"Убедитесь, что веб-приложение запущено и WEB_API_URL настроен правильно.",
            reply_markup=ReplyKeyboardRemove()
        )


@dp.message(Command("removekeyboard"))
async def remove_keyboard_cmd(m: Message):
    """Remove keyboard from chat."""
    await m.answer(
        "✅ Клавиатура удалена!",
        reply_markup=ReplyKeyboardRemove()
    )


async def main():
    # Remove bot commands menu (suggestions) for all scopes
    from aiogram.types import BotCommandScopeDefault, BotCommandScopeAllGroupChats, BotCommandScopeAllPrivateChats
    
    try:
        # Delete commands for default scope (private chats)
        await bot.delete_my_commands(scope=BotCommandScopeDefault())
        # Delete commands for all group chats
        await bot.delete_my_commands(scope=BotCommandScopeAllGroupChats())
        # Delete commands for all private chats
        await bot.delete_my_commands(scope=BotCommandScopeAllPrivateChats())
    except Exception as e:
        print(f"Error deleting bot commands: {e}")
    
    print("✅ Bot started - commands menu removed")
    await dp.start_polling(bot, allowed_updates=["message"])


if __name__ == "__main__":
    asyncio.run(main())
