#!/usr/bin/env python3
"""
Скрипт для получения TELEGRAM_CHAT_ID

Использование:
1. Временно остановите бота на Railway (Settings -> Stop Service)
2. Добавьте бота в вашу группу/канал
3. Отправьте сообщение в группу
4. Запустите: python get_chat_id.py
5. Скопируйте CHAT_ID и добавьте в переменные окружения
6. Запустите бота обратно на Railway
"""

import os
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    print("❌ Ошибка: BOT_TOKEN не найден в .env файле")
    print("Создайте .env файл с вашим BOT_TOKEN")
    exit(1)

async def get_chat_id():
    print("🔍 Получаю обновления от Telegram...")
    print(f"   Bot token: {BOT_TOKEN[:10]}...")
    print()
    
    async with aiohttp.ClientSession() as session:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    print(f"❌ Ошибка: {response.status}")
                    text = await response.text()
                    print(text)
                    return
                
                data = await response.json()
                
                if not data.get("ok"):
                    print("❌ Ошибка получения обновлений")
                    print(data)
                    return
                
                updates = data.get("result", [])
                
                if not updates:
                    print("⚠️  Нет новых сообщений!")
                    print()
                    print("Что делать:")
                    print("1. Остановите бота на Railway (если запущен)")
                    print("2. Добавьте бота в вашу группу/канал как администратора")
                    print("3. Отправьте любое сообщение в группу")
                    print("4. Запустите этот скрипт снова")
                    print()
                    return
                
                print(f"✅ Найдено обновлений: {len(updates)}")
                print()
                
                found_chats = {}
                
                for update in updates:
                    message = update.get("message", {})
                    chat = message.get("chat", {})
                    
                    if chat:
                        chat_id = chat.get("id")
                        chat_type = chat.get("type")
                        chat_title = chat.get("title", chat.get("username", "Unknown"))
                        
                        if chat_id and chat_id not in found_chats:
                            found_chats[chat_id] = {
                                "type": chat_type,
                                "title": chat_title
                            }
                
                if found_chats:
                    print("📋 Найденные чаты:")
                    print()
                    for chat_id, info in found_chats.items():
                        emoji = "👤" if info["type"] == "private" else "👥" if info["type"] == "group" else "📢"
                        print(f"{emoji} {info['type'].upper()}: {info['title']}")
                        print(f"   CHAT_ID: {chat_id}")
                        print()
                    
                    print("=" * 60)
                    print("🎯 ИСПОЛЬЗУЙТЕ ЭТОТ CHAT_ID:")
                    print()
                    # Берем первый найденный чат (обычно это группа/канал)
                    first_chat_id = list(found_chats.keys())[0]
                    print(f"   TELEGRAM_CHAT_ID={first_chat_id}")
                    print()
                    print("=" * 60)
                    print()
                    print("Добавьте эту переменную:")
                    print("• На Vercel: Settings → Environment Variables → Add")
                    print("• На Railway: Variables → Add")
                    print("• Локально: в .env файл")
                    print()
                else:
                    print("⚠️  Не найдено информации о чатах")
                    print("Попробуйте отправить сообщение боту и запустите скрипт снова")
        
        except Exception as e:
            print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(get_chat_id())

