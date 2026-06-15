// =============================================
//  Anypedia — Organizer Data (organizers.js)
//
//  name    — актуальное название организатора (заголовок страницы).
//  aliases — варианты написания, как они встречаются в поле
//            "organizer" турниров в data.js.
//
//  КАК ДОБАВИТЬ ОРГАНИЗАТОРА:
//  1. Скопируйте блок ниже, заполните поля.
//  2. id — латиницей, через дефис, используется в URL: /organizer/ID
//  3. aliases должны ТОЧНО совпадать (без учёта регистра/пробелов)
//     со значением поля organizer в data.js — тогда:
//       - на странице турнира "Организатор" станет ссылкой
//       - в списке турниров организатора появится этот турнир
//       - организатор появится в результатах поиска
//
//  ПРИМЕР:
//  {
//    id: "my-org",
//    name: "My Org",
//    aliases: ["My Org", "MyOrg Tournaments"],
//    logo: "dota2.png",          // картинка в корне сайта, опционально
//    region: "СНГ",
//    description: "Описание организатора...",
//    telegramLink: "https://t.me/...",
//    discordLink: "https://discord.gg/...",
//    links: { website: "" }      // доп. ссылки, опционально
//  }
// =============================================

const organizers = [
  {
    id: "Bedlam-Battles-Tournaments",
    name: "Bedlam Battles Tournaments",
    aliases: ["Bedlam Tournaments"],
    logo: "bedlamt.png",
    region: "СНГ",
    description: "Bedlam Battles Tournaments — турнирный оператор, фокусирующийся на создании регулярных любительских лиг по Dota 2. Организация проводит сезонные лиги, тематические турниры и другие события любительских и полупрофессиональных соревнований.",
    telegramLink: "https://t.me/bedlamtournaments",
    discordLink: "https://discord.gg/FktVXm4gRD",
    links: {
      website: ""
    }
  },
  {
    id: "skeweresports",
    name: "SkewerEsports",
    aliases: ["SkewerEsports"],
    logo: "skewer.png",
    region: "СНГ",
    description: "SkewerEsports — турнирный оператор, фокусирующийся на создании регулярных любительских турниров по Dota 2 для игроков низкого и среднего рейтинга. Организация проводит сезонные онлайн-турниры с MMR-лимитами для развивающихся и среднеуровневых команд.",
    telegramLink: "https://t.me/SkewerEsports",
    discordLink: "https://discord.gg/M6QaGMkdDr",
    links: {
      website: ""
    }
  },
  {
    id: "reflection-league",
    name: "Reflection League",
    aliases: ["Reflection League", "Reflection"],
    logo: "reflection.png",
    region: "СНГ",
    description: "Reflection League — турнирный оператор, фокусирующийся на создании регулярных любительских лиг и турниров по Dota 2. Организация проводит сезонные выпуски Reflection League, онлайн-соревнования с ограничением по MMR для развивающихся и среднеуровневых команд.",
    telegramLink: "https://t.me/reflectionleague",
    discordLink: "",
    links: {
      website: ""
    }
  },
  {
    id: "rampage-tournaments",
    name: "RAMPAGE Tournaments",
    aliases: ["RAMPAGE Tournaments", "RAMPAGE", "ECHO Rapture & RAMPAGE Tournaments"],
    logo: "dota2.png",
    region: "СНГ",
    description: "RAMPAGE Tournaments — турнирный оператор, фокусирующийся на создании регулярных любительских турниров по Dota 2 для игроков низких рангов. Организация проводит частые онлайн-турниры и события для начинающих и развивающихся команд.",
    telegramLink: "https://t.me/rampagetournaments",
    discordLink: "https://discord.gg/yBGQ4ssxH",
    links: {
      website: ""
    }
  },
    {
    id: "anylvl-community",
    name: "AnyLvL Community",
    aliases: ["AnyLvL Community", "AnyLvL", "AnyLvL x GOTF", "AnyLvL Community x GOTF eSports"],
    logo: "anylvl.png",
    region: "СНГ",
    description: "AnyLvL Community — турнирный оператор, фокусирующийся на создании регулярных любительских турниров по Dota 2 для игроков малых и низких рангов. Организация проводит серии турниров, совместные события (например, AnyLvL x GOTF eSports) и онлайн-соревнования с MMR-лимитами для начинающих и развивающихся команд.",
    telegramLink: "https://t.me/anylvlcommunity",
    discordLink: "discord.gg/Yxu2yXfzef",
    links: {
      website: ""
    }
  },
];

