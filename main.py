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


async def get_upcoming_games(days: int = 5) -> List[Dict]:
    """Get proposed games for the next N days from web API."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{WEB_API_URL}/api/games/upcoming?days={days}") as response:
                if response.status == 200:
                    return await response.json()
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
        
        print("Fetching day summary...")
        data = await get_day_summary()
        print(f"Got data: {data.get('today', 'N/A')}, players: {len(data.get('players', []))}")
        
        today_str = data.get('today', datetime.now().strftime("%d.%m.%Y"))
        players = data.get('players', [])
        
        if not players:
            message = data.get('message', 'Сегодня еще не было матчей.')
            
            # Add upcoming games info
            try:
                upcoming_games = await get_upcoming_games()
                if upcoming_games:
                    footer = f"🎾 <b>Предстоящие игры (ближайшие 5 дней):</b>\n"
                    for game in upcoming_games[:5]:  # Show max 5 games
                        game_date = game.get('date', '')
                        start_time_raw = game.get('start_time', '')
                        location = game.get('location', '')
                        attendees = game.get('attendees', [])
                        attendees_count = len(attendees)
                        
                        # Format date nicely
                        try:
                            date_obj = datetime.strptime(game_date, "%Y-%m-%d")
                            date_formatted = date_obj.strftime("%d.%m")
                        except:
                            date_formatted = game_date
                        
                        # Format time - remove seconds if present (HH:MM:SS -> HH:MM)
                        start_time = start_time_raw
                        if ':' in start_time_raw and len(start_time_raw) > 5:
                            # Time has format HH:MM:SS, take only HH:MM
                            start_time = start_time_raw[:5]
                        
                        footer += (
                            f"• <b>{date_formatted}</b> в {start_time} - {location} "
                            f"({attendees_count} игроков)\n"
                        )
                    footer += (
                        f"\n💡 <i>Присоединиться или предложить игру: "
                        f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
                    )
                else:
                    footer = (
                        f"💡 <i>Присоединиться или предложить игру: "
                        f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
                    )
            except Exception as e:
                # If we can't get games, still show the basic link
                print(f"Error getting upcoming games: {e}")
                footer = (
                    f"💡 <i>Присоединиться или предложить игру: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
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
            print("Fetching upcoming games...")
            upcoming_games = await get_upcoming_games()
            print(f"Got {len(upcoming_games)} upcoming games")
            if upcoming_games:
                message += f"\n\n🎾 <b>Предстоящие игры (ближайшие 5 дней):</b>\n"
                for game in upcoming_games[:5]:  # Show max 5 games
                    game_date = game.get('date', '')
                    start_time_raw = game.get('start_time', '')
                    location = game.get('location', '')
                    attendees = game.get('attendees', [])
                    attendees_count = len(attendees)
                    
                    # Format date nicely
                    try:
                        date_obj = datetime.strptime(game_date, "%Y-%m-%d")
                        date_formatted = date_obj.strftime("%d.%m")
                    except:
                        date_formatted = game_date
                    
                    # Format time - remove seconds if present (HH:MM:SS -> HH:MM)
                    start_time = start_time_raw
                    if ':' in start_time_raw and len(start_time_raw) > 5:
                        # Time has format HH:MM:SS, take only HH:MM
                        start_time = start_time_raw[:5]
                    
                    message += (
                        f"• <b>{date_formatted}</b> в {start_time} - {location} "
                        f"({attendees_count} игроков)\n"
                    )
                message += (
                    f"\n💡 <i>Присоединиться или предложить игру: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
                )
            else:
                message += (
                    f"\n\n💡 <i>Присоединиться или предложить игру: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
                )
        except Exception as e:
            # If we can't get games, still show the basic link
            print(f"Error getting upcoming games: {e}")
            message += (
                f"\n\n💡 <i>Присоединиться или предложить игру: "
                f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
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
        print(f"ERROR in day_summary_cmd: {error_details}")
        try:
            await m.answer(
                f"❌ Ошибка при получении данных: {str(e)}\n\n"
                f"Убедитесь, что веб-приложение запущено и WEB_API_URL настроен правильно.",
                reply_markup=ReplyKeyboardRemove()
            )
        except Exception as send_error:
            print(f"ERROR sending error message: {send_error}")


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
