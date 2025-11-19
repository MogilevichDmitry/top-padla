# Настройка функции планирования игр

## Проблема: "Failed to fetch games"

Эта ошибка возникает, когда таблицы для игр еще не созданы в базе данных.

## Решение

### Вариант 1: Автоматически через скрипт

Если у вас настроены переменные окружения в `.env.local`:

```bash
cd web
npx tsx scripts/create-game-tables.ts
```

### Вариант 2: Вручную через SQL (рекомендуется для Vercel)

1. Откройте Vercel Dashboard
2. Перейдите в Storage → ваша Postgres база
3. Откройте Query вкладку
4. Выполните следующий SQL:

```sql
-- Создание таблицы игровых сессий
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location VARCHAR(50) NOT NULL DEFAULT 'Padel Point' CHECK (location IN ('Padel Point', 'Zawady')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание таблицы участников
CREATE TABLE IF NOT EXISTS game_attendees (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(date DESC, start_time);
CREATE INDEX IF NOT EXISTS idx_game_attendees_session ON game_attendees(game_session_id);
```

5. Нажмите "Run Query"

### Вариант 3: Через локальный dev сервер

Если у вас запущен локальный dev сервер:

1. Убедитесь, что в `web/.env.local` есть переменные для Postgres:
   ```
   POSTGRES_URL="..."
   POSTGRES_PRISMA_URL="..."
   # и т.д.
   ```

2. Запустите скрипт:
   ```bash
   cd web
   npm run dev  # если еще не запущен
   # В другом терминале:
   npx tsx scripts/create-game-tables.ts
   ```

## Проверка

После создания таблиц:

1. Перезапустите dev сервер (если запущен локально)
2. Или пересоберите на Vercel
3. Откройте страницу `/games`
4. Вы должны увидеть "Пока нет запланированных игр"

## Как использовать

1. Перейдите на страницу `/games`
2. Нажмите "Создать игру"
3. Заполните форму:
   - Выберите дату (календарь покажет день недели)
   - Укажите время начала
   - Опционально: время окончания
   - Выберите место (по умолчанию Padel Point)
   - Введите ваше имя
4. Нажмите "Создать игру"

Чтобы записаться на игру:
1. Найдите игру в списке
2. Нажмите "Иду ✋"
3. Введите ваше имя
4. Ваше имя появится в списке участников

## Структура таблиц

### game_sessions
- `id` - уникальный идентификатор
- `date` - дата игры (YYYY-MM-DD)
- `start_time` - время начала (HH:MM)
- `end_time` - время окончания (опционально)
- `location` - место ('Padel Point' или 'Zawady')
- `created_by` - имя создателя
- `created_at` - время создания записи

### game_attendees
- `id` - уникальный идентификатор
- `game_session_id` - ссылка на игру
- `name` - имя участника
- `created_at` - время записи

## Устранение проблем

### Ошибка "relation does not exist"
Таблицы не созданы. Выполните один из вариантов выше.

### Ошибка "missing_connection_string"
Переменные окружения не настроены. Проверьте `web/.env.local` или используйте Вариант 2 (SQL в Vercel).

### Таблицы созданы, но все равно ошибка
1. Проверьте логи в консоли браузера (F12 → Console)
2. Проверьте логи Vercel (если деплой на Vercel)
3. Убедитесь, что приложение имеет доступ к БД

### Страница /games не открывается
Убедитесь, что:
1. Dev сервер запущен (`npm run dev`)
2. Или приложение задеплоено на Vercel
3. Файлы скомпилированы без ошибок

