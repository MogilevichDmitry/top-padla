# Настройка таблиц игр в продакшене

## Быстрая установка через API

После деплоя на Vercel выполните один POST-запрос для создания таблиц:

### Способ 1: Через curl

```bash
curl -X POST https://your-domain.vercel.app/api/setup-games
```

### Способ 2: Через браузер

1. Откройте консоль браузера (F12 → Console)
2. Выполните:

```javascript
fetch('/api/setup-games', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### Способ 3: Через Postman или любой HTTP-клиент

```
POST https://your-domain.vercel.app/api/setup-games
```

## Проверка

После выполнения вы должны увидеть:

```json
{
  "success": true,
  "message": "Game tables created successfully!",
  "tables": ["game_sessions", "game_attendees"]
}
```

Теперь страница `/games` должна работать!

## Альтернатива: SQL в Vercel Dashboard

Если по какой-то причине API не работает:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Storage** → **Postgres** → **Query**
3. Выполните SQL из файла `web/CREATE_GAMES_TABLES.sql`

## Удаление таблиц (если нужно)

Если что-то пошло не так и нужно переустановить:

```sql
DROP TABLE IF EXISTS game_attendees CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
```

Затем снова выполните POST запрос к `/api/setup-games`.

