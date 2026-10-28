# Anypedia

Энциклопедия полупрофессиональных турниров Dota 2 с ограничением по ПТС. Статический сайт: без бэкенда, подходит для GitHub Pages.

Сейчас есть только страницы турниров (список и страница турнира). Команды и игроки — позже.

## Структура

```
tournaments/
  index.json              ← генерируется (npm run build), руками не править
  anylvl-cup/             ← один турнир = одна папка (имя папки = адрес #/t/anylvl-cup)
    information.json      ← информация о турнире
    roster.json           ← команды и составы
    result.json           ← итоги: места и матчи
```

## Добавить турнир

1. Создать папку `tournaments/<slug>/` с тремя файлами (`roster.json` и `result.json` можно добавить позже).
2. `npm run build` — обновит `tournaments/index.json` и предупредит об ошибках (команда есть в результатах, но нет в составе; превышен лимит ПТС).
3. Закоммитить.

Локальный просмотр: `npm run serve` → http://localhost:8080

## Форматы файлов

**information.json**
```json
{
  "name": "AnyLvL Cup",
  "organizer": "AnyLvL x GOTF eSports",
  "status": "upcoming | live | finished",
  "date_start": "2026-11-14",
  "date_end": "2026-11-15",
  "format": "Double Elimination, Bo3",
  "pts_cap": 20000,
  "prize_pool": "10 000 ₽",
  "description": "Текст о турнире",
  "links": { "challonge": "", "rules": "", "stream": "" },
  "prizes": [
    { "place": 1, "prize": "5 000 ₽" },
    { "place": 3, "place_to": 4, "prize": "Мерч" }
  ]
}
```
`prizes` — какие места призовые. На странице по умолчанию показываются только они; остальные места раскрываются кнопкой «Все места». Если `prizes` пуст, по умолчанию показывается топ‑3.

**roster.json**
```json
{ "teams": [ { "name": "Команда", "tag": "TAG",
  "players": [ { "nick": "player", "role": "Pos 1", "pts": 4500 } ] } ] }
```
Сумма ПТС команды считается автоматически и сравнивается с `pts_cap`.

**result.json**
```json
{
  "placements": [
    { "place": 1, "team": "Команда" },
    { "place": 5, "label": "5–6", "team": "Другая команда" }
  ],
  "matches": [
    { "round": "Гранд-финал", "team1": "A", "team2": "B", "score1": 3, "score2": 2 }
  ]
}
```
Названия команд в `result.json` должны совпадать с `roster.json`. `matches` необязательны.

> Турнир `anylvl-cup` в репозитории — **тестовые данные** для проверки вёрстки. Замените или удалите.
