# Anypedia Bot

Telegram-бот для управления турнирами Dota 2 на сайте [anypedia.ru](https://anypedia.ru).

## Архитектура

Бот работает как долгоживущий Node.js-процесс (long-polling).  
Все изменения данных — коммиты в GitHub-репозиторий сайта через GitHub Contents API.  
Источник истины — `data.js` в корне репозитория.

```
/bot
├── src/
│   ├── index.js              — точка входа (long-polling)
│   ├── config.js             — переменные окружения
│   ├── logger.js             — pino-логгер
│   ├── telegram/             — бот, middleware, команды
│   ├── github/               — Octokit-клиент, очередь коммитов
│   ├── data/                 — парсинг/валидация/сериализация файлов данных
│   ├── activityLog/          — запись в activity-log.json
│   └── workflows/            — оркестрация (команда → коммит → лог)
└── tests/
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

| Переменная | Описание |
|---|---|
| `BOT_TOKEN` | Telegram Bot Token от @BotFather |
| `GITHUB_TOKEN` | Fine-grained PAT (Contents: Read+Write, только этот репо) |
| `GITHUB_OWNER` | GitHub логин или организация (например, `myusername`) |
| `GITHUB_REPO` | Имя репозитория (например, `anypedia`) |
| `GITHUB_BRANCH` | Ветка для коммитов (default: `main`) |
| `ADMIN_TELEGRAM_IDS` | ID администраторов через запятую (получить у @userinfobot) |
| `GIT_COMMITTER_NAME` | Имя в истории коммитов (default: `AnypediaBot`) |
| `GIT_COMMITTER_EMAIL` | Email в истории коммитов |
| `LOG_LEVEL` | `trace`/`debug`/`info`/`warn`/`error` (default: `info`) |
| `NODE_ENV` | `development` (pino-pretty) или `production` |

## Требования к GITHUB_TOKEN

Используйте **Fine-grained Personal Access Token**, а не classic PAT:

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository access: **Only select repositories** → выбрать репозиторий Anypedia
3. Permissions → Repository permissions → **Contents: Read and write**
4. Остальные разрешения не нужны (не давайте лишнего)

## Установка и запуск

```bash
cd bot
npm install

# Локально (development)
cp .env.example .env
# заполнить .env
NODE_ENV=development npm run dev

# Production
npm start
```

## Railway / Render

1. Создайте новый сервис из папки `/bot`
2. Build command: `npm install`
3. Start command: `npm start`
4. Добавьте все переменные из `.env.example` в панель окружения

## Файлы в репозитории сайта (должны существовать до запуска бота)

Бот использует `bracket-engine.js` и `tournament-sync.js` из корня репозитория (Этапы 3–4).  
Убедитесь, что они там закоммичены.

Файлы `admin-data/*.json` бот создаёт **сам** при первом запросе, если их нет.  
Предварительно создавать их не обязательно.

## Команды бота

| Команда | Доступ | Описание |
|---|---|---|
| `/start` | все | Приветствие и список команд |
| `/help` | все | Справка |
| `/draft` | admin, organizer | Подать заявку на новый турнир |
| `/match <id> <matchId> <счёт>` | admin, organizer | Обновить результат матча |
| `/approve <draftId>` | admin | Одобрить черновик (Этап 5) |
| `/reject <draftId> [причина]` | admin | Отклонить черновик (Этап 5) |
| `/subscribe <teamId>` | все | Подписаться на команду (Этап 7) |
| `/unsubscribe <teamId>` | все | Отписаться (Этап 7) |
| `/status` | admin | Статус бота и очередей |

## Добавление организатора

Напишите администратору; он добавит запись в `admin-data/permissions.json` (скоро будет команда `/grant`):

```json
{
  "telegramUserId": 123456789,
  "role": "organizer",
  "organizerId": "Enrage",
  "verifiedAt": "2026-06-20T12:00:00.000Z",
  "verifiedByTelegramId": 987654321
}
```

## Тесты

```bash
npm test
```