/* ============================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ — используются на других страницах
   для поиска организатора по названию из data.js и построения
   ссылок/слагов.
   ============================================================ */

function normOrgStr(v) {
  return String(v || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function slugifyOrganizer(value) {
  return String(value || '').normalize('NFKC').trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'organizer';
}

function getOrganizerId(org) {
  return org.id || slugifyOrganizer(org.name);
}

function organizerAllNames(org) {
  const aliases = org.aliases || [];
  const list = Array.isArray(aliases)
    ? aliases
    : String(aliases).split(',').map(s => s.trim()).filter(Boolean);
  return [org.name, ...list].filter(Boolean).map(normOrgStr);
}

/* Разбивает строку организатора на отдельные "куски" —
   на случай коллабораций вида "ECHO Rapture & RAMPAGE Tournaments",
   "Organizer1 x Organizer2", "A, B" и т.д. */
function splitOrganizerName(name) {
  return String(name || '')
    .split(/\s*(?:&|\+|,|\/|×| x | X | vs | VS | и )\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* Найти организатора по строке из поля tournament.organizer.
   Сначала пробуем точное совпадение всей строки, затем —
   совпадение по отдельным частям (для коллабораций). */
function findOrganizerByName(name) {
  if (!name) return null;
  const list = typeof organizers !== 'undefined' ? organizers : [];

  const key = normOrgStr(name);
  let found = list.find(o => organizerAllNames(o).includes(key));
  if (found) return found;

  for (const part of splitOrganizerName(name)) {
    const partKey = normOrgStr(part);
    if (!partKey) continue;
    found = list.find(o => organizerAllNames(o).includes(partKey));
    if (found) return found;
  }

  return null;
}

/* Найти ВСЕХ организаторов, упомянутых в строке (для коллабораций) */
function findAllOrganizersByName(name) {
  if (!name) return [];
  const list = typeof organizers !== 'undefined' ? organizers : [];
  const result = [];
  const seen = new Set();

  const tryAdd = (key) => {
    const found = list.find(o => organizerAllNames(o).includes(key));
    if (found) {
      const id = getOrganizerId(found);
      if (!seen.has(id)) { seen.add(id); result.push(found); }
    }
  };

  tryAdd(normOrgStr(name));
  for (const part of splitOrganizerName(name)) {
    tryAdd(normOrgStr(part));
  }

  return result;
}

/* Получить все турниры конкретного организатора (с учётом коллабораций —
   турнир засчитывается организатору, если он упомянут где-либо в поле organizer) */
function getOrganizerTournaments(org) {
  if (!org) return [];
  const allT = typeof tournaments !== 'undefined' ? tournaments : [];
  const oid = getOrganizerId(org);
  return allT.filter(t => {
    const matched = findAllOrganizersByName(t.organizer);
    return matched.some(m => getOrganizerId(m) === oid);
  });
}

/* Автоматический подсчёт суммарного призового фонда организатора
   на основе всех его турниров из data.js */
function calcOrganizerPrize(org) {
  if (!org) return null;
  const myT = getOrganizerTournaments(org);

  let total = 0;
  let hasParsed = false;
  myT.forEach(t => {
    const raw = String(t.prize || '');
    // Убираем пробелы/точки-разделители тысяч, ищем число
    const m = raw.replace(/\s/g, '').replace(/\./g, '').match(/(\d+)/);
    if (m) { total += parseInt(m[1], 10); hasParsed = true; }
  });

  if (!hasParsed) return null;
  return total.toLocaleString('ru-RU') + '₽';
}
