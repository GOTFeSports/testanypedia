# Anypedia

Энциклопедия полупрофессиональных турниров Dota 2 с ограничением по ПТС. Статический сайт без бэкенда (GitHub Pages / Vercel).

Сейчас есть страницы турниров: список и страница турнира в стиле Liquipedia. Команды и игроки — позже.

## Структура

```
tournaments/
  index.json              ← генерируется (npm run build), руками не править
  anylvl-cup/             ← один турнир = одна папка (адрес: #/t/anylvl-cup)
    information.json      ← информация о турнире (инфобокс, призы, трансляции)
    roster.json           ← команды и составы
    result.json           ← итоги: места, группы, сетка плей-офф
    logo.png              ← логотипы (необязательно, пути указываются в json)
```

## Добавить турнир

1. Создать папку `tournaments/<slug>/` с файлами (`roster.json` и `result.json` можно добавить позже).
2. `npm run build` — обновит `tournaments/index.json` и предупредит об ошибках (команда есть в результатах, но нет в составе; не найден логотип; матч ведёт в несуществующий матч).
3. Закоммитить.

Локальный просмотр: `npm run serve` → http://localhost:8080

Для Vercel нужен `vercel.json`: `{ "framework": null, "buildCommand": "npm run build", "outputDirectory": "." }`

## information.json

```json
{
  "name": "AnyLvL Cup",
  "logo": "logo.png",
  "series": "AnyLvL Cup",
  "organizer": "AnyLvL x GOTF eSports",
  "sponsors": ["Спонсор"],
  "status": "upcoming | live | finished",
  "type": "online | lan | hybrid",
  "server": "Europe East",
  "location": "СНГ",
  "game": "Dota 2",
  "version": "7.41",
  "tier": "Полупрофессиональный",
  "date_start": "2026-11-14",
  "date_end": "2026-11-15",
  "format": ["Групповой этап ...", "Плей-офф ..."],
  "pts_cap": 20000,
  "prize_pool": "10 000 ₽",
  "description": "Текст о турнире",
  "links": { "challonge": "", "rules": "", "discord": "", "telegram": "", "vk": "" },
  "chronology": { "previous": { "name": "…", "slug": "…" }, "next": { "name": "…" } },
  "prizes": [
    { "place": 1, "prize": "5 000 ₽" },
    { "place": 3, "place_to": 4, "prize": "Мерч" }
  ],
  "streams": [ { "lang": "ru", "platform": "twitch", "url": "https://…" } ]
}
```
Все поля необязательны, пустые не показываются. `pts_cap` — лимит ПТС, показывается только в инфобоксе.
`prizes` — какие места призовые: по умолчанию в таблице видны только они, остальные места раскрываются кнопкой.

## roster.json

```json
{ "teams": [ {
  "name": "Команда",
  "logo": "teams/team.png",
  "status": "invited | qualified | registered",
  "qualifier": "Открытая квалификация · 1 место",
  "players": [ { "nick": "player", "country": "ru" } ],
  "subs":  [ { "nick": "sub", "country": "ua" } ],
  "coach": { "nick": "coach", "country": "kz" }
} ] }
```
Первые пять `players` получают позиции 1–5 по порядку (или задайте `pos`). `country` — двухбуквенный код страны (флаг подгружается с flagcdn.com).

## result.json

```json
{
  "placements": [
    { "place": 1, "team": "Команда" },
    { "place": 5, "label": "5–8", "team": "Другая команда" }
  ],
  "groups": [ {
    "name": "Группа A", "advance": 2, "teams": ["A", "B", "C", "D"],
    "matches": [ { "team1": "A", "team2": "B", "score1": 2, "score2": 0, "date": "2026-11-14" } ]
  } ],
  "playoffs": { "rounds": [ {
    "name": "Верхняя сетка · полуфиналы",
    "bracket": "upper | lower | final",
    "matches": [ { "id": "ub-sf-1", "team1": "A", "team2": "B", "score1": 2, "score2": 0, "next": "ub-f" } ]
  } ] }
}
```
- Таблицу группы (победы, карты, места) и кросс-таблицу сайт считает сам из `matches`.
- `advance` — сколько команд проходят дальше (подсветка зелёным/красным).
- В плей-оффе `next` — id матча, куда проходит победитель; по нему рисуются линии сетки. `bracket: "final"` — колонка гранд-финала справа.
- Названия команд везде должны совпадать с `roster.json`.
- Если нет групп и сетки, можно дать простой список `"matches": [{ "round": "Финал", "team1": …, "team2": …, "score1": …, "score2": … }]`.

> Турнир `anylvl-cup` в репозитории — **тестовые данные** для проверки вёрстки. Замените или удалите.
