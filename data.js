// =============================================
//  Anypedia — Tournament Data
//  Добавьте startTime в формате "HH:MM" для
//  отображения таймера обратного отсчёта.
//
//  Дополнительные ссылки для правого меню турнира:
//  links: {
//    dotabuff: "https://...",
//    discord:  "https://...",
//    rules:    "https://...",
//    bracket:  "https://..."
//  }
//  Пустые или отсутствующие ссылки не отображаются.
// =============================================

const tournaments = [
     {
    id: "Test123",
    title: "The Trial of Immortality 5",
    limit: "До 30.000 MMR на команду",
    start: "2026-04-10",
    end: "2026-09-14",
    startTime: "13:00",
    prize: "20.000₽",
    location: "СНГ",
    teams: 32,
    winner: "TBD",
    format: "Double Elimination",
    organizer: "Immortality",
    links: {
        dotabuff: "https://ru.dotabuff.com/esports/leagues/19692-the-trial-of-immortality-season-5",
        discord: "https://discord.gg/Vu8kNs39PX",
        rules: "https://t.me/reglamentbyimmortality",
        bracket: "https://t.me/immsetka"
    },
    teamsList: [],
        casters: [
        { name: "Nix", link: "https://www.twitch.tv/nix"},
    ],
    bracketEmbed: "",
    registrationLink: "https://t.me/questionnaireimm",
    telegramLink: "https://t.me/cultimm",
    description: "The Trial of Immortality 5 — 13-14 июня в 13:00 МСК, Double Elimination, Captains Draft, BO1 (гранд-финал BO3), лимит MMR 30000 на команду (10000 на игрока), 16-32 команды, взнос 750₽, призовой фонд 20000₽ (1-е место — 10000₽, 2-е — 6000₽, 3-е — 4000₽). Организатор: Immortality.",
    prizePool: [
        { place: 1, amount: "10.000₽", team: "" },
        { place: 2, amount: "6.000₽", team: "" },
        { place: 3, amount: "4.000₽", team: "" }
    ]
},
  {
    id: "The-Trial-of-Immortality-5",
    title: "The Trial of Immortality 5",
    limit: "До 30.000 MMR на команду",
    start: "2026-06-13",
    end: "2026-06-14",
    startTime: "13:00",
    prize: "20.000₽",
    location: "СНГ",
    teams: 32,
    winner: "TBD",
    format: "Double Elimination",
    organizer: "Immortality",
    links: {
        dotabuff: "https://ru.dotabuff.com/esports/leagues/19692-the-trial-of-immortality-season-5",
        discord: "https://discord.gg/Vu8kNs39PX",
        rules: "https://t.me/reglamentbyimmortality",
        bracket: "https://t.me/immsetka"
    },
    teamsList: [],
        casters: [
        { name: "pepepainstv", link: "https://twitch.tv/pepepainstv" },
        { name: "waitureally", link: "https://twitch.tv/waitureally" },
        { name: "9kael", link: "https://twitch.tv/9kael" },
        { name: "zyat0r0", link: "https://www.twitch.tv/zyat0r0" },
    ],
    bracketEmbed: "",
    registrationLink: "https://t.me/questionnaireimm",
    telegramLink: "https://t.me/cultimm",
    description: "The Trial of Immortality 5 — 13-14 июня в 13:00 МСК, Double Elimination, Captains Draft, BO1 (гранд-финал BO3), лимит MMR 30000 на команду (10000 на игрока), 16-32 команды, взнос 750₽, призовой фонд 20000₽ (1-е место — 10000₽, 2-е — 6000₽, 3-е — 4000₽). Организатор: Immortality.",
    prizePool: [
        { place: 1, amount: "10.000₽", team: "" },
        { place: 2, amount: "6.000₽", team: "" },
        { place: 3, amount: "4.000₽", team: "" }
    ]
},
  {
    "id": "Special-3-Open-Qual",
    "title": "Special 3: Open Qualification",
    "limit": "Нет данных",
    "start": "2026-07-04",
    "end": "2026-07-04",
    "startTime": "12:00",
    "prize": "TBD",
    "location": "СНГ",
    "teams": 32,
    "winner": "TBD",
    "format": "Single Elimination",
    "organizer": "AnyLvL Community x GOTF eSports",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/3N4Jg6Jpak",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "",
    "telegramLink": "https://t.me/gotf_dota",
    "description": "Без описания.",
    "prizePool": [
        { "place": 1, "amount": "", "team": "" },
        { "place": 2, "amount": "", "team": "" },
        { "place": 3, "amount": "", "team": "" },
        { "place": 4, "amount": "", "team": "" },
    ]
},
  {
    "id": "Special-3-Closed-Qual",
    "title": "Special 3: Closed Qualification",
    "limit": "Нет данных",
    "start": "2026-07-05",
    "end": "2026-07-05",
    "startTime": "12:00",
    "prize": "TBD",
    "location": "СНГ",
    "teams": 8,
    "winner": "TBD",
    "format": "Double Elimination",
    "organizer": "AnyLvL Community x GOTF eSports",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/3N4Jg6Jpak",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "",
    "telegramLink": "https://t.me/gotf_dota",
    "description": "Без описания.",
    "prizePool": [
        { "place": 1, "amount": "", "team": "" },
        { "place": 2, "amount": "", "team": "" },
    ]
},
  {
    "id": "AnyLvL-GOTF-Special-3",
    "title": "AnyLvL x GOTF eSports: Special 3",
    "limit": "Нет данных",
    "start": "2026-07-10",
    "end": "2026-07-12",
    "startTime": "19:00",
    "prize": "TBD",
    "location": "СНГ",
    "teams": 8,
    "winner": "TBD",
    "format": "Swiss Stage + Play offs",
    "organizer": "AnyLvL Community x GOTF eSports",
    "links": {
        "dotabuff": "https://www.dotabuff.com/esports/leagues/19830",
        "discord": "https://discord.gg/3N4Jg6Jpak",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "",
    "telegramLink": "https://t.me/gotf_dota",
    "description": "Без описания.",
    "prizePool": [
        { "place": 1, "amount": "55%", "team": "" },
        { "place": 2, "amount": "30%", "team": "" },
        { "place": 3, "amount": "15%", "team": "" },
    ]
},
  {
    "id": "rampage-pulik-3",
    "title": "RAMPAGE PULIK #3",
    "limit": "До 3.000 MMR на игрока",
    "start": "2026-06-06",
    "end": "2026-06-07",
    "startTime": "16:00",
    "prize": "1.000₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "TBD",
    "format": "Double Elimination",
    "organizer": "RAMPAGE Tournaments",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/yBGQ4ssxH",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "https://t.me/visagebroken",
    "telegramLink": "https://t.me/rampagetournaments",
    "description": "RAMPAGE PULIK #3 — турнир для игроков до 3.000 MMR. Формат Double Elimination (BO1), гранд-финал BO3. Призовой фонд 1.000₽ (может быть увеличен). Дата проведения: 6-7 июня 2026. Регистрация через @visagebroken.",
    "prizePool": [
        { "place": 1, "amount": "1.000₽", "team": "" }
    ]
},
  {
    "id": "reflection-league-1",
    "title": "Reflection League 1",
    "limit": "Без лимита",
    "start": "2026-01-31",
    "end": "2026-01-31",
    "startTime": "18:00 МСК",
    "prize": "6.000₽",
    "location": "СНГ",
    "teams": 27,
    "winner": "Xtreme Gaming Team",
    "format": "Single Elimination",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/3Q4467mA",
        "rules": "",
        "bracket": "https://challonge.com/ru/tzwr8id9"
    },
    "teamsList": [],
    "casters": [
        { "name": "afganlstan", "link": "https://www.twitch.tv/afganlstan" }
    ],
    "bracketEmbed": "https://challonge.com/ru/tzwr8id9/module",
    "registrationLink": "https://docs.google.com/forms/d/e/1FAIpQLSeI13klfIkNtT-z0WLej69ixxzBenvS_KENKx6dpoB4tqwl7w/viewform?usp=header",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League — турнир 5x5 в режиме Captains Mode. Призовой фонд 6000₽. Турнир прошёл 31 января 2026 года в 15:00 МСК. Победитель — Xtreme Gaming Team.",
    "prizePool": [
        { "place": 1, "amount": "6.000₽", "team": "Xtreme Gaming Team" }
    ]
},
  {
    "id": "reflection-league-2",
    "title": "Reflection League 2",
    "limit": "Не указан",
    "start": "2026-02-07",
    "end": "2026-02-07",
    "startTime": "15:00 МСК",
    "prize": "5.000₽",
    "location": "СНГ",
    "teams": 0,
    "winner": "Gavr, getto228, Amurik, okaycool, Abakio",
    "format": "Immortal Draft",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/UezxY8KC",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [],
    "playersList": [
        { "nick": "Gavr", "place": 1 },
        { "nick": "getto228", "place": 1 },
        { "nick": "Amurik", "place": 1 },
        { "nick": "okaycool", "place": 1 },
        { "nick": "Abakio", "place": 1 }
    ],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "https://forms.gle/gASgCHUXQhvyFr7dA",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League №2 в формате Immortal Draft + Captain’s Mode. Индивидуальная регистрация. Игроки играют серию матчей с разными тиммейтами. Победители определяются по количеству побед. Призовой фонд 5000₽ на 5 лучших игроков.",
    "prizePool": [
        { "place": "1-5", "amount": "5000₽ (общий)", "team": "Gavr, getto228, Amurik, okaycool, Abakio" }
    ]
},
  {
    "id": "reflection-league-3",
    "title": "Reflection League 3",
    "limit": "30.000 MMR на команду",
    "start": "2026-02-08",
    "end": "2026-02-08",
    "startTime": "12:00",
    "prize": "8.000₽",
    "location": "СНГ",
    "teams": "13",
    "winner": "Angetsu",
    "format": "Single Elimination",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/CcqKhAhC",
        "rules": "",
        "bracket": "https://challonge.com/ru/5l3ue3ml"
    },
    "teamsList": [],
    "casters": [
        { "name": "afganlstan", "link": "https://www.twitch.tv/afganlstan" }
    ],
    "bracketEmbed": "https://challonge.com/ru/5l3ue3ml/module",
    "registrationLink": "https://forms.gle/219PWqku5hcP5TGMA",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League №3 — турнир 5x5 в Captain’s Mode. Лимит 30 000 MMR на команду. Призовой фонд 8000₽. Дата проведения: 08 февраля 2026 в 12:00 МСК.",
    "prizePool": [
        { "place": 1, "amount": "5.000₽", "team": "Angetsu" },
        { "place": 2, "amount": "3.000₽", "team": "RAKUZAN TEAM" }
    ]
},
  {
    "id": "reflection-league-4",
    "title": "Reflection League 4",
    "limit": "Без лимита MMR",
    "start": "2026-02-21",
    "end": "2026-02-21",
    "startTime": "15:00",
    "prize": "6.000₽",
    "location": "СНГ",
    "teams": 10,
    "winner": "DF JUNIOR 1",
    "format": "Single Elimination",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/68cVcgnM",
        "rules": "",
        "bracket": "https://challonge.com/ru/dk6057ky"
    },
    "teamsList": [],
    "casters": [
        { "name": "afganlstan", "link": "https://www.twitch.tv/afganlstan" }
    ],
    "bracketEmbed": "https://challonge.com/ru/dk6057ky/module",
    "registrationLink": "https://forms.gle/X2HV1nXZi26k2Xr16",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League №4 — турнир 5x5 в режиме Captains Mode без ограничений по MMR. Взнос 500₽ с команды. Призовой фонд 6.000₽. Дата проведения: 21 февраля 2026 в 15:00.",
    "prizePool": [
        { "place": 1, "amount": "6.000₽", "team": "DF JUNIOR 1" }
    ]
},
  {
    "id": "reflection-league-5",
    "title": "Reflection League 5",
    "limit": "Не указан",
    "start": "2026-03-22",
    "end": "2026-03-22",
    "startTime": "14:00",
    "prize": "4.000₽",
    "location": "СНГ",
    "teams": 8,
    "winner": "Xtreme Gaming",
    "format": "Single Elimination",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/Uhzkt32k",
        "rules": "",
        "bracket": "https://challonge.com/ru/htge2ch3"
    },
    "teamsList": [],
    "casters": [
        { "name": "SoInnocent (Zakich)", "link": "https://www.twitch.tv/so1nnocent" },
        { "name": "LCS_RU", "link": "https://www.twitch.tv/lcs_ru" }
    ],
    "bracketEmbed": "https://challonge.com/ru/htge2ch3/module",
    "registrationLink": "https://forms.gle/EtW21qquJmtKXbF57",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League №5 — турнир 5x5 в режиме Captains Mode. Дата проведения: 22 марта 2026 в 14:00. Призовой фонд будет анонсирован. Победитель — Xtreme Gaming.",
    "prizePool": [
        { "place": 1, "amount": "4.000₽", "team": "Xtreme Gaming" },
    ]
},
  {
    "id": "rampage-turik-1",
    "title": "RAMPAGE TURIK #1",
    "limit": "Без ограничений",
    "start": "2026-03-14",
    "end": "2026-03-15",
    "startTime": "13:00",
    "prize": "6.500₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "doublerr",
    "format": "Single Elimination",
    "organizer": "RAMPAGE Tournaments",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/yBGQ4ssxH",
        "rules": "",
        "bracket": "https://challonge.com/ru/RAMPAGETURIK1"
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "https://challonge.com/ru/RAMPAGETURIK1/module",
    "registrationLink": "https://t.me/visagebroken",
    "telegramLink": "https://t.me/rampagetournaments",
    "description": "RAMPAGE TURIK #1 — открытый турнир без ограничений по MMR. Формат Single Elimination (BO1), гранд-финал BO3. Призовой фонд 6500₽ + дополнительные призы от WHYNOT.GAME. Дата проведения: 14-15 марта 2026.",
    "prizePool": [
        { "place": 1, "amount": "6.500₽", "team": "doublerr" }
    ]
},
  {
    "id": "rampage-kurik-4",
    "title": "RAMPAGE KURIK #4",
    "limit": "До 5000 MMR",
    "start": "2026-04-04",
    "end": "2026-04-05",
    "startTime": "13:00",
    "prize": "4.000₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "SiniyLis",
    "format": "Single Elimination",
    "organizer": "RAMPAGE Tournaments",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/yBGQ4ssxH",
        "rules": "",
        "bracket": "https://challonge.com/ru/RAMPAGEKURIK"
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "https://challonge.com/ru/RAMPAGEKURIK/module",
    "registrationLink": "https://t.me/visagebroken",
    "telegramLink": "https://t.me/rampagetournaments",
    "description": "RAMPAGE KURIK #4 — турнир для игроков до 5000 MMR. Формат Single Elimination (BO1), гранд-финал BO3. Призовой фонд 4000₽. Дата проведения: 4-5 апреля 2026.",
    "prizePool": [
        { "place": 1, "amount": "4.000₽", "team": "SiniyLis" }
    ]
},
  {
    "id": "reflection-league-6",
    "title": "Reflection League 6",
    "limit": "До 35.500 MMR на команду",
    "start": "2026-06-07",
    "end": "2026-06-07",
    "startTime": "14:00",
    "prize": "TBD",
    "location": "СНГ",
    "teams": 10,
    "winner": "TBD",
    "format": "Single Elimination",
    "organizer": "Reflection League",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/n2XX8cPu",
        "rules": "https://docs.google.com/document/d/1ZSvI6YmK0SRa3pGnyr01G9_N-Jv4AYSViFMEroqg4uU/edit?usp=sharing",
        "bracket": ""
    },
    "teamsList": [],
    "casters": [
        { "name": "TBD", "link": "" }
    ],
    "bracketEmbed": "",
    "registrationLink": "https://forms.gle/qJir35C6rLjPQn1bA",
    "telegramLink": "https://t.me/reflectionleague",
    "description": "Reflection League #6 — возвращение популярной лиги. Лимит 35 500 MMR на команду. Взнос 500₽ с команды. Дата проведения: 7 июня 2026. Призовой фонд будет объявлен в зависимости от количества участников. Минимум 10 команд для старта турнира.",
    "prizePool": [
        { "place": 1, "amount": "100%", "team": "" },
    ]
},
  {
    "id": "bedlam-battles-season-1",
    "title": "Bedlam Battles Season 1",
    "limit": "До Божество 5",
    "start": "2025-08-23",
    "end": "2025-08-31",
    "startTime": "Обговаривается капитанами",
    "prize": "6.000₽",
    "location": "СНГ",
    "teams": 12,
    "winner": "Team eblan's",
    "format": "Групповой этап (2 группы по 6) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/18569-bedlam-battles-season-1",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "",
        "bracket": "https://challonge.com/ru/BEDLAMBATTLESSEASON1"
    },
    "teamsList": [
        {"name": "Хлопни-Топни", "logo": "dota2.png", "roster": [{"nick": "Ebatov52", "pos": 1}, {"nick": "Chico_loo", "pos": 2}, {"nick": "frishzzz", "pos": 3}, {"nick": "ksuuvie0", "pos": 4}, {"nick": "biglewaff", "pos": 5}]},
        {"name": "Team eblan's", "logo": "dota2.png", "roster": [{"nick": "lagan322", "pos": 1}, {"nick": "homixidehomixidehomixide00", "pos": 2}, {"nick": "zxcviperr342", "pos": 3}, {"nick": "depress3dkid", "pos": 4}, {"nick": "I717na", "pos": 5}]},
        {"name": "Team Vortex", "logo": "dota2.png", "roster": [{"nick": "bombasterqq", "pos": 1}, {"nick": "Foxs3n", "pos": 2}, {"nick": "infant_mortality", "pos": 3}, {"nick": "dania70711", "pos": 4}, {"nick": "Silen_dude", "pos": 5}]},
        {"name": "Team Zei", "logo": "dota2.png", "roster": [{"nick": "klimcxc", "pos": 1}, {"nick": "neverforgetaboutme", "pos": 2}, {"nick": "exsidez", "pos": 3}, {"nick": "w0rds4", "pos": 4}, {"nick": "trnikitaa", "pos": 5}]},
        {"name": "Козел Vanguard", "logo": "dota2.png", "roster": [{"nick": "milkyyyyy25", "pos": 1}, {"nick": "m1qqla006", "pos": 2}, {"nick": "Dendivparizhe", "pos": 3}, {"nick": "eawesr", "pos": 4}, {"nick": "KokiMudi", "pos": 5}]},
        {"name": "brbr patapim", "logo": "dota2.png", "roster": [{"nick": "Hatershello", "pos": 1}, {"nick": "EgorPipa", "pos": 2}, {"nick": "MunashiKibo", "pos": 3}, {"nick": "sh1nor1", "pos": 4}, {"nick": "retarded_as_fuck", "pos": 5}]},
        {"name": "Divider Team", "logo": "dota2.png", "roster": [{"nick": "jokhyi", "pos": 1}, {"nick": "vladesolator", "pos": 2}, {"nick": "mxdgname", "pos": 3}, {"nick": "Zbxocbr", "pos": 4}, {"nick": "Jeeeeest", "pos": 5}]},
        {"name": "EAVT teamm", "logo": "dota2.png", "roster": [{"nick": "master_arith", "pos": 1}, {"nick": "Vkidavyumef", "pos": 2}, {"nick": "spiscloth_PT", "pos": 3}, {"nick": "DurckA79", "pos": 4}, {"nick": "real_boler", "pos": 5}]},
        {"name": "Storm Swift", "logo": "dota2.png", "roster": [{"nick": "sadpasha123", "pos": 1}, {"nick": "stormxddd", "pos": 2}, {"nick": "Daniil_frog", "pos": 3}, {"nick": "constantinios7", "pos": 4}, {"nick": "sheremetov17", "pos": 5}]},
        {"name": "WW Team", "logo": "dota2.png", "roster": [{"nick": "KliMsas", "pos": 1}, {"nick": "pujikcto02", "pos": 2}, {"nick": "dtr221", "pos": 3}, {"nick": "Peredoznkk", "pos": 4}, {"nick": "Iswasez", "pos": 5}]},
        {"name": "Fallen angels", "logo": "dota2.png", "roster": [{"nick": "Sosal_huy_2008", "pos": 1}, {"nick": "Vi_lek", "pos": 2}, {"nick": "vl5pcm", "pos": 3}, {"nick": "nnweerxx", "pos": 4}, {"nick": "", "pos": 5}]},
        {"name": "Грозовые Волки", "logo": "dota2.png", "roster": [{"nick": "chukchsa", "pos": 1}, {"nick": "try_nul_vas", "pos": 2}, {"nick": "aquastill", "pos": 3}, {"nick": "CePabloe", "pos": 4}, {"nick": "Uwexi1", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/BEDLAMBATTLESSEASON1/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Battles Season 1. Групповой этап + Double Elimination. Призовой фонд 6.000₽. Бесплатное участие.",
    "prizePool": [
        {"place": 1, "amount": "3000₽", "team": "Team eblan's"},
        {"place": 2, "amount": "1800₽", "team": "Storm Swift"},
        {"place": 3, "amount": "1200₽", "team": "Team Zei"}
    ]
},
{
    "id": "bedlam-battles-season-2",
    "title": "Bedlam Battles Season 2",
    "limit": "До Божество 5",
    "start": "2025-09-27",
    "end": "2025-10-05",
    "startTime": "Обговаривается капитанами",
    "prize": "7.000₽",
    "location": "СНГ",
    "teams": 14,
    "winner": "AnyRage",
    "format": "Групповой этап (2 группы по 7) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/18739-bedlam-battles-season-2",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "",
        "bracket": "https://challonge.com/ru/BEDLAMBATTLESSEASON2"
    },
    "teamsList": [
        {"name": "Team eblan's", "logo": "dota2.png", "roster": [{"nick": "lagan322", "pos": 1}, {"nick": "fedor22367", "pos": 2}, {"nick": "RostikMuh", "pos": 3}, {"nick": "depress3dkid", "pos": 4}, {"nick": "I717na", "pos": 5}]},
        {"name": "AnyRage", "logo": "dota2.png", "roster": [{"nick": "sadpasha123", "pos": 1}, {"nick": "Miha153867", "pos": 2}, {"nick": "paradox_pog", "pos": 3}, {"nick": "sheremetov17", "pos": 4}, {"nick": "nevercr7", "pos": 5}]},
        {"name": "Team Zei", "logo": "dota2.png", "roster": [{"nick": "klimcxc", "pos": 1}, {"nick": "neverforgetaboutme", "pos": 2}, {"nick": "exsidez", "pos": 3}, {"nick": "isd4nya", "pos": 4}, {"nick": "dAV1Hci", "pos": 5}]},
        {"name": "PIVZAVOD", "logo": "dota2.png", "roster": [{"nick": "Yudyri", "pos": 1}, {"nick": "maryy_dayy", "pos": 2}, {"nick": "takurroo", "pos": 3}, {"nick": "xrch1dmlvlnc", "pos": 4}, {"nick": "arrrf09", "pos": 5}]},
        {"name": "swe1k1k1kteam42", "logo": "dota2.png", "roster": [{"nick": "daxakpotich", "pos": 1}, {"nick": "skibidisensei", "pos": 2}, {"nick": "", "pos": 3}, {"nick": "AYAYAYAKATYA", "pos": 4}, {"nick": "", "pos": 5}]},
        {"name": "TireService", "logo": "dota2.png", "roster": [{"nick": "lsunshie", "pos": 1}, {"nick": "wiiksikqq", "pos": 2}, {"nick": "sepiftx", "pos": 3}, {"nick": "UKGRUT1K", "pos": 4}, {"nick": "Minnik05", "pos": 5}]},
        {"name": "TEAM SPIRT", "logo": "dota2.png", "roster": [{"nick": "lerc0re", "pos": 1}, {"nick": "Kpackawl", "pos": 2}, {"nick": "u_s_e_I_e_s_s", "pos": 3}, {"nick": "schwarz_pussy", "pos": 4}, {"nick": "Cee3ka", "pos": 5}]},
        {"name": "Harakiri Team", "logo": "dota2.png", "roster": [{"nick": "dyrachyo_001", "pos": 1}, {"nick": "Zwonipol", "pos": 2}, {"nick": "collpacse", "pos": 3}, {"nick": "yatorogod3457", "pos": 4}, {"nick": "tertuz", "pos": 5}]},
        {"name": "Nightmares", "logo": "dota2.png", "roster": [{"nick": "seven17teen1717", "pos": 1}, {"nick": "Vlad9s", "pos": 2}, {"nick": "zavarich", "pos": 3}, {"nick": "dAV1Hci", "pos": 4}, {"nick": "Cris_Thompson", "pos": 5}]},
        {"name": "Mopsyarki Team", "logo": "dota2.png", "roster": [{"nick": "ntysko", "pos": 1}, {"nick": "avicexdd666", "pos": 2}, {"nick": "pr0pavshiy1", "pos": 3}, {"nick": "Pikodor", "pos": 4}, {"nick": "Stan4ikere", "pos": 5}]},
        {"name": "Dark Horse", "logo": "dota2.png", "roster": [{"nick": "whattheffuckkk", "pos": 1}, {"nick": "floppyyy31", "pos": 2}, {"nick": "raJlogHi", "pos": 3}, {"nick": "LyMiXD", "pos": 4}, {"nick": "Keks552", "pos": 5}]},
        {"name": "rabbids invasion", "logo": "dota2.png", "roster": [{"nick": "fckwrld765", "pos": 1}, {"nick": "holyrotten", "pos": 2}, {"nick": "mindfvckxd", "pos": 3}, {"nick": "skiter0", "pos": 4}, {"nick": "justbanished", "pos": 5}]},
        {"name": "Хлопни-Топни", "logo": "dota2.png", "roster": [{"nick": "Ebatov52", "pos": 1}, {"nick": "Glebi52", "pos": 2}, {"nick": "Chico_loo", "pos": 3}, {"nick": "ksuuvie0", "pos": 4}, {"nick": "SCorPion_LSPD", "pos": 5}]},
        {"name": "EAVT", "logo": "dota2.png", "roster": [{"nick": "master_arith", "pos": 1}, {"nick": "Vkidavyumef", "pos": 2}, {"nick": "spiscloth_PT", "pos": 3}, {"nick": "DurckA79", "pos": 4}, {"nick": "real_boler", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/BEDLAMBATTLESSEASON2/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Battles Season 2. Групповой этап + Double Elimination. Призовой фонд 7.000₽. Бесплатное участие.",
    "prizePool": [
        {"place": 1, "amount": "3500₽", "team": "AnyRage"},
        {"place": 2, "amount": "2100₽", "team": "Dark Horse"},
        {"place": 3, "amount": "1400₽", "team": "TEAM SPIRT"}
    ]
},
{
    "id": "bedlam-christmas-cup",
    "title": "Bedlam Christmas Cup",
    "limit": "До 7000 MMR",
    "start": "2025-12-06",
    "end": "2025-12-14",
    "startTime": "Обговаривается капитанами",
    "prize": "20.000₽",
    "location": "СНГ",
    "teams": 20,
    "winner": "СТЕПАН PRIME",
    "format": "Групповой этап (4 группы по 5) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/19005-bedlam-christmas-cup",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "https://docs.google.com/document/d/14gt69ju30M_RBacddfdtkvjbNVelFiIjfBoVyDhBUDc/edit?tab=t.0",
        "bracket": "https://challonge.com/ru/BBedlamChristmasCup"
    },
    "teamsList": [
        {"name": "Pereflexiki", "logo": "dota2.png", "roster": [{"nick": "cherryblosssomm", "pos": 1}, {"nick": "xxxshpana", "pos": 2}, {"nick": "azgen007", "pos": 3}, {"nick": "tail5", "pos": 4}, {"nick": "Forgeo_10", "pos": 5}]},
        {"name": "NoLittleCancer", "logo": "dota2.png", "roster": [{"nick": "neriel01", "pos": 1}, {"nick": "Leo07Mego", "pos": 2}, {"nick": "Sir_Damind", "pos": 3}, {"nick": "e_cherentsov", "pos": 4}, {"nick": "Qissan", "pos": 5}]},
        {"name": "Team Zei", "logo": "dota2.png", "roster": [{"nick": "klimcxc", "pos": 1}, {"nick": "neverforgetaboutme", "pos": 2}, {"nick": "izukingweihz", "pos": 3}, {"nick": "zwyrt", "pos": 4}, {"nick": "exsidez", "pos": 5}]},
        {"name": "Angetsu", "logo": "dota2.png", "roster": [{"nick": "ritsuakad", "pos": 1}, {"nick": "g4denish", "pos": 2}, {"nick": "Kiryqz", "pos": 3}, {"nick": "DamiRR999", "pos": 4}, {"nick": "kioqq", "pos": 5}]},
        {"name": "Pavel enragovi4 funs", "logo": "dota2.png", "roster": [{"nick": "Hatershello", "pos": 1}, {"nick": "EgorKul4", "pos": 2}, {"nick": "muff01", "pos": 3}, {"nick": "MihaPlut", "pos": 4}, {"nick": "retarded_as_fuck", "pos": 5}]},
        {"name": "EnrageTurniriDota2", "logo": "dota2.png", "roster": [{"nick": "LookAtTeenwave", "pos": 1}, {"nick": "sooqa7", "pos": 2}, {"nick": "sadpasha123", "pos": 3}, {"nick": "nevercr7", "pos": 4}, {"nick": "Mikhael16", "pos": 5}]},
        {"name": "Sad Boys", "logo": "dota2.png", "roster": [{"nick": "lerc0re", "pos": 1}, {"nick": "alleyesonme166", "pos": 2}, {"nick": "ceogulag", "pos": 3}, {"nick": "whattheffuckkk", "pos": 4}, {"nick": "Keks552", "pos": 5}]},
        {"name": "Never Back Down", "logo": "dota2.png", "roster": [{"nick": "GUFprime", "pos": 1}, {"nick": "Vkidavyumef", "pos": 2}, {"nick": "qukich", "pos": 3}, {"nick": "Alikk313", "pos": 4}, {"nick": "roseofficial_24", "pos": 5}]},
        {"name": "СТЕПАН PRIME", "logo": "dota2.png", "roster": [{"nick": "syze9", "pos": 1}, {"nick": "Manekkkkk", "pos": 2}, {"nick": "mss0280", "pos": 3}, {"nick": "rastoman4ik2", "pos": 4}, {"nick": "bbpoka", "pos": 5}]},
        {"name": "Primal Dance", "logo": "dota2.png", "roster": [{"nick": "Utrataa", "pos": 1}, {"nick": "deox1d3R", "pos": 2}, {"nick": "w8myoverdose", "pos": 3}, {"nick": "Kirill_makhorin", "pos": 4}, {"nick": "oleg41567", "pos": 5}]},
        {"name": "Team zei junior", "logo": "dota2.png", "roster": [{"nick": "lagan322", "pos": 1}, {"nick": "BatonSolo", "pos": 2}, {"nick": "mollypoedatel911", "pos": 3}, {"nick": "depress3dkid", "pos": 4}, {"nick": "matmyee1", "pos": 5}]},
        {"name": "HATER ZDES'", "logo": "dota2.png", "roster": [{"nick": "sk1ble", "pos": 1}, {"nick": "Notearz", "pos": 2}, {"nick": "Brthless", "pos": 3}, {"nick": "gogaa_00", "pos": 4}, {"nick": "realhaterzdes", "pos": 5}]},
        {"name": "KVASIK+1", "logo": "dota2.png", "roster": [{"nick": "Fragin12", "pos": 1}, {"nick": "rimit2q", "pos": 2}, {"nick": "GetsGT", "pos": 3}, {"nick": "wasterina", "pos": 4}, {"nick": "Devyanosto8oi", "pos": 5}]},
        {"name": "ФАНАТЫ ФИШМАНА", "logo": "dota2.png", "roster": [{"nick": "killklkal", "pos": 1}, {"nick": "Miha153867", "pos": 2}, {"nick": "gjfdjhl", "pos": 3}, {"nick": "adragg", "pos": 4}, {"nick": "furces", "pos": 5}]},
        {"name": "Muzhikotaurs TEAM", "logo": "dota2.png", "roster": [{"nick": "lilkirill0", "pos": 1}, {"nick": "your_mom", "pos": 2}, {"nick": "nacho_s01", "pos": 3}, {"nick": "DDanyachka", "pos": 4}, {"nick": "cuteAlister", "pos": 5}]},
        {"name": "Chill Guys", "logo": "dota2.png", "roster": [{"nick": "kisliy", "pos": 1}, {"nick": "Miyamorro", "pos": 2}, {"nick": "emoabyss", "pos": 3}, {"nick": "constantinios7", "pos": 4}, {"nick": "glexix", "pos": 5}]},
        {"name": "selskiedeti", "logo": "dota2.png", "roster": [{"nick": "lavvlyy", "pos": 1}, {"nick": "falexqq", "pos": 2}, {"nick": "egoruk47", "pos": 3}, {"nick": "stul666", "pos": 4}, {"nick": "Patter1303", "pos": 5}]},
        {"name": "Mistake", "logo": "dota2.png", "roster": [{"nick": "rlublumacaticicki", "pos": 1}, {"nick": "wrestlingdagestan", "pos": 2}, {"nick": "18teenDepression", "pos": 3}, {"nick": "hittenmitsurugi_ryu", "pos": 4}, {"nick": "holyrotten", "pos": 5}]},
        {"name": "Nadejda_SNG", "logo": "dota2.png", "roster": [{"nick": "ilyalivanov", "pos": 1}, {"nick": "ChikoHicks86", "pos": 2}, {"nick": "Neekeynk", "pos": 3}, {"nick": "freEZZee1337", "pos": 4}, {"nick": "troitskiyy", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/BBedlamChristmasCup/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Christmas Cup. Групповой этап + Double Elimination. Призовой фонд 20.000₽. Взнос 1000₽ с команды.",
    "prizePool": [
        {"place": 1, "amount": "10000₽", "team": "СТЕПАН PRIME"},
        {"place": 2, "amount": "6000₽", "team": "Chill Guys"},
        {"place": 3, "amount": "4000₽", "team": "Never Back Down"}
    ]
},
{
    "id": "bedlam-winter-cup-division-1",
    "title": "Bedlam Winter Cup: Division 1",
    "limit": "До 8500 MMR",
    "start": "2026-02-14",
    "end": "2026-02-22",
    "startTime": "Обговаривается капитанами",
    "prize": "25.000₽",
    "location": "СНГ",
    "teams": 12,
    "winner": "МЫ",
    "format": "Групповой этап (2 группы по 6) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/19283-bedlam-winter-cup-division-1",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "https://drive.google.com/file/d/10pqTr57ePMTpuRwJrofKRYbFImnVQ-B1/view?usp=sharing",
        "bracket": "https://challonge.com/ru/xkyi7hz6"
    },
    "teamsList": [
        {"name": "Never Back Down", "logo": "dota2.png", "roster": [{"nick": "karinegod", "pos": 1}, {"nick": "Vkidavyumef", "pos": 2}, {"nick": "yanazavode", "pos": 3}, {"nick": "SCorPion_LSPD", "pos": 4}, {"nick": "Denzerin", "pos": 5}]},
        {"name": "TEIKO", "logo": "dota2.png", "roster": [{"nick": "LookAtTeenwave", "pos": 1}, {"nick": "Kricsalis_mode", "pos": 2}, {"nick": "ManuuLq", "pos": 3}, {"nick": "Mikhael16", "pos": 4}, {"nick": "Ingsiontich", "pos": 5}]},
        {"name": "Angetsu", "logo": "dota2.png", "roster": [{"nick": "paroksetii", "pos": 1}, {"nick": "g4denish", "pos": 2}, {"nick": "Kiryqz", "pos": 3}, {"nick": "consumeyou", "pos": 4}, {"nick": "Crimson_witness", "pos": 5}]},
        {"name": "Primal Dance", "logo": "dota2.png", "roster": [{"nick": "arcotsu", "pos": 1}, {"nick": "deox1d3R", "pos": 2}, {"nick": "Edsai1", "pos": 3}, {"nick": "Kirill_makhorin", "pos": 4}, {"nick": "oleg41567", "pos": 5}]},
        {"name": "Team Amplify", "logo": "dota2.png", "roster": [{"nick": "iFlopz", "pos": 1}, {"nick": "D0nem", "pos": 2}, {"nick": "Iseedeadpeople6267", "pos": 3}, {"nick": "Ebatov9", "pos": 4}, {"nick": "Mirco9677", "pos": 5}]},
        {"name": "МЫ", "logo": "dota2.png", "roster": [{"nick": "epk1d", "pos": 1}, {"nick": "k1rne4", "pos": 2}, {"nick": "Bubikuss", "pos": 3}, {"nick": "beeawes0me", "pos": 4}, {"nick": "LegasY2211", "pos": 5}]},
        {"name": "Death Domain", "logo": "dota2.png", "roster": [{"nick": "sfpodpivasom", "pos": 1}, {"nick": "m1xeven", "pos": 2}, {"nick": "uzriteiustrashites", "pos": 3}, {"nick": "KILLIZIUM", "pos": 4}, {"nick": "DmitriiHoodWink", "pos": 5}]},
        {"name": "РАЗНОШУ ЧЕМПИОНАТ", "logo": "dota2.png", "roster": [{"nick": "bonaceraa", "pos": 1}, {"nick": "ragdayudziro", "pos": 2}, {"nick": "RodionovDR", "pos": 3}, {"nick": "niks_35", "pos": 4}, {"nick": "Perts_V", "pos": 5}]},
        {"name": "anonymous dota players", "logo": "dota2.png", "roster": [{"nick": "Atuc7264", "pos": 1}, {"nick": "cd_mymind", "pos": 2}, {"nick": "tteido", "pos": 3}, {"nick": "asdaswqe", "pos": 4}, {"nick": "zxcnikita2809", "pos": 5}]},
        {"name": "Excellent Era", "logo": "dota2.png", "roster": [{"nick": "chisto_krovniy", "pos": 1}, {"nick": "ThisDontLove", "pos": 2}, {"nick": "Bl1nds", "pos": 3}, {"nick": "nurglpov", "pos": 4}, {"nick": "youkuu666", "pos": 5}]},
        {"name": "Team Lunar", "logo": "dota2.png", "roster": [{"nick": "aquagwae", "pos": 1}, {"nick": "meosmeight", "pos": 2}, {"nick": "golimpput", "pos": 3}, {"nick": "Lonikopilat", "pos": 4}, {"nick": "PROSre", "pos": 5}]},
        {"name": "Savage Hope", "logo": "dota2.png", "roster": [{"nick": "ilyacosmos", "pos": 1}, {"nick": "fxckksociety", "pos": 2}, {"nick": "a_aavid", "pos": 3}, {"nick": "Hassttum", "pos": 4}, {"nick": "Ophelliiia", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/xkyi7hz6/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Winter Cup: Division 1. Групповой этап + Double Elimination. Призовой фонд 25.000₽. Взнос 1000₽ с команды.",
    "prizePool": [
        {"place": 1, "amount": "12500₽", "team": "МЫ"},
        {"place": 2, "amount": "7500₽", "team": "anonymous dota players"},
        {"place": 3, "amount": "5000₽", "team": "Angetsu"}
    ]
},
{
    "id": "bedlam-winter-cup-division-2",
    "title": "Bedlam Winter Cup: Division 2",
    "limit": "До Божество 5",
    "start": "2026-02-28",
    "end": "2026-03-08",
    "startTime": "Обговаривается капитанами",
    "prize": "20.000₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "sigma aura",
    "format": "Групповой этап (4 сетки по 4) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/19284-bedlam-winter-cup-division-2",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "https://drive.google.com/file/d/1SFL3oqStOUDdFYNusyBQ-J5M4OOomk16/view",
        "bracket": "https://challonge.com/ru/BWCD2"
    },
    "teamsList": [
        {"name": "VPive", "logo": "dota2.png", "roster": [{"nick": "Superbia86", "pos": 1}, {"nick": "ssstakira", "pos": 2}, {"nick": "flynet89", "pos": 3}, {"nick": "milastik31", "pos": 4}, {"nick": "Sowedy1", "pos": 5}]},
        {"name": "Perefleksiki", "logo": "dota2.png", "roster": [{"nick": "cherryblosssomm", "pos": 1}, {"nick": "Forgeo_10", "pos": 2}, {"nick": "azgen007", "pos": 3}, {"nick": "Tolik2003", "pos": 4}, {"nick": "supersex", "pos": 5}]},
        {"name": "UnTeiko team", "logo": "dota2.png", "roster": [{"nick": "realtripyxa", "pos": 1}, {"nick": "fearofffckinstablelife", "pos": 2}, {"nick": "stul666", "pos": 3}, {"nick": "unkwnusers", "pos": 4}, {"nick": "nadalbaebe", "pos": 5}]},
        {"name": "ground pepper", "logo": "dota2.png", "roster": [{"nick": "quretik", "pos": 1}, {"nick": "YASHLIUHA", "pos": 2}, {"nick": "pivovartugosrun", "pos": 3}, {"nick": "IfrizerI", "pos": 4}, {"nick": "Tyhran4ik", "pos": 5}]},
        {"name": "Хлопни-Топни", "logo": "dota2.png", "roster": [{"nick": "Ebatov9", "pos": 1}, {"nick": "Blood_flow1", "pos": 2}, {"nick": "Chico_loo", "pos": 3}, {"nick": "SCorPion_LSPD", "pos": 4}, {"nick": "matmyee1", "pos": 5}]},
        {"name": "MMAshonki61", "logo": "dota2.png", "roster": [{"nick": "tar990", "pos": 1}, {"nick": "Serega017", "pos": 2}, {"nick": "whyyyyq", "pos": 3}, {"nick": "kardash61", "pos": 4}, {"nick": "wxders", "pos": 5}]},
        {"name": "TEAM SPIRT 2.0", "logo": "dota2.png", "roster": [{"nick": "Kpackawl", "pos": 1}, {"nick": "g4zgforce", "pos": 2}, {"nick": "u_s_e_I_e_s_s", "pos": 3}, {"nick": "C15bullets", "pos": 4}, {"nick": "MyFavouriteGhost", "pos": 5}]},
        {"name": "WEHOME", "logo": "dota2.png", "roster": [{"nick": "akkkvla66", "pos": 1}, {"nick": "balengyiaga", "pos": 2}, {"nick": "solxsalty", "pos": 3}, {"nick": "kzehoo", "pos": 4}, {"nick": "iaobizana", "pos": 5}]},
        {"name": "Feed4Life", "logo": "dota2.png", "roster": [{"nick": "blinksokna", "pos": 1}, {"nick": "infernojgkhz", "pos": 2}, {"nick": "kxsunex", "pos": 3}, {"nick": "ilyxakiller09", "pos": 4}, {"nick": "Vendettaqwe", "pos": 5}]},
        {"name": "Teikō", "logo": "dota2.png", "roster": [{"nick": "Your_soul_is_mineee", "pos": 1}, {"nick": "Moralchan1", "pos": 2}, {"nick": "ryzey1", "pos": 3}, {"nick": "fallensouljas", "pos": 4}, {"nick": "ladno1384", "pos": 5}]},
        {"name": "sigma aura", "logo": "dota2.png", "roster": [{"nick": "lerc0re", "pos": 1}, {"nick": "whattheffuckkk", "pos": 2}, {"nick": "alleyesonme166", "pos": 3}, {"nick": "Yookich55", "pos": 4}, {"nick": "na1turs", "pos": 5}]},
        {"name": "vichiT и 9бомжей", "logo": "dota2.png", "roster": [{"nick": "SashokMalishok123", "pos": 1}, {"nick": "bu1kkka", "pos": 2}, {"nick": "Aloha_Freeezz", "pos": 3}, {"nick": "amph_enjoyer", "pos": 4}, {"nick": "Deceiver1", "pos": 5}]},
        {"name": "Skyway", "logo": "dota2.png", "roster": [{"nick": "loooxxxl", "pos": 1}, {"nick": "ztexxx", "pos": 2}, {"nick": "Jfirjfjdjnfdjjf", "pos": 3}, {"nick": "kael763", "pos": 4}, {"nick": "dfle0", "pos": 5}]},
        {"name": "Barracuda Team", "logo": "dota2.png", "roster": [{"nick": "glav3s", "pos": 1}, {"nick": "pacifistooo", "pos": 2}, {"nick": "Blintlbeis", "pos": 3}, {"nick": "LLLLL33LLLLL", "pos": 4}, {"nick": "azazin671", "pos": 5}]},
        {"name": "DF RISING 2", "logo": "dota2.png", "roster": [{"nick": "sfpodpivasom", "pos": 1}, {"nick": "m1xeven", "pos": 2}, {"nick": "protivniwreqx", "pos": 3}, {"nick": "kefa1k", "pos": 4}, {"nick": "ionhavemoney4flwrs", "pos": 5}]},
        {"name": "EAVT LD", "logo": "dota2.png", "roster": [{"nick": "master_arith", "pos": 1}, {"nick": "BoRoDa_UwU", "pos": 2}, {"nick": "UGLLYSHAAWTY", "pos": 3}, {"nick": "DurckA79", "pos": 4}, {"nick": "real_boler", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/BWCD2/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Winter Cup: Division 2. Групповой этап + Double Elimination. Призовой фонд 20.000₽. Взнос 1000₽ с команды.",
    "prizePool": [
        {"place": 1, "amount": "10000₽", "team": "sigma aura"},
        {"place": 2, "amount": "6000₽", "team": "MMAshonki61"},
        {"place": 3, "amount": "4000₽", "team": "DF RISING 2"}
    ]
},
{
    "id": "bedlam-battles-season-3",
    "title": "Bedlam Battles Season 3",
    "limit": "До 7000 MMR",
    "start": "2025-11-01",
    "end": "2025-11-09",
    "startTime": "Обговаривается капитанами",
    "prize": "15.000₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "Never Back Down",
    "format": "Групповой этап (4 сетки по 4) + Double Elimination",
    "organizer": "Bedlam Tournaments",
    "links": {
        "dotabuff": "https://ru.dotabuff.com/esports/leagues/18808-bedlam-battles-season-3",
        "discord": "https://discord.gg/FktVXm4gRD",
        "rules": "",
        "bracket": "https://challonge.com/ru/BBS_3"
    },
    "teamsList": [
        {"name": "BuLxS", "logo": "dota2.png", "roster": [{"nick": "kisliy", "pos": 1}, {"nick": "D0nem", "pos": 2}, {"nick": "Malenia", "pos": 3}, {"nick": "Scorpion", "pos": 4}, {"nick": "Ebatov", "pos": 5}]},
        {"name": "Never Back Down", "logo": "dota2.png", "roster": [{"nick": "GUFprime", "pos": 1}, {"nick": "Vkidavyumef", "pos": 2}, {"nick": "qukich", "pos": 3}, {"nick": "etceterrra", "pos": 4}, {"nick": "roseofficial_24", "pos": 5}]},
        {"name": "DF JUNIOR", "logo": "dota2.png", "roster": [{"nick": "misterbrood", "pos": 1}, {"nick": "ssaaaooo1", "pos": 2}, {"nick": "Bot4nS", "pos": 3}, {"nick": "Imfuckingdeadinside", "pos": 4}, {"nick": "DarkManaa", "pos": 5}]},
        {"name": "DF YOUTH", "logo": "dota2.png", "roster": [{"nick": "NamelessMonster300", "pos": 1}, {"nick": "Hurricane_ww", "pos": 2}, {"nick": "o_oshiete", "pos": 3}, {"nick": "Abdulazxc", "pos": 4}, {"nick": "Kulaagnin", "pos": 5}]},
        {"name": "Sternritters", "logo": "dota2.png", "roster": [{"nick": "aceqlzx", "pos": 1}, {"nick": "trenxd", "pos": 2}, {"nick": "Visi1n", "pos": 3}, {"nick": "Wextr1", "pos": 4}, {"nick": "Clevanq", "pos": 5}]},
        {"name": "Emo Fluttershy Team", "logo": "dota2.png", "roster": [{"nick": "ritsuakad", "pos": 1}, {"nick": "Kricsalis_mode", "pos": 2}, {"nick": "Kiryqz", "pos": 3}, {"nick": "Ingsiontich", "pos": 4}, {"nick": "kioqq", "pos": 5}]},
        {"name": "Team Quantum", "logo": "dota2.png", "roster": [{"nick": "JustLuman", "pos": 1}, {"nick": "Foxs3n", "pos": 2}, {"nick": "shizssse", "pos": 3}, {"nick": "real_mangix", "pos": 4}, {"nick": "ILBBPP", "pos": 5}]},
        {"name": "TEAM SPIRT", "logo": "dota2.png", "roster": [{"nick": "lerc0re", "pos": 1}, {"nick": "u_s_e_I_e_s_s", "pos": 2}, {"nick": "Kpackawl", "pos": 3}, {"nick": "NeFreakK", "pos": 4}, {"nick": "Cee3ka", "pos": 5}]},
        {"name": "Team Puppies", "logo": "dota2.png", "roster": [{"nick": "aloxa69", "pos": 1}, {"nick": "tavsnehyiu", "pos": 2}, {"nick": "ne_eugenee", "pos": 3}, {"nick": "ive_lost_it", "pos": 4}, {"nick": "d1keycsoff", "pos": 5}]},
        {"name": "Darkhorse", "logo": "dota2.png", "roster": [{"nick": "saikyoll", "pos": 1}, {"nick": "alleyesonme166", "pos": 2}, {"nick": "whattheffuckkk", "pos": 3}, {"nick": "LyMiXD", "pos": 4}, {"nick": "na1turs", "pos": 5}]},
        {"name": "Immortal dragons", "logo": "dota2.png", "roster": [{"nick": "Drag0nay", "pos": 1}, {"nick": "mal0ywww", "pos": 2}, {"nick": "Artik_Style", "pos": 3}, {"nick": "popboon123", "pos": 4}, {"nick": "dzerku", "pos": 5}]},
        {"name": "Team Zei", "logo": "dota2.png", "roster": [{"nick": "klimcxc", "pos": 1}, {"nick": "budayq", "pos": 2}, {"nick": "exsidez", "pos": 3}, {"nick": "zwyrt", "pos": 4}, {"nick": "dAV1Hci", "pos": 5}]},
        {"name": "Fc AKKE", "logo": "dota2.png", "roster": [{"nick": "cherryblosssomm", "pos": 1}, {"nick": "Forgeo_10", "pos": 2}, {"nick": "xxxshpana", "pos": 3}, {"nick": "tail5", "pos": 4}, {"nick": "", "pos": 5}]},
        {"name": "WWalya Team", "logo": "dota2.png", "roster": [{"nick": "jiglipuffy", "pos": 1}, {"nick": "Nota_Z", "pos": 2}, {"nick": "s1ckoffckingup", "pos": 3}, {"nick": "slxxpwalker", "pos": 4}, {"nick": "kipyatog", "pos": 5}]},
        {"name": "рiбкi", "logo": "dota2.png", "roster": [{"nick": "morgenshtern1", "pos": 1}, {"nick": "mryegorych", "pos": 2}, {"nick": "X00OD", "pos": 3}, {"nick": "turmsak", "pos": 4}, {"nick": "YMER_B_MOSKWE", "pos": 5}]},
        {"name": "Fish sticks", "logo": "dota2.png", "roster": [{"nick": "letstryanyway", "pos": 1}, {"nick": "BOOBAqq", "pos": 2}, {"nick": "pivovarx5", "pos": 3}, {"nick": "sdm_nt321", "pos": 4}, {"nick": "pogilaya", "pos": 5}]}
    ],
    "casters": [
        {"name": "jimbo_jox", "link": "https://www.twitch.tv/jimbo_jox"},
        {"name": "tiltuhabratuha", "link": "https://www.twitch.tv/tiltuhabratuha"}
    ],
    "bracketEmbed": "https://challonge.com/ru/BBS_3/module",
    "registrationLink": "",
    "telegramLink": "https://t.me/bedlamtournaments",
    "description": "Bedlam Battles Season 3. Групповой этап + Double Elimination. Призовой фонд 15.000₽. Взнос 500₽ с команды.",
    "prizePool": [
        {"place": 1, "amount": "7500₽", "team": "Never Back Down"},
        {"place": 2, "amount": "4500₽", "team": "Fish sticks"},
        {"place": 3, "amount": "3000₽", "team": "BuLxS"}
    ]
},
  {
    id: "Bedlam-Swamp-Wars",
    title: "Bedlam Swamp Wars",
    limit: "до 7.500 MMR на игрока",
    start: "2026-03-29",
    end: "2026-03-29",
    startTime: "18:00",
    prize: "10.000₽",
    location: "СНГ",
    teams: 8,
    winner: "Glitz",
    format: "Single Elimination",
    organizer: "Bedlam Tournaments",
    links: {
        dotabuff: "https://ru.dotabuff.com/esports/leagues/19504-bedlam-swamp-wars",
        discord: "https://discord.gg/eafqq7bpNe",
        rules: "",
        bracket: "https://challonge.com/ru/BSW123"
    },
    teamsList: [
        { name: "Bedlam Battle Team", logo: "dota2.png", roster: [ { nick: "arcotsu", pos: 1 }, { nick: "imortall_boy", pos: 2 }, { nick: "Edsai1", pos: 3 }, { nick: "ARD3D", pos: 4 }, { nick: "oleg41567", pos: 5 } ] },
        { name: "NoLittleCancer", logo: "dota2.png", roster: [ { nick: "neriel01", pos: 1 }, { nick: "Leo07Mego", pos: 2 }, { nick: "Sir_Damind", pos: 3 }, { nick: "e_cherentsov", pos: 4 }, { nick: "Qissan", pos: 5 } ] },
        { name: "Gitlz", logo: "gitlz.png", roster: [ { nick: "konfetkaaap", pos: 1 }, { nick: "puziblinchik96", pos: 2 }, { nick: "Idcwhour", pos: 3 }, { nick: "Pod_metr0", pos: 4 }, { nick: "Phwvnu", pos: 5 } ] },
        { name: "Leto jr", logo: "dota2.png", roster: [ { nick: "LookAtTeenwave", pos: 1 }, { nick: "Kricsalis_mode", pos: 2 }, { nick: "sooqa7", pos: 3 }, { nick: "Mikhael16", pos: 4 }, { nick: "HSMG321", pos: 5 } ] },
        { name: "all my members ceo", logo: "dota2.png", roster: [ { nick: "shiawasebroken", pos: 1 }, { nick: "redrose1098", pos: 2 }, { nick: "PDiddy_don", pos: 3 }, { nick: "x_xMatd", pos: 4 }, { nick: "Marty412", pos: 5 } ] },
        { name: "Destroyer team", logo: "dota2.png", roster: [ { nick: "yamori1", pos: 1 }, { nick: "Vkidavyumef", pos: 2 }, { nick: "MertvecSad", pos: 3 }, { nick: "HELLOMYFRIENDZZZZ", pos: 4 }, { nick: "Dmitriyiyiyiy", pos: 5 } ] },
        { name: "Sharashkina kontora", logo: "dota2.png", roster: [ { nick: "Miyamorro", pos: 1 }, { nick: "Blood_flow1", pos: 2 }, { nick: "SCorPion_LSPD", pos: 3 }, { nick: "Ebatov9", pos: 4 }, { nick: "", pos: 5 } ] },
        { name: "пол литра", logo: "dota2.png", roster: [ { nick: "leshapohoroni", pos: 1 }, { nick: "zaxyuu", pos: 2 }, { nick: "kerell339", pos: 3 }, { nick: "SEA_W0LF", pos: 4 }, { nick: "ddddandelion", pos: 5 } ] },
        { name: "Fallen Angels", logo: "dota2.png", roster: [ { nick: "killklkal", pos: 1 }, { nick: "Invplayer", pos: 2 }, { nick: "Emporgi", pos: 3 }, { nick: "adragg", pos: 4 }, { nick: "zxc5posdeadinside", pos: 5 } ] },
        { name: "VVSU", logo: "dota2.png", roster: [ { nick: "Pudgeb0y", pos: 1 }, { nick: "arzjjd", pos: 2 }, { nick: "muff01", pos: 3 }, { nick: "Limmmmmmp", pos: 4 }, { nick: "", pos: 5 } ] },
        { name: "Oren67_Team", logo: "dota2.png", roster: [ { nick: "tortipur", pos: 1 }, { nick: "BigBlack_Man", pos: 2 }, { nick: "zxcsosiska322", pos: 3 }, { nick: "McLovin252", pos: 4 }, { nick: "Mirlainnn", pos: 5 } ] },
        { name: "Never Back Down", logo: "dota2.png", roster: [ { nick: "chisto_krovniy", pos: 1 }, { nick: "D0nem", pos: 2 }, { nick: "emoterracted", pos: 3 }, { nick: "roseofficial_26", pos: 4 }, { nick: "hanett135", pos: 5 } ] },
        { name: "Strafe Team", logo: "dota2.png", roster: [ { nick: "audiorecorder", pos: 1 }, { nick: "HSSJEY", pos: 2 }, { nick: "M1nd1q", pos: 3 }, { nick: "nearthelamppost", pos: 4 }, { nick: "prtim09", pos: 5 } ] }
    ],
    casters: [
        { name: "TBD", link: "" }
    ],
    
    bracketEmbed: "https://challonge.com/ru/BSW123/module",
    registrationLink: "",
    telegramLink: "https://t.me/bedlamtournaments",
    
    description: "Bedlam Swamp Wars — онлайн-турнир по Dota 2. Формат Single Elimination (BO1), финал и матч за 3 место — BO1. Captains Draft. Призовой фонд 10.000₽ (1 место — 5.000₽, 2 место — 3.000₽, 3 место — 2.000₽). Взнос 500₽ с команды. Дата проведения: 29 марта 2026.",
    
    prizePool: [
        { place: 1, amount: "5.000₽", team: "Gitlz" },
        { place: 2, amount: "3.000₽", team: "all my members ceo" },
        { place: 3, amount: "2.000₽", team: "LETO jr" }
    ]
},
{
    id: "Bedlam-Spring-Cup",
    title: "Bedlam Spring Cup",
    limit: "До 8.500 MMR на игрока",
    start: "2026-04-18",
    end: "2026-04-26",
    startTime: "18:00",
    prize: "25.000₽",
    location: "СНГ",
    teams: 20,
    winner: "Bedlam Battle Team",
    format: "Group Stage + Double Elimination",
    organizer: "Bedlam Tournaments",
    links: {
        dotabuff: "https://ru.dotabuff.com/esports/leagues/19593-bedlam-spring-cup",
        discord: "https://discord.gg/eafqq7bpNe",
        rules: "",
        bracket: "https://challonge.com/ru/BSC67/module"
    },
    teamsList: [
        { name: "Bedlam Battle Team", logo: "dota2.png", roster: [ { nick: "arcotsu", pos: 1 }, { nick: "imortall_boy", pos: 2 }, { nick: "Edsai1", pos: 3 }, { nick: "yomyKo", pos: 4 }, { nick: "Ar1urn", pos: 5 } ] },
        { name: "Gitlz", logo: "gitlz.png", roster: [ { nick: "konfetkaaap", pos: 1 }, { nick: "puziblinchik96", pos: 2 }, { nick: "Idcwhour", pos: 3 }, { nick: "Pod_metr0", pos: 4 }, { nick: "Phwvnu", pos: 5 } ] },
        { name: "egoisto team", logo: "dota2.png", roster: [ { nick: "xinegod", pos: 1 }, { nick: "m1nd1q", pos: 2 }, { nick: "dark_light666", pos: 3 }, { nick: "zxcnikita2809", pos: 4 }, { nick: "HSSJEY", pos: 5 } ] },
        { name: "узбагойся", logo: "dota2.png", roster: [ { nick: "Ghostraze", pos: 1 }, { nick: "arcabuse", pos: 2 }, { nick: "xtravs", pos: 3 }, { nick: "rsln_ttr", pos: 4 }, { nick: "VfIDF", pos: 5 } ] },
        { name: "SkyDrifters", logo: "dota2.png", roster: [ { nick: "divinememory", pos: 1 }, { nick: "hopeaddict", pos: 2 }, { nick: "gorilla1799", pos: 3 }, { nick: "alice32544", pos: 4 }, { nick: "Dima_Darwin", pos: 5 } ] },
        { name: "газики", logo: "dota2.png", roster: [ { nick: "imnotevenahuman", pos: 1 }, { nick: "g4zgforce", pos: 2 }, { nick: "dmflnv", pos: 3 }, { nick: "Hisoka_Egorka_Be", pos: 4 }, { nick: "Vivaky", pos: 5 } ] },
        { name: "James & Jeremy", logo: "dota2.png", roster: [ { nick: "Sigmashavel_Ilya2008", pos: 1 }, { nick: "nevxr_mxre", pos: 2 }, { nick: "keepyourideal", pos: 3 }, { nick: "ssonchh", pos: 4 }, { nick: "watashiwa201", pos: 5 } ] },
        { name: "Podosinoviki", logo: "podosinovik.png", roster: [ { nick: "HansLandaaaa", pos: 1 }, { nick: "cd_mymind", pos: 2 }, { nick: "Ptshunterzxc", pos: 3 }, { nick: "ig31110n", pos: 4 }, { nick: "prokazz_a", pos: 5 } ] },
        { name: "VATAKE13", logo: "dota2.png", roster: [ { nick: "worldchampion_74kgwrestling", pos: 1 }, { nick: "kkkkk123456777", pos: 2 }, { nick: "LooneyNM", pos: 3 }, { nick: "roflodotka", pos: 4 }, { nick: "Denisjao", pos: 5 } ] },
        { name: "Barracuda jnr", logo: "dota2.png", roster: [ { nick: "Blintlbeis", pos: 1 }, { nick: "bluedolphingod", pos: 2 }, { nick: "lllll33lllll", pos: 3 }, { nick: "fentanyldreams", pos: 4 }, { nick: "", pos: 5 } ] },
        { name: "Barracuda Team", logo: "dota2.png", roster: [ { nick: "l1elielie", pos: 1 }, { nick: "Abednico", pos: 2 }, { nick: "k0libpi", pos: 3 }, { nick: "blz1k", pos: 4 }, { nick: "Mirco9677", pos: 5 } ] },
        { name: "Sharashkina kontora", logo: "dota2.png", roster: [ { nick: "Blood_flow1", pos: 1 }, { nick: "Miyamorro", pos: 2 }, { nick: "emoterracted", pos: 3 }, { nick: "SCorPion_LSPD", pos: 4 }, { nick: "Ebatov9", pos: 5 } ] },
        { name: "LETO jr", logo: "dota2.png", roster: [ { nick: "LookAtTeenwave", pos: 1 }, { nick: "Kricsalis_mode", pos: 2 }, { nick: "sooqa7", pos: 3 }, { nick: "Mikhael16", pos: 4 }, { nick: "HSMG321", pos: 5 } ] },
        { name: "МЫ", logo: "dota2.png", roster: [ { nick: "epk1d", pos: 1 }, { nick: "yodhwy", pos: 2 }, { nick: "Bubikuss", pos: 3 }, { nick: "Kirill_Suetin", pos: 4 }, { nick: "LegasY2211", pos: 5 } ] }
    ],
    
    casters: [
        { name: "TBD", link: "" }
    ],
    
    bracketEmbed: "https://challonge.com/ru/BSC67/module",
    registrationLink: "",
    telegramLink: "",
    
    description: "Bedlam Spring Cup — крупный онлайн-турнир. Лимит до 8500 MMR. Групповой этап (4 группы по 5 команд, BO1) + Double Elimination плей-офф. Призовой фонд 25.000₽ (1 место — 12.500₽, 2 место — 7.500₽, 3 место — 5.000₽). Даты: 18–26 апреля 2026.",
    
    prizePool: [
        { place: 1, amount: "12.500₽", team: "Bedlam Battle Team" },
        { place: 2, amount: "7.500₽", team: "DF Junior" },
        { place: 3, amount: "5.000₽", team: "EGOISTO Team" }
    ]
},
  {
    id: "Armagedon-Championship-S8",
    title: "Armagedon Championship S8",
    limit: "До 30.000 MMR на команду",
    start: "2026-05-15",
    end: "2026-05-19",
    startTime: "17:00",
    prize: "10.000₽",
    location: "СНГ",
    teams: 12,
    winner: "VHS Team",
    format: "Single Elimination",
    organizer: "Armagedon Championship",
    links: {
  dotabuff: "",
  discord: "",
  rules: "",
  bracket: ""
},
    teamsList: [
        { name: "headache", logo: "dota2.png", roster: [ { nick: "KaSu", pos: 1 }, { nick: "dr Dolittle", pos: 2 }, { nick: "dr Dolittle", pos: 3 }, { nick: "никчемная жизнь", pos: 4 }, { nick: "Kinnex", pos: 5 } ] },
        { name: "CreepWave", logo: "dota2.png", roster: [ { nick: "Discovery", pos: 1 }, { nick: "SUPERHATEMEWORLD", pos: 2 }, { nick: "f31.6", pos: 3 }, { nick: "ПРИВЕТ АККБАЕРЫ", pos: 4 }, { nick: "supernxva", pos: 5 } ] },
        { name: "sigma aura", logo: "dota2.png", roster: [ { nick: "e^iπ + 1 = 0", pos: 1 }, { nick: "squalor", pos: 2 }, { nick: "4poker", pos: 3 }, { nick: "all eyes on me", pos: 4 }, { nick: "Na1Turs", pos: 5 } ] },
        { name: "SPERMA_PAVLA", logo: "dota2.png", roster: [ { nick: "Z-терминатор РКН модели 2.0", pos: 1 }, { nick: "Rezeks", pos: 2 }, { nick: "женева 147", pos: 3 }, { nick: "Shavo", pos: 4 }, { nick: "Starking", pos: 5 } ] },
        { name: "Freaky", logo: "dota2.png", roster: [ { nick: "Gero", pos: 1 }, { nick: "auten", pos: 2 }, { nick: "BAV", pos: 3 }, { nick: "wotergate", pos: 4 }, { nick: "tatsumi", pos: 5 } ] },
        { name: "Hellsing", logo: "dota2.png", roster: [ { nick: "Krosimus闇", pos: 1 }, { nick: "обмен лайками", pos: 2 }, { nick: "*_ЧёТк1Й_*", pos: 3 }, { nick: "REEF", pos: 4 }, { nick: "Невадский", pos: 5 } ] },
        { name: "dota enjoyers", logo: "dota2.png", roster: [ { nick: "bespredel. kz", pos: 1 }, { nick: "FERET-", pos: 2 }, { nick: "ПамперсМесси", pos: 3 }, { nick: "гений умный 0 ошибок", pos: 4 }, { nick: "рейвстак поволжьe", pos: 5 } ] },
        { name: "Боги доты", logo: "dota2.png", roster: [ { nick: "Labmeister", pos: 1 }, { nick: "Достоевский", pos: 2 }, { nick: "All mute", pos: 3 }, { nick: "Fallen", pos: 4 }, { nick: "П0лковник Сабвуфер", pos: 5 } ] },
        { name: "BK REJECTS", logo: "dota2.png", roster: [ { nick: "skilldiffmyself", pos: 1 }, { nick: "что", pos: 2 }, { nick: "миледи", pos: 3 }, { nick: "AI3L4", pos: 4 }, { nick: "Denson2", pos: 5 } ] },
        { name: "VHS Team", logo: "dota2.png", roster: [ { nick: "Саша Белый Prime", pos: 1 }, { nick: "MIA", pos: 2 }, { nick: "RAIKIRI-", pos: 3 }, { nick: "Cøldeyes", pos: 4 }, { nick: "Discipline_", pos: 5 } ] }
    ],
    
    casters: [
        { name: "armagedonchamp", link: "" }
    ],
    
    bracketEmbed: "https://postimg.cc/XGS2JCYt",
    registrationLink: "",
    telegramLink: "",
    
    description: "ARMAGEDON CHAMPIONSHIP S8 — онлайн-турнир по Dota 2. Формат Single Elimination (BO3). Лимит 30.000 MMR на команду. Призовой фонд 10.000₽ (1 место — 7000₽, 2 место — 3000₽). Старт: 15 мая 2026.",
    
    prizePool: [
        { place: 1, amount: "7.000₽", team: "VHS Team" },
        { place: 2, amount: "3.000₽", team: "sigma aura" }
    ]
},
  {
    id: "Bedlam-Waiting-For-Summer-Cup",
    title: "Bedlam Waiting For Summer Cup",
    limit: "До 35.000 MMR на команду",
    start: "2026-05-31",
    end: "2026-05-31",
    startTime: "13:00",
    prize: "15.000₽",
    location: "СНГ",
    teams: 16,
    winner: "Gitlz",
    format: "Single Elimination",
    organizer: "Bedlam Tournaments",
  links: {
  dotabuff: "https://ru.dotabuff.com/esports/leagues/19760-bedlam-waiting-summer-cup",
  discord: "https://discord.gg/eafqq7bpNe",
  rules: "https://t.me/bedlamtournaments/226?comment=412",
  bracket: "https://challonge.com/ru/BWFSC"
},
    teamsList: [
      { name: "Podosinovik", logo: "podosinovik.png", roster: [ { nick: ":3", pos: 1 }, { nick: "зато уютно умирать", pos: 2 }, { nick: "МИШКА МОРГЕН", pos: 3 }, { nick: "El Oreshniko del Perú", pos: 4 }, { nick: "аурная зараза", pos: 5 } ] },
      { name: "LETO Junior", logo: "dota2.png", roster: [ { nick: "Teenwave", pos: 1 }, { nick: "Alisa", pos: 2 }, { nick: "popi", pos: 3 }, { nick: "el tivke", pos: 4 }, { nick: "Freakuxa", pos: 5 } ] },
      { name: "Gitlz", logo: "gitlz.png", roster: [ { nick: "breaoutlik", pos: 1 }, { nick: "Akama", pos: 2 }, { nick: "Moody", pos: 3 }, { nick: "AstarOtzio", pos: 4 }, { nick: "Nico", pos: 5 } ] },
      { name: "DRAGFIRE Ascent", logo: "dota2.png", roster: [ { nick: "ONSAMIY", pos: 1 }, { nick: "Shima~", pos: 2 }, { nick: "CollapseMini", pos: 3 }, { nick: "splitta", pos: 4 }, { nick: "LegasY221", pos: 5 } ] },
      { name: "Bedlam Red", logo: "dota2.png", roster: [ { nick: "lonix", pos: 1 }, { nick: "immortall boy", pos: 2 }, { nick: "Edsa1?", pos: 3 }, { nick: "drim", pos: 4 }, { nick: "Ariurn", pos: 5 } ] },
      { name: "GLHF", logo: "dota2.png", roster: [ { nick: "bebebe", pos: 1 }, { nick: "Divan", pos: 2 }, { nick: "mognus", pos: 3 }, { nick: "LasTdep", pos: 4 }, { nick: "heb", pos: 5 } ] },
      { name: "Entropiq", logo: "dota2.png", roster: [ { nick: "321", pos: 1 }, { nick: "destructive thoughts", pos: 2 }, { nick: "ДЖЕНТЕЛЬМЕН ЗОНЫ", pos: 3 }, { nick: "Bang", pos: 4 }, { nick: "katarsis", pos: 5 } ] },
      { name: "Never Back Down", logo: "dota2.png", roster: [ { nick: "wakeup", pos: 1 }, { nick: "Baby, Nice Try", pos: 2 }, { nick: "m1nd1", pos: 3 }, { nick: "Darklight", pos: 4 }, { nick: "Rose", pos: 5 } ] },
      { name: "Смешарики", logo: "dota2.png", roster: [ { nick: "ahtenoma", pos: 1 }, { nick: "Frenzy", pos: 2 }, { nick: "StRaXa NeT", pos: 3 }, { nick: "dRЯnB", pos: 4 }, { nick: "borutsu", pos: 5 } ] },
      { name: "Tatsinskay Team", logo: "dota2.png", roster: [ { nick: "steelbetteryou", pos: 1 }, { nick: "justToxic", pos: 2 }, { nick: "Sorry4911", pos: 3 }, { nick: "setrakovVi", pos: 4 }, { nick: "3500", pos: 5 } ] },
      { name: "Cyberia Esports", logo: "dota2.png", roster: [ { nick: "paroksetii", pos: 1 }, { nick: "fobas", pos: 2 }, { nick: "iFlopz", pos: 3 }, { nick: "sheremetov17", pos: 4 }, { nick: "Crimson_witness", pos: 5 } ] },
      { name: "FuLcons", logo: "dota2.png", roster: [ { nick: "vibeman67", pos: 1 }, { nick: "UnFenixded", pos: 2 }, { nick: "ev1lblue", pos: 3 }, { nick: "oLgeZ21", pos: 4 }, { nick: "Chelovechekc", pos: 5 } ] },
      { name: "Фонк Brazilian", logo: "dota2.png", roster: [ { nick: "foreversadnesss", pos: 1 }, { nick: "Lianyaw", pos: 2 }, { nick: "pepe101010183", pos: 3 }, { nick: "Ffffrls", pos: 4 }, { nick: "moonprissm", pos: 5 } ] },
      { name: "AuraFarm", logo: "dota2.png", roster: [ { nick: "kaelthasJ", pos: 1 }, { nick: "szdoxw", pos: 2 }, { nick: "Baobbaab", pos: 3 }, { nick: "Gem4ikkk", pos: 4 }, { nick: "Nexyc1337", pos: 5 } ] },
      { name: "LAST DANCE", logo: "dota2.png", roster: [ { nick: "Arcotsu", pos: 1 }, { nick: "labubson", pos: 2 }, { nick: "blz1k", pos: 3 }, { nick: "burmolda", pos: 4 }, { nick: "Oshibkaprirody", pos: 5 } ] },
      { name: "Дефицит", logo: "dota2.png", roster: [ { nick: "died2dayago", pos: 1 }, { nick: "TTFDAWD", pos: 2 }, { nick: "qt4b1k", pos: 3 }, { nick: "neuropurgatory", pos: 4 }, { nick: "hanamiya0", pos: 5 } ] },
      { name: "Flow Team", logo: "dota2.png", roster: [ { nick: "thea99999", pos: 1 }, { nick: "TheHateSocium", pos: 2 }, { nick: "Pod_metr0", pos: 3 }, { nick: "rmkle", pos: 4 }, { nick: "mtdqq", pos: 5 } ] },
    ],
    
    casters: [
        { name: "jimbo_jox", link: "https://www.twitch.tv/jimbo_jox" },
        { name: "tiltuhabratuha", link: "https://www.twitch.tv/tiltuhabratuha" },
        { name: "sezen_team", link: "https://www.twitch.tv/sezen_team" },
    ],
    
    bracketEmbed: "https://challonge.com/ru/BWFSC/module",
    registrationLink: "https://docs.google.com/forms/d/e/1FAIpQLSeiGMBcO8fjZQiACg9LhMgLI9qCKc-nM53xWSF-3Y090eSQ2A/viewform",
    telegramLink: "https://t.me/bedlamtournaments",
    
    description: "Bedlam Waiting For Summer Cup — 31.05.2026 в 13:00, Single Elimination, лимит MMR до 35.000 (8.5к на человека), 16+ команд, взнос 500₽ с команды, призовой фонд 15.000₽ (1-е место — 10.000₽, 2-е место — 5.000₽). Организатор: Bedlam Tournaments.",
    
    prizePool: [
        { place: 1, amount: "10.000₽", team: "Gitlz" },
        { place: 2, amount: "5.000₽", team: "Podosinovik" }
    ]
},
    {
    id: "AnyLvL-GOTF-Special-1",
    title: "AnyLvL x GOTF eSports: Special 1",
    limit: "Без лимита MMR",
    start: "2025-05-16",
    end: "2025-05-18",
    startTime: "20:00",
    prize: "1.000₽",
    location: "СНГ",
    teams: 8,
    winner: "Eaters of Fear",
    format: "Group Stage + Playoffs",
    organizer: "AnyLvL Community x GOTF eSports",
    links: {
  dotabuff: "",
  discord: "",
  rules: "",
  bracket: ""
},
    teamsList: [
        { name: "Eaters of Fear", logo: "dota2.png", roster: [ { nick: "Mangekyo", pos: 1 }, { nick: "sochnik", pos: 2 }, { nick: "5letvmesto4", pos: 3 }, { nick: "Ya бубуин", pos: 4 }, { nick: "Nikitos99610", pos: 5 } ] },
        { name: "ЧВК Литэнерджи", logo: "dota2.png", roster: [ { nick: "XKSilens", pos: 1 }, { nick: "pirozhok", pos: 2 }, { nick: "Rodidjan", pos: 3 }, { nick: "РОМАНТАЙГЕР", pos: 4 }, { nick: "Voronltf", pos: 5 } ] },
        { name: "GOTF Junior", logo: "dota2.png", roster: [ { nick: "Wakai_oji", pos: 1 }, { nick: "radortep", pos: 2 }, { nick: "leha_shellby", pos: 3 }, { nick: "chernisvin", pos: 4 }, { nick: "navernopystoi", pos: 5 } ] },
        { name: "Teiko", logo: "dota2.png", roster: [ { nick: "Merlinz", pos: 1 }, { nick: "gibkiy48", pos: 2 }, { nick: "workwap", pos: 3 }, { nick: "Импульсивный", pos: 4 }, { nick: "furer1488", pos: 5 } ] },
        { name: "HATE RELATE", logo: "dota2.png", roster: [ { nick: "₣άℓℓℯℕ_ȴø℣e", pos: 1 }, { nick: "azutive", pos: 2 }, { nick: "ewik__01", pos: 3 }, { nick: "osmann_osmanov", pos: 4 }, { nick: "Parasiu", pos: 5 } ] },
        { name: "Feed & Win", logo: "dota2.png", roster: [ { nick: "holger9325", pos: 1 }, { nick: "diphenhydramine_", pos: 2 }, { nick: "duffmen", pos: 3 }, { nick: "pomudorca", pos: 4 }, { nick: "danillllllllll", pos: 5 } ] },
        { name: "Ouroboros team", logo: "dota2.png", roster: [ { nick: "karozia", pos: 1 }, { nick: "MADRIDMOSKOW", pos: 2 }, { nick: "kyrome", pos: 3 }, { nick: "tepji13", pos: 4 }, { nick: "Vortexsssxd", pos: 5 } ] },
        { name: "Team Recruits", logo: "dota2.png", roster: [ { nick: "roman_zach", pos: 1 }, { nick: "человек", pos: 2 }, { nick: "yamaxaebal", pos: 3 }, { nick: "REL", pos: 4 }, { nick: "Viges?", pos: 5 } ] }
    ],
    
    casters: [
        { name: "Paradox Pog", link: "https://www.twitch.tv/paradox_pog" }
    ],
    
    bracketEmbed: "https://docs.google.com/spreadsheets/d/1OdmXDorvwPrqbXUpgeu5jzhlHHmomla5OWa3R2V3TnI/edit?gid=315794023#gid=315794023",
    registrationLink: "",
    telegramLink: "https://t.me/gotf_dota",
    
    description: "AnyLvL x GOTF eSports: Special №1 — пригласительный турнир 8 команд. Формат: Elimination Draft (нельзя повторять героев в рамках одной серии). Даты: 16–18 мая 2025. Групповой этап + плей-офф.",
    
    prizePool: [
        { place: 1, amount: "1.000₽", team: "Eaters of Fear" },
    ]
},
    {
    id: "AnyLvL-GOTF-Special-2",
    title: "AnyLvL x GOTF eSports: Special 2",
    limit: "Без лимита MMR",
    start: "2025-07-18",
    end: "2025-07-20",
    startTime: "18:00",
    prize: "3.000₽",
    location: "СНГ",
    teams: 8,
    winner: "TEIKO",
    format: "Swiss Stage + Playoffs",
    organizer: "AnyLvL Community x GOTF eSports",
    links: {
  dotabuff: "https://www.dotabuff.com/esports/leagues/18462-anylvl-x-gotf-esports-special-2",
  discord: "https://discord.gg/fUWA4CyGS",
  rules: "",
  bracket: ""
},
    teamsList: [
        { name: "TEIKO", logo: "dota2.png", roster: [ { nick: "Rinkuxa", pos: 5 }, { nick: "sooqa", pos: 2 }, { nick: "kriptt", pos: 3 }, { nick: "Teenwave", pos: 1 }, { nick: "El Tivke", pos: 4 } ] },
        { name: "ЧВК \"ЛитЭнерджи\"", logo: "dota2.png", roster: [ { nick: "-_-VITALIK-_-2-2-8", pos: 1 }, { nick: "ананист2009", pos: 2 }, { nick: "0_0 SHERIF 0_0", pos: 3 }, { nick: "Дядя Вова", pos: 4 }, { nick: "VoronLTF", pos: 5 } ] },
        { name: "GOTF junior", logo: "dota2.png", roster: [ { nick: "Паджик", pos: 5 }, { nick: "Shadow4ik", pos: 2 }, { nick: "Wakai_ōji", pos: 1 }, { nick: "accumulation", pos: 3 }, { nick: "xxelts", pos: 4 } ] },
        { name: "Feed & Win", logo: "dota2.png", roster: [ { nick: "Duffmen", pos: 3 }, { nick: "ПРОСТО КНЯЗЬ", pos: 5 }, { nick: "Qqold", pos: 2 }, { nick: "BETman", pos: 1 }, { nick: "33kid", pos: 4 } ] },
        { name: "team sexy", logo: "dota2.png", roster: [ { nick: "danyok", pos: 2 }, { nick: "icememory<3", pos: 3 }, { nick: "Drim", pos: 4 }, { nick: "Face Your Fate", pos: 1 }, { nick: "21blessed", pos: 5 } ] },
        { name: "Fast & Furious 4", logo: "dota2.png", roster: [ { nick: "haginsson", pos: 1 }, { nick: "azutive", pos: 2 }, { nick: "leha_shellby", pos: 3 }, { nick: "saviorofgothxm", pos: 4 }, { nick: "gold1ck", pos: 5 } ] },
        { name: "99problems", logo: "dota2.png", roster: [ { nick: "HblTuK_", pos: 2 }, { nick: "MantiCForev", pos: 1 }, { nick: "Shari’s", pos: 3 }, { nick: "ovvllvks", pos: 4 }, { nick: "TANK", pos: 5 } ] },
        { name: "fractal hornes", logo: "dota2.png", roster: [ { nick: "shard", pos: 1 }, { nick: "m1ffics", pos: 5 }, { nick: "Jesuz", pos: 3 }, { nick: "Watashi", pos: 2 }, { nick: "Виталик Ухылант", pos: 4 } ] }
    ],
    
    casters: [
        { name: "Paradox Pog", link: "https://www.twitch.tv/paradox_pog" }
    ],
    
    bracketEmbed: "",
    registrationLink: "",
    telegramLink: "https://t.me/gotf_dota",
    
    description: "AnyLvL x GOTF eSports: Special 2 — пригласительный турнир 8 команд. Формат: Elimination Draft (в одной серии нельзя повторять героев). Призовой фонд 3000₽. Даты проведения: 18–20 июля 2025.",
    
    prizePool: [
        { place: 1, amount: "2.000₽", team: "TEIKO" },
        { place: 2, amount: "1.000₽", team: "ЧВК \"ЛитЭнерджи\"" }
    ]
},
  {
    "id": "SkewerEsports-Season-2",
    "title": "SkewerEsports Season 2",
    "limit": "До 8500 MMR на игрока",
    "start": "2026-06-06",
    "end": "2026-06-06",
    "startTime": "11:00",
    "prize": "6.500₽",
    "location": "СНГ",
    "teams": 16,
    "winner": "TBD",
    "format": "Single Elimination",
    "organizer": "SkewerEsports",
    "links": {
        "dotabuff": "",
        "discord": "https://discord.gg/M6QaGMkdDr",
        "rules": "",
        "bracket": ""
    },
    "teamsList": [
        {
            "name": "DestroyItems",
            "logo": "dota2.png",
            "roster": [ { "nick": "Fuck this society", "pos": 1 }, { "nick": "Rinec1", "pos": 2 }, { "nick": "Squall", "pos": 3 }, { "nick": "14shagov", "pos": 4 }, { "nick": "н угопак~", "pos": 5 },
            ]
        }
    ],
    "casters": [
        { "name": "mansh1nee", "link": "https://www.twitch.tv/mansh1nee" }
    ],
    "bracketEmbed": "",
    "registrationLink": "https://docs.google.com/forms/d/1AOPnhM_jFYUyFw3BUeo6k9FE_l-VBqVLXns_P8DtVpY/edit#response=ACYDBNgetI5JxnfiwHNgNxtbtqmO0hslBtb8rb9AiRT9kiFgFgxuJYrpbzjd2yqG_6mKouk",
    "telegramLink": "https://t.me/SkewerEsports",
    "description": "SkewerEsports Season 2. Single Elimination (BO1, финал BO3). Лимит 8500 MMR на игрока. Взнос 500₽ с команды. Призовой фонд 6.500₽ (6.000₽ — 1 место + 500₽ — мини-игра 1v1 между мидерами). Старт: 7 июня 2026 в 11:00.",
    "prizePool": [
        { "place": 1, "amount": "6.000₽", "team": "" },
        { "place": "1v1 Mid", "amount": "500₽", "team": "" }
    ]
},
  {
    id: "SkewerEsports-Season-1",
    title: "SkewerEsports Season 1",
    limit: "До 35.000 MMR на команду",
    start: "2026-05-07",
    end: "2026-05-08",
    startTime: "18:00",
    prize: "4.000₽",
    location: "СНГ",
    teams: 16,
    winner: "Podosinoviki",
    format: "Single Elimination",
    organizer: "SkewerEsports",
    links: {
  dotabuff: "",
  discord: "https://discord.gg/M6QaGMkdDr",
  rules: "https://docs.google.com/document/d/e/2PACX-1vTI-P2IVy8orZfORzNnueF16-yd0-Czoe0YaFr0TaUqt8f69OBUHycF7wJmqQQqQC6UJwrJY7dW7XQz/pub",
  bracket: ""
},
    teamsList: [
      { name: "DRAGFIRE ASCENT",   logo: "dota2.png", roster: [ { nick: "heatolonq", pos: 1 }, { nick: "Shima~", pos: 2 }, { nick: "CollapseMini", pos: 3 }, { nick: "splitta", pos: 4 }, { nick: "LegasY221", pos: 5 } ] },
      { name: "Вятские Соколы",    logo: "dota2.png", roster: [ { nick: "Mandarin", pos: 1 }, { nick: "Shinra-bansho", pos: 2 }, { nick: "True", pos: 3 }, { nick: "аввацафца", pos: 4 }, { nick: "Ostrye lezviya", pos: 5 } ] },
      { name: "OASIS KNRTU 2",     logo: "dota2.png", roster: [ { nick: "Rimma", pos: 1 }, { nick: "2016", pos: 2 }, { nick: "321", pos: 3 }, { nick: "86", pos: 4 }, { nick: "NEGIBATOR", pos: 5 } ] },
      { name: "Utilsbore Team",    logo: "dota2.png", roster: [ { nick: "Hello_pippo", pos: 1 }, { nick: "ДЯДЯ КОЛЯ66б", pos: 2 }, { nick: "Сабилька", pos: 3 }, { nick: "Farzca777", pos: 4 }, { nick: "Dessay", pos: 5 } ] },
      { name: "ANTISOCIAL",        logo: "dota2.png", roster: [ { nick: "ap4t1ya", pos: 1 }, { nick: "cxcxcxcx", pos: 2 }, { nick: "Cl0wn", pos: 3 }, { nick: "Fnu4", pos: 4 }, { nick: "Ａｆａｒｉl", pos: 5 } ] },
      { name: "Barracuda Team",    logo: "dota2.png", roster: [ { nick: "goth angel", pos: 1 }, { nick: "DanilkaAbed", pos: 2 }, { nick: "Jealous", pos: 3 }, { nick: "yltra", pos: 4 }, { nick: "zobaa", pos: 5 } ] },
      { name: "Рыбаки",            logo: "dota2.png", roster: [ { nick: "Подберезовик", pos: 1 }, { nick: "вашего叔父", pos: 2 }, { nick: "apathy2k", pos: 3 }, { nick: "Honiatu", pos: 4 }, { nick: "Prime", pos: 5 } ] },
      { name: "zxc players",       logo: "dota2.png", roster: [ { nick: "absolut", pos: 1 }, { nick: "ягодичный парикм", pos: 2 }, { nick: "-_-", pos: 3 }, { nick: "Dima Kulak Bicuha", pos: 4 }, { nick: "NotChag", pos: 5 } ] },
      { name: "VHS Team",          logo: "dota2.png", roster: [ { nick: "Саша Белый Prime", pos: 1 }, { nick: "MIA", pos: 2 }, { nick: "Raikiri-", pos: 3 }, { nick: "Weekend", pos: 4 }, { nick: "yleuvyu", pos: 5 } ] },
      { name: "LETO jr",           logo: "dota2.png", roster: [ { nick: "Teenwave", pos: 1 }, { nick: "Alisa", pos: 2 }, { nick: "popi", pos: 3 }, { nick: "el tivke", pos: 4 }, { nick: "UZBEKSILA", pos: 5 } ] },
      { name: "Never Back Down",   logo: "dota2.png", roster: [ { nick: "Лысый", pos: 1 }, { nick: "Baby, Nice Try", pos: 2 }, { nick: "Кэп", pos: 3 }, { nick: "Rose", pos: 4 }, { nick: "Błyskawica", pos: 5 } ] },
      { name: "Primal Dance",      logo: "dota2.png", roster: [ { nick: "cotsu", pos: 1 }, { nick: "m33pmap", pos: 2 }, { nick: "m1nd1", pos: 3 }, { nick: "darklight", pos: 4 }, { nick: "Freak", pos: 5 } ] },
      { name: "Podosinoviki",      logo: "podosinovik.png", roster: [ { nick: "Ростовский Богатырь", pos: 1 }, { nick: "зато уютно умирать", pos: 2 }, { nick: "МИШКА МОРГЕН", pos: 3 }, { nick: "El Oreshniko del Perú", pos: 4 }, { nick: "аурная зараза", pos: 5 } ] },
      { name: "James & Jeremy",    logo: "dota2.png", roster: [ { nick: "ihatekirk", pos: 1 }, { nick: "wannafeels", pos: 2 }, { nick: "Голубчик", pos: 3 }, { nick: "king bob", pos: 4 }, { nick: "CocsmeN", pos: 5 } ] },
      { name: "BandaWidst",        logo: "dota2.png", roster: [ { nick: "orgasm donor+", pos: 1 }, { nick: "hikari", pos: 2 }, { nick: "hornet", pos: 3 }, { nick: "最酷的", pos: 4 }, { nick: "west", pos: 5 } ] },
      { name: "MonKs team",        logo: "dota2.png", roster: [ { nick: "keeps", pos: 1 }, { nick: "Иван лон друид", pos: 2 }, { nick: "Kaban", pos: 3 }, { nick: "tierblade", pos: 4 }, { nick: "RemoRi", pos: 5 } ] }
    ],
    casters: [
      { name: "TBD", link: "" }
    ],
    bracketEmbed: "https://challonge.com/ru/g4aub1b4/module",
    registrationLink: "https://docs.google.com/forms/d/1enASbjmlEUqkB8977LhUoBGrmVHD0WyoOi4Xuq7NiXA/edit",
    telegramLink: "https://t.me/SkewerEsports",
    description: "Skewer Esports Season 1 — онлайн-турнир Dota 2, 5×5, bo1 (финал bo3), лимит суммарного MMR команды — 35.000, призовой фонд — 4000₽ (1 место — 3500₽, MVP турнира — 500₽). Взнос 200₽ с команды, минимально 10 команд. Победитель: Podosinoviki (2:1 против NDB). MVP: Мишка Морген (Podosinoviki). Турнир завершён.",
    prizePool: [
      { place: 1, amount: "3.500₽ + 500₽ MVP", team: "Podosinoviki" }
    ]
  },

  {
    id: "AnyLvL-x-GOTF-eSports-Tournament-1",
    title: "AnyLvL x GOTF eSports Tournament #1",
    limit: "До 35.000 MMR на команду",
    start: "2026-04-19",
    end: "2026-04-19",
    startTime: "13:00",
    prize: "13.500₽",
    location: "СНГ",
    teams: 18,
    winner: "EGOISTO Team",
    format: "Single Elimination",
    organizer: "AnyLvL x GOTF",
    links: {
  dotabuff: "",
  discord: "",
  rules: "",
  bracket: ""
},
    teamsList: [
      { name: "Pulse Team",            logo: "dota2.png", roster: [ { nick: "hiori", pos: 1 }, { nick: "redrose", pos: 2 }, { nick: "Yanegi", pos: 3 }, { nick: "drim", pos: 4 }, { nick: "Toshnota", pos: 5 } ] },
      { name: "Dark Reef",             logo: "dota2.png", roster: [ { nick: "Oketra", pos: 4 }, { nick: "DanilkaAbed", pos: 2 }, { nick: "DTI", pos: 3 }, { nick: "666х9", pos: 1 }, { nick: "S1n1ster", pos: 5 } ] },
      { name: "GLHF",                  logo: "dota2.png", roster: [ { nick: "flasko", pos: 1 }, { nick: "Divan prime", pos: 2 }, { nick: "road домой", pos: 3 }, { nick: "НИКОЛАША ПРАЙМ", pos: 4 }, { nick: "heb", pos: 5 } ] },
      { name: "Prodigy",               logo: "dota2.png", roster: [ { nick: "Raynor", pos: 1 }, { nick: "F4cker", pos: 2 }, { nick: "Аджара Гуджу", pos: 3 }, { nick: "Malutka", pos: 4 }, { nick: "Dasigty", pos: 5 } ] },
      { name: "SkyDrifters",           logo: "dota2.png", roster: [ { nick: "Hollow_skies37", pos: 2 }, { nick: "Vnt", pos: 5 }, { nick: "gorilla", pos: 3 }, { nick: "AliceStyle", pos: 4 }, { nick: "dancer", pos: 1 } ] },
      { name: "Barracuda jnr",         logo: "dota2.png", roster: [ { nick: "366roten", pos: 1 }, { nick: "Gosha787898", pos: 2 }, { nick: "BlueDolphin", pos: 3 }, { nick: "Blintlbeis", pos: 4 }, { nick: "5HaZaM", pos: 5 } ] },
      { name: "LETO jr",               logo: "dota2.png", roster: [ { nick: "Teenwave", pos: 1 }, { nick: "Alisa", pos: 2 }, { nick: "popi", pos: 3 }, { nick: "el tivke", pos: 4 }, { nick: "HSMG", pos: 5 } ] },
      { name: "Generation of Miracles",logo: "dota2.png", roster: [ { nick: "XTR666", pos: 1 }, { nick: "The first", pos: 2 }, { nick: "The Prodigy", pos: 3 }, { nick: "Sunset Flower", pos: 4 }, { nick: "Antuano Baobabo", pos: 5 } ] },
      { name: "Team Zachem??? :(",     logo: "dota2.png", roster: [ { nick: "KiddTheAngel", pos: 1 }, { nick: "Делаем грязь (ради неё)", pos: 2 }, { nick: "Rinrin", pos: 3 }, { nick: "Адун", pos: 4 }, { nick: "yleuvyu", pos: 5 } ] },
      { name: "EGOISTO Team",          logo: "dota2.png", roster: [ { nick: "never try #ЧСВ", pos: 1 }, { nick: "Xine", pos: 2 }, { nick: "m1nd1", pos: 3 }, { nick: "Darklight", pos: 4 }, { nick: "☆vsplesk☆", pos: 5 } ] },
      { name: "DVEPO20",               logo: "dota2.png", roster: [ { nick: "Hiroshi", pos: 1 }, { nick: "desnake-", pos: 2 }, { nick: "Yskoglaziy paren'", pos: 3 }, { nick: "consume", pos: 4 }, { nick: "katarsis", pos: 5 } ] },
      { name: "Ouroboros team",        logo: "dota2.png", roster: [ { nick: "SuSOs", pos: 1 }, { nick: "Exorcism", pos: 2 }, { nick: "icno", pos: 3 }, { nick: "arata", pos: 4 }, { nick: "wmmmaaaaa", pos: 5 } ] },
      { name: "Neki4 +4",              logo: "dota2.png", roster: [ { nick: "Oketra", pos: 2 }, { nick: "squalor", pos: 1 }, { nick: "mdk", pos: 3 }, { nick: "all eyes on me", pos: 4 }, { nick: "come around", pos: 5 } ] },
      { name: "Antagonist",            logo: "dota2.png", roster: [ { nick: "пустота", pos: 1 }, { nick: "Semich", pos: 2 }, { nick: "Darkled", pos: 3 }, { nick: "Antagonist", pos: 4 }, { nick: "Gummi_bear", pos: 5 } ] },
      { name: "Tatsinskay Team",       logo: "dota2.png", roster: [ { nick: "Iny", pos: 1 }, { nick: "gleblixo", pos: 2 }, { nick: "Sorry", pos: 3 }, { nick: "Elmisho", pos: 4 }, { nick: "Poga", pos: 5 } ] },
      { name: "Bedlam battle team",    logo: "dota2.png", roster: [ { nick: "cotsu", pos: 1 }, { nick: "imortall_boy", pos: 2 }, { nick: "edsaiii", pos: 3 }, { nick: "marty", pos: 4 }, { nick: "Ariurn", pos: 5 } ] },
      { name: "Team Sexy",             logo: "dota2.png", roster: [ { nick: "hosh1no愛", pos: 1 }, { nick: "fff", pos: 2 }, { nick: "kushinada.", pos: 3 }, { nick: "icememory<3", pos: 4 }, { nick: "Лысый Очколом", pos: 5 } ] },
      { name: "Gitlz",                 logo: "gitlz.png", roster: [ { nick: "breaoutlik", pos: 1 }, { nick: "AstarOtzio", pos: 2 }, { nick: "moody", pos: 3 }, { nick: "Shiroyami", pos: 4 }, { nick: "Akama", pos: 5 } ] },
      { name: "стул и 4 ножки",        logo: "dota2.png", roster: [ { nick: "Miracle-", pos: 1 }, { nick: "rain,", pos: 2 }, { nick: "MAB1K", pos: 3 }, { nick: "yomyko.", pos: 4 }, { nick: "El Gato Negro", pos: 5 } ] }
    ],
    casters: [
      { name: "Paradox_Pog", link: "https://www.twitch.tv/paradox_pog" }
    ],
    bracketEmbed: "https://challonge.com/ru/v3pd6qg4/module",
    registrationLink: "https://forms.gle/cyRVFUPrugiTeo7w6",
    telegramLink: "https://t.me/anylvlcommunity",
    description: "AnyLvL x GOTF eSports Tournament #1 — онлайн-турнир Dota 2, Single Elimination, Captains Mode, BO1 (финал BO3), лимит суммарного MMR команды — 35.000 (до 10.000 на игрока). Призовой фонд — 13.500₽. Дата: 19 апреля. Взнос 750₽ с команды, 18 команд. Победитель: EGOISTO Team (2:0 против Neki4+4). Турнир завершён.",
    prizePool: [
      { place: 1, amount: "9.000₽",  team: "EGOISTO Team" },
      { place: 2, amount: "4.500₽",  team: "Neki4+4" }
    ]
  }
];
