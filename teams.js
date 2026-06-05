// =============================================
//  Anypedia — Team Data  (teams.js)
//
//  name    — актуальное название команды (заголовок страницы).
//  aliases — старые названия / варианты написания.
//            Если в data.js турнир записан со старым названием,
//            сайт всё равно сделает ссылку на эту команду.
//            Можно массивом: ["HATE RELATE", "Fast and Furious 4"]
//            Или строкой:    "HATE RELATE, Fast and Furious 4"
//
//  КАК ДОБАВИТЬ ТУРНИРЫ КОМАНДЫ:
//  Заполните поле tournaments вручную.
//  team.js найдёт турнир в data.js по названию (title) и
//  автоматически сделает кликабельную ссылку.
//  Название в title должно совпадать с полем title в data.js.
//
//  ПРИМЕР:
//  { title: "Bedlam Battles Season 1", date: "2025-08-23", place: "1", prize: "3000₽", limit: "До Божество 5" }
// =============================================

const teams = [
  {
    id: "azutive-fans",
    name: "Azutive Fans",
    aliases: ["HATE RELATE", "Fast & Furious 4"],
    logo: "dota2.png",
    region: "СНГ",
    prize: "0₽",
    telegramLink: "https://t.me/...",   // ссылка на группу/канал команды
    captainLink:  "https://t.me/...",   // личный TG капитана для связи
    description: "Команда СНГ-региона, выступавшая ранее под названиями HATE RELATE и Fast & Furious 4. Коллектив регулярно принимает участие в любительских и полупрофессиональных турнирах, постепенно набирая опыт и развивая состав. Azutive Fans объединяет игроков, стремящихся к стабильному прогрессу и новым результатам на региональной сцене.",

    activeRoster: [
      { nick: "haginsson",  pos: 1, joined: "2025-07-18" },
      { nick: "azutive",   pos: 2, joined: "2025-07-18" },
      { nick: "///",       pos: 3, joined: "2025-07-18" },
      { nick: "matbym",    pos: 4, joined: "2026-04-01" },
      { nick: "Parasiu",   pos: 5, joined: "2025-07-18" },
    ],

    formerPlayers: [
      { nick: "Collapse Mini", pos: 3, joined: "2025-07-18", left: "2026-04-10", newTeam: "DRAGFIRE Ascent"  },
    ],

    // Добавляйте турниры вручную.
    // Поле title должно совпадать с названием в data.js — ссылка появится автоматически.
    tournaments: [
      {
        title: "AnyLvL x GOTF eSports: Special 2",
        date:  "2025-07-18",
        place: "3-4",
        prize: "—",
        limit: "Без лимита MMR"
      },
    ]
  },
    {
    id: "team-sexy",
    name: "Team Sexy",
    aliases: ["Team Sexy", "team sexy", "Team sexy"],
    logo: "teamsexy.png",
    region: "СНГ",
    prize: "~25.000₽",
    telegramLink: "https://t.me/teamsexy1",
    captainLink: "https://t.me/aokee1",
    description: "Одна из наиболее известных любительских команд СНГ-сцены своего уровня. Основана в апреле 2025 года и за время существования стала победителем и призёром множества турниров, включая соревнования серий AnyLvL, Twin и Enrage. В январе 2026 года коллектив временно выступал под тегом GOTF Next, однако позже вернулся к своему основному названию. Team Sexy сохраняет статус опытной команды с богатой турнирной историей и стабильными результатами.",

    activeRoster: [
      { nick: "hosh1no愛", pos: 1, joined: "2025-04-21" },
      { nick: "Gigo",   pos: 2, joined: "2026-05-18" },
      { nick: "icememory<3", pos: 3, joined: "2025-04-21" },
      { nick: "danilK",    pos: 4, joined: "2026-05-18" },
      { nick: "escapist",   pos: 5, joined: "2025-04-21" },
    ],

    formerPlayers: [
      { nick: "danyok", pos: 2, joined: "2025-04-21", left: "2026-05-17", newTeam: ""  },
      { nick: "drim", pos: 4, joined: "2025-04-21", left: "2026-01-18", newTeam: "Bedlam Red"  },
    ],

    // Добавляйте турниры вручную.
    // Поле title должно совпадать с названием в data.js — ссылка появится автоматически.
    tournaments: [
      {
        title: "AnyLvL x GOTF eSports: Special 2",
        date:  "2025-07-20",
        place: "3-4",
        prize: "—",
        limit: "Без лимита MMR"
      },
      {
        title: "AnyLvL x GOTF eSports Tournament #1",
        date:  "2026-04-19",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
    ]
  },
  {
    id: "gitlz",
    name: "Gitlz",
    aliases: ["Gitlz", "Glitz"],
    logo: "gitlz.png",
    region: "СНГ",
    prize: "35.000₽",
    telegramLink: "",
    captainLink: "https://t.me/puziblinchik96",
    description: "Молодая команда СНГ-региона, созданная в начале 2026 года. Коллектив был собран из игроков, объединённых желанием развиваться и добиваться высоких результатов на любительской сцене. Несмотря на небольшой срок существования, Gitlz уже успела завоевать титул Bedlam Swamp Wars и несколько раз попасть в число призёров различных турниров, зарекомендовав себя как перспективный состав.",
    activeRoster:  [
      { nick: "breaoutlik",   pos: 1, joined: "2026-02-10" },
      { nick: "Akama",        pos: 2, joined: "2026-02-21" },
      { nick: "Moody",        pos: 3, joined: "2026-01-14" },
      { nick: "AstarOtzio",   pos: 4, joined: "2026-01-14" },
      { nick: "Nico",         pos: 5, joined: "2026-04-24" },
    ],
    formerPlayers: [
      { nick: "Shiroyami", pos: 4, joined: "2026-02-21", left: "2026-04-24" },
    ],
    tournaments: [
      {
        title: "Bedlam Swamp Wars",
        date:  "2026-03-29",
        place: "1",
        prize: "5.000₽",
        limit: "До 7.500 MMR на игрока"
      },
      {
        title: "AnyLvL x GOTF eSports Tournament #1",
        date:  "2026-04-19",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
      {
        title: "Bedlam Spring Cup",
        date:  "2026-04-26",
        place: "8-12",
        prize: "—",
        limit: "До 8.500 MMR на игрока"
      },
    ]
  },
  {
    id: "leto-junior",
    name: "LETO Junior",
    aliases: ["LETO Junior", "LETO jr", "LETO junior", "Teiko", "TEIKO"],
    logo: "dota2.png",
    region: "СНГ",
    prize: ">4.000₽",
    telegramLink: "https://t.me/hakiavota",
    captainLink: "https://t.me/Mikhael16",
    description: "СНГ-команда, существовавшая с 2025 по 2026 год. За время выступлений коллектив неоднократно показывал достойные результаты на региональных турнирах и сумел завоевать чемпионский титул на AnyLvL x GOTF eSports: Special 2. LETO Junior считалась одной из заметных молодых команд своей сцены, однако в мае 2026 года состав был официально распущен.",
    activeRoster: [
    ],
    formerPlayers: [
      { nick: "Teenwave", pos: 1, joined: "2025-05-14", left: "2026-05-31", newTeam: ""  },
      { nick: "Alisa", pos: 2, joined: "2025-05-14", left: "2026-05-31", newTeam: ""  },
      { nick: "popi", pos: 3, joined: "2025-05-14", left: "2026-05-31", newTeam: ""  },
      { nick: "el tivke", pos: 4, joined: "2025-05-14", left: "2026-05-31", newTeam: ""  },
      { nick: "Freakuxa", pos: 5, joined: "2025-05-14", left: "2026-05-31", newTeam: ""  },
    ],
    tournaments: [
      {
        title: "AnyLvL x GOTF eSports: Special 2",
        date:  "2025-07-20",
        place: "1",
        prize: "2.000₽",
        limit: "Без лимита"
      },
      {
        title: "Bedlam Swamp Wars",
        date:  "2026-03-29",
        place: "3",
        prize: "2.000₽",
        limit: "До 7.500 MMR на игрока"
      },
      {
        title: "Bedlam Spring Cup",
        date:  "2026-04-26",
        place: "5-6",
        prize: "—",
        limit: "До 8.500 MMR на игрока"
      },
      {
        title: "Bedlam Winter Cup: Division 1",
        date:  "2026-02-22",
        place: "5-6",
        prize: "—",
        limit: "До 8500 MMR на игрока"
      },
      {
        title: "Reflection League 4",
        date:  "2026-02-21",
        place: "5-8",
        prize: "—",
        limit: "Без лимита"
      },
      {
        title: "Reflection League 5",
        date:  "2026-03-22",
        place: "9",
        prize: "—",
        limit: "Без лимита"
      },
      {
        title: "SkewerEsports Season 1",
        date:  "2026-05-08",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
      {
        title: "AnyLvL x GOTF eSports Tournament #1",
        date:  "2026-04-19",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
      {
        title: "Reflection League 1",
        date:  "2026-01-31",
        place: "17-27",
        prize: "—",
        limit: "Без лимита"
      },
    ]
  },
  {
    id: "podosinovik",
    name: "Podosinovik",
    aliases: ["Podosinovik team", "Podosinovik", "Подосиновик", "Podosinoviki"],
    logo: "podosinovik.png",
    region: "СНГ",
    prize: "8.500₽",
    telegramLink: "https://t.me/podosinovik_dota",
    captainLink: "https://t.me/prokazz_a",
    description: "Команда СНГ-региона, основанная 3 января 2026 года. С момента создания коллектив практически не менял основной состав, что позволило игрокам выстроить хорошее взаимопонимание и командную игру. Наиболее значимым достижением команды стала победа на SkewerEsports Season 1. Podosinovik известна своей стабильностью, сыгранностью и активным участием в региональных турнирах.",
    activeRoster: [
      { nick: "ИНП",                      pos: 1, joined: "2026-01-03" },
      { nick: "зато уютно умирать",       pos: 2, joined: "2026-01-03" },
      { nick: "МИШКА МОРГЕН",             pos: 3, joined: "2026-01-03" },
      { nick: "El Oreshniko del Perú",    pos: 4, joined: "2026-01-03" },
      { nick: "аурная зараза",            pos: 5, joined: "2026-01-03" },
    ],
    formerPlayers: [],
    tournaments: [
      {
        title: "SkewerEsports Season 1",
        date:  "2026-05-08",
        place: "1",
        prize: "3.500₽",
        limit: "До 35.000 MMR на команду"
      },
      {
        title: "Bedlam Spring Cup",
        date:  "2026-04-26",
        place: "4",
        prize: "—",
        limit: "До 8.500 MMR на игрока"
      },
    ]
  },
  {
    id: "bedlam-red",
    name: "Bedlam Battle Team Red",
    aliases: ["Bedlam Battle Team", "Bedlam Red", "Bedlam Battle Team Red"],
    logo: "bedlamred.png",
    region: "СНГ",
    prize: "12.500₽",
    telegramLink: "https://t.me/bedlambattlesteam",   // ссылка на группу/канал команды
    captainLink:  "https://t.me/ehevbrfypfrb",   // личный TG капитана для связи
    description: "Bedlam Battle Team Red (сокращённо — Bedlam Red) — коллектив из СНГ-региона. Состав дебютировал 18 апреля 2026 года на турнире Bedlam Spring Cup, где завоевал первое место, не проиграв ни одного матча. Команда регулярно принимает участие в любительских и полупрофессиональных соревнованиях, постепенно набирая опыт и укрепляя игровой почерк. Bedlam Red объединяет игроков, стремящихся к стабильному прогрессу и новым результатам на региональной сцене.",

    activeRoster: [
      { nick: "lonixx",  pos: 1, joined: "2026-05-30" },
      { nick: "imortall_boy",  pos: 2, joined: "2026-04-18" },
      { nick: "relax",  pos: 3, joined: "2026-04-18" },
      { nick: "drim.XVI",  pos: 4, joined: "2026-05-30" },
      { nick: "Ariurn",  pos: 5, joined: "2026-04-18" },
    ],

    formerPlayers: [
      { nick: "cotsu", pos: 1, joined: "2026-04-18", left: "2026-05-29", newTeam: "Gitlz"},
      { nick: "marty", pos: 4, joined: "2026-04-19", left: "2026-05-29", newTeam: ""},
      { nick: "yomyKo", pos: 4, joined: "2026-04-18", left: "2026-04-19", newTeam: "" },
    ],

    tournaments: [
      {
        title: "Bedlam Spring Cup",
        date:  "2026-04-18",
        place: "1",
        prize: "12.500₽",
        limit: "До 8.500 MMR на игрока"
      },
      {
        title: "AnyLvL x GOTF eSports: Special 2",
        date:  "2026-04-19",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
      {
        title: "Bedlam Waiting For Summer Cup",
        date:  "2026-05-31",
        place: "9-16",
        prize: "—",
        limit: "До 35.000 MMR на команду"
      },
    ]
  },
];