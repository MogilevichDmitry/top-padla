# Padel Rating Bot — Template

# --- main.py ---
import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardRemove
from dotenv import load_dotenv
import aiohttp
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

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

TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
# TELEGRAM_CHAT_ID - ID группы/канала для автоматической отправки day-summary

# Constants removed - now using web API instead of direct DB access

# ---------- Bot setup ----------
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ---------- Scheduler setup ----------
scheduler = AsyncIOScheduler()


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


async def format_day_summary_message() -> str:
    """Format day summary message with players and upcoming games."""
    try:
        data = await get_day_summary()
        today_str = data.get('today', datetime.now().strftime("%d.%m.%Y"))
        players = data.get('players', [])
        
        if not players:
            message = data.get('message', 'Сегодня не было матчей.')
            
            # Add upcoming games info
            try:
                upcoming_games = await get_upcoming_games()
                if upcoming_games:
                    footer = f"🎾 <b>Предстоящие игры (ближайшие 5 дней):</b>\n"
                    for game in upcoming_games[:5]:
                        game_date = game.get('date', '')
                        start_time_raw = game.get('start_time', '')
                        location = game.get('location', '')
                        attendees = game.get('attendees', [])
                        attendees_count = len(attendees)
                        
                        try:
                            date_obj = datetime.strptime(game_date, "%Y-%m-%d")
                            date_formatted = date_obj.strftime("%d.%m")
                        except:
                            date_formatted = game_date
                        
                        start_time = start_time_raw
                        if ':' in start_time_raw and len(start_time_raw) > 5:
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
                print(f"Error getting upcoming games: {e}")
                footer = (
                    f"💡 <i>Присоединиться или предложить игру: "
                    f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
                )
            
            return f"📅 <b>Итоги дня ({today_str})</b>\n\n{message}\n\n{footer}"
        
        # Format message with players
        header = f"📅 <b>Итоги дня ({today_str})</b>\n"
        subtitle = f"<b>Сегодня играли:</b>\n\n"
        
        max_name_len = max(len(p.get('name', 'Unknown')) for p in players)
        max_name_len = max(max_name_len, 6)
        
        player_lines = []
        for i, player in enumerate(players, 1):
            change = player.get('change', 0.0)
            matches = player.get('matches', 0)
            name = player.get('name', 'Unknown')
            
            if change > 0:
                change_str = f"+{change:.1f}"
                change_emoji = "🟢"
            elif change < 0:
                change_str = f"{change:.1f}"
                change_emoji = "🔴"
            else:
                change_str = "0.0"
                change_emoji = "⚪"
            
            name_padded = name.ljust(max_name_len)
            matches_str = f"({matches} игр)"
            change_with_pts = f"{change_str} pts"
            
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
                message += f"\n\n🎾 <b>Предстоящие игры (ближайшие 5 дней):</b>\n"
                for game in upcoming_games[:5]:
                    game_date = game.get('date', '')
                    start_time_raw = game.get('start_time', '')
                    location = game.get('location', '')
                    attendees = game.get('attendees', [])
                    attendees_count = len(attendees)
                    
                    try:
                        date_obj = datetime.strptime(game_date, "%Y-%m-%d")
                        date_formatted = date_obj.strftime("%d.%m")
                    except:
                        date_formatted = game_date
                    
                    start_time = start_time_raw
                    if ':' in start_time_raw and len(start_time_raw) > 5:
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
            print(f"Error getting upcoming games: {e}")
            message += (
                f"\n\n💡 <i>Присоединиться или предложить игру: "
                f"<a href=\"https://www.qwerty123.eu/schedule\">qwerty123.eu/schedule</a></i>"
            )
        
        return message
    except Exception as e:
        import traceback
        print(f"Error formatting day summary: {e}")
        print(traceback.format_exc())
        return f"❌ Ошибка при получении данных: {str(e)}"


async def send_daily_summary():
    """Send daily summary to Telegram group."""
    if not TELEGRAM_CHAT_ID:
        print("TELEGRAM_CHAT_ID not set, skipping daily summary")
        return
    
    try:
        print("📊 Sending daily summary...")
        message = await format_day_summary_message()
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=message,
            parse_mode="HTML",
            disable_web_page_preview=True
        )
        print("✅ Daily summary sent successfully")
    except Exception as e:
        import traceback
        print(f"❌ Error sending daily summary: {e}")
        print(traceback.format_exc())


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
        message = await format_day_summary_message()
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
    
    # Setup scheduler for daily summary at 22:30 Warsaw time
    try:
        import zoneinfo
        warsaw_tz = zoneinfo.ZoneInfo("Europe/Warsaw")
    except ImportError:
        from zoneinfo import ZoneInfo
        warsaw_tz = ZoneInfo("Europe/Warsaw")
    
    if TELEGRAM_CHAT_ID:
        scheduler.add_job(
            send_daily_summary,
            trigger=CronTrigger(hour=22, minute=30, timezone=warsaw_tz),
            id='daily_summary',
            name='Send daily game summary at 22:30',
            replace_existing=True
        )
        scheduler.start()
        print(f"✅ Scheduled daily summary at 22:30 Warsaw time (chat_id: {TELEGRAM_CHAT_ID})")
    else:
        print("⚠️  TELEGRAM_CHAT_ID not set, daily summary scheduling disabled")
    
    print("✅ Bot started - commands menu removed")
    await dp.start_polling(bot, allowed_updates=["message"])


if __name__ == "__main__":
    asyncio.run(main())
