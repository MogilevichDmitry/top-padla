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
            await m.answer(
                f"📅 <b>Итоги дня ({today_str})</b>\n\n{message}",
                parse_mode="HTML",
                reply_markup=ReplyKeyboardRemove()
            )
            return
        
        # Format message
        lines = [f"📅 <b>Итоги дня ({today_str})</b>\n", "<b>Сегодня играли:</b>\n"]
        
        for i, player in enumerate(players, 1):
            change = player.get('change', 0.0)
            matches = player.get('matches', 0)
            name = player.get('name', 'Unknown')
            
            change_str = f"+{change:.1f}" if change >= 0 else f"{change:.1f}"
            change_emoji = "📈" if change > 0 else "📉" if change < 0 else "➖"
            lines.append(
                f"{i}. {name} ({matches} игр) {change_emoji} {change_str} очков"
            )
        
        message = "\n".join(lines)
        await m.answer(
            message,
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove()
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
