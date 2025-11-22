# Troubleshooting для деплоя бота

## Ошибка: "Conflict: terminated by other getUpdates request"

**Проблема**: Telegram не позволяет запускать несколько экземпляров бота одновременно.

**Решение**:

1. Остановите все локальные процессы бота:

   ```bash
   pkill -f "python.*main.py"
   ```

2. Проверьте, что бот не запущен нигде еще:

   - На других серверах
   - На других платформах (Heroku, Railway, etc.)
   - В других Render сервисах

3. Перезапустите бот на Render (через Dashboard → Restart)

---

## Ошибка: "No open ports detected" или "Port scan timeout reached"

**Проблема**: Вы создали **Web Service** вместо **Background Worker**.

**Решение**:

1. **Удалите текущий Web Service на Render:**

   - Откройте Dashboard → ваш сервис
   - Settings → внизу нажмите "Delete Service"
   - Подтвердите удаление

2. **Создайте новый Background Worker:**

   - Нажмите "New +" → выберите **"Background Worker"** (НЕ Web Service!)
   - Подключите ваш GitHub репозиторий `top-padla`
   - Настройки:
     - Name: `telegram-bot`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python main.py`
     - Plan: `Free`
   - Environment Variables:
     - `BOT_TOKEN` = ваш токен
     - `WEB_API_URL` = `https://qwerty123.eu`

3. **Альтернатива - используйте Blueprint:**
   - "New +" → "Blueprint"
   - Подключите репозиторий
   - Render автоматически загрузит настройки из `render.yaml`

⚠️ **Важно**: Polling бот не требует открытого порта, поэтому используйте **Background Worker**, а не Web Service!

---

## Бот не отвечает после деплоя

**Проверьте**:

1. Environment Variables настроены правильно:

   - `BOT_TOKEN` - должен быть ваш токен от BotFather
   - `WEB_API_URL` - должен быть URL вашего веб-приложения (например, `https://qwerty123.eu`)

2. Логи в Render Dashboard:

   - Откройте Dashboard → ваш сервис → Logs
   - Ищите ошибки подключения к API

3. Веб-приложение работает:
   - Проверьте, что API доступен: `https://qwerty123.eu/api/day-summary`
   - Если API не отвечает, бот не сможет получить данные

---

## Бот запускается, но команды не работают

**Причина**: Возможно, меню команд не удалено или клавиатура не удалена.

**Решение**: Бот автоматически удаляет меню команд при запуске. Проверьте логи - должно быть сообщение "✅ Bot started - commands menu removed".

Если команды не работают:

1. Попробуйте `/start` - бот должен ответить
2. Проверьте, что используете правильный бот (правильный токен)
3. Попробуйте удалить чат с ботом и начать заново
