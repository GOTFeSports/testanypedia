// Anypedia — страницы турниров.
// Данные: tournaments/<slug>/{information,roster,result}.json (список — tournaments/index.json)

const app = document.getElementById('app');
const cache = new Map();

/* ---------- Утилиты ---------- */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = (s) => esc(encodeURIComponent(s));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? esc(u) : '');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (n) => (n == null || n === '' || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('ru-RU'));
const hasScore = (m) => m.score1 != null && m.score2 != null && m.score1 !== '' && m.score2 !== '' && !isNaN(m.score1) && !isNaN(m.score2);

// Путь к файлу: полный URL как есть, иначе относительно папки турнира
const asset = (base, p) =>
  !p ? '' : /^https?:\/\//i.test(p) ? esc(p) : esc(base + String(p).split('/').map(encodeURIComponent).join('/'));

const flag = (cc) =>
  /^[a-z]{2}$/i.test(cc || '')
    ? `<img class="flag" src="https://flagcdn.com/w20/${cc.toLowerCase()}.png" alt="${esc(cc.toUpperCase())}" width="18" height="13" loading="lazy" onerror="this.remove()">`
    : '';

const STATUS = { upcoming: 'Скоро', live: 'Идёт', finished: 'Завершён' };
const badge = (s) => `<span class="badge st-${esc(s)}">${esc(STATUS[s] || s || '')}</span>`;

const toDate = (d) => (d ? new Date(`${d}T00:00:00`) : null);
function fmtDate(d) {
  const x = toDate(d);
  if (!x) return '';
  return isNaN(x) ? esc(d) : x.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/ г\.$/, '');
}
const shortDate = (d) => {
  const x = toDate(d);
  return x && !isNaN(x) ? x.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') : '';
};
function dateRange(a, b) {
  if (!a && !b) return 'Дата уточняется';
  if (!b || a === b) return fmtDate(a || b);
  const x = toDate(a), y = toDate(b);
  if (!isNaN(x) && !isNaN(y) && x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) {
    const month = x.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/ г\.$/, '');
    return `${x.getDate()}–${y.getDate()} ${month}`;
  }
  return `${fmtDate(a)} — ${fmtDate(b)}`;
}

function getJson(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url, { cache: 'no-cache' })
        .then((r) => {
          if (r.ok) return r.json();
          if (r.status === 404) return null;
          throw new Error(`${url} — ${r.status}`);
        })
        .catch((e) => {
          cache.delete(url);
          throw e;
        }),
    );
  }
  return cache.get(url);
}

/* ---------- Команды: логотип, чип, аббревиатура ---------- */

function tlogo(ctx, name, size = '') {
  const t = ctx.teams.get(name);
  return t?.logo
    ? `<img class="tlogo ${size}" src="${asset(ctx.base, t.logo)}" alt="" loading="lazy">`
    : `<span class="tlogo ph ${size}">${esc(String(name || '?').trim().charAt(0).toUpperCase())}</span>`;
}
const teamChip = (ctx, name) =>
  name
    ? `<span class="chip">${tlogo(ctx, name)}<span class="txt">${esc(name)}</span></span>`
    : `<span class="chip tbd"><span class="txt">Определится</span></span>`;

function abbr(name) {
  const words = String(name).trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => (/^\d+$/.test(w) ? w : w[0].toUpperCase())).join('');
}

/* ---------- Главная: список турниров ---------- */

const tournamentCard = (t) => `
  <a class="card tcard" href="#/t/${enc(t.slug)}">
    <div class="tcard-top">${badge(t.status)}<span class="muted">${dateRange(t.date_start, t.date_end)}</span></div>
    <div class="tcard-title">
      ${t.logo ? `<img class="tlogo lg" src="${asset(`tournaments/${encodeURIComponent(t.slug)}/`, t.logo)}" alt="" loading="lazy">` : ''}
      <h3>${esc(t.name)}</h3>
    </div>
    <dl class="mini">
      ${t.prize_pool ? `<div><dt>Призовой фонд</dt><dd>${esc(t.prize_pool)}</dd></div>` : ''}
      ${t.pts_cap ? `<div><dt>Лимит ПТС</dt><dd>${num(t.pts_cap)}</dd></div>` : ''}
      <div><dt>Команд</dt><dd>${t.teams_count || '—'}</dd></div>
      ${t.winner ? `<div><dt>Победитель</dt><dd>${esc(t.winner)}</dd></div>` : ''}
    </dl>
  </a>`;

async function homeView() {
  const idx = await getJson('tournaments/index.json');
  if (!idx) throw new Error('tournaments/index.json не найден — запустите npm run build');
  const list = idx.tournaments || [];
  return `
    <section class="intro">
      <h1>Турниры Dota 2 с ограничением по ПТС</h1>
      <p>Призовые места, составы команд, групповые этапы и сетки полупрофессиональных турниров СНГ.</p>
    </section>
    <h2>Все турниры</h2>
    ${
      list.length
        ? `<div class="grid">${list.map(tournamentCard).join('')}</div>`
        : `<div class="empty">Турниров пока нет. Добавьте папку в <code>tournaments/</code> и запустите <code>npm run build</code>.</div>`
    }`;
}

/* ---------- Инфобокс ---------- */

const LINK_LABELS = {
  challonge: 'Challonge', rules: 'Регламент', stream: 'Трансляция', discord: 'Discord', telegram: 'Telegram',
  vk: 'VK', youtube: 'YouTube', twitch: 'Twitch', site: 'Сайт',
};
const TYPES = { online: 'Онлайн', lan: 'LAN', hybrid: 'Онлайн + LAN' };

function infobox(ctx) {
  const i = ctx.info;
  const row = (label, value) => (value ? `<div class="ib-row"><dt>${label}</dt><dd>${value}</dd></div>` : '');
  const lines = (v) => arr(v).map(esc).join('<br>');
  const teamsCount = ctx.roster?.teams?.length || '';

  const links = Object.entries(i.links || {})
    .filter(([, u]) => safeUrl(u))
    .map(([k, u]) => `<a class="pill-link" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${esc(LINK_LABELS[k] || k)}</a>`)
    .join('');

  const chrono = (label, c) =>
    c?.name ? `<div class="ib-row"><dt>${label}</dt><dd>${c.slug ? `<a href="#/t/${enc(c.slug)}">${esc(c.name)}</a>` : esc(c.name)}</dd></div>` : '';
  const chronology = chrono('← Раньше', i.chronology?.previous) + chrono('Позже →', i.chronology?.next);

  return `
    <aside class="infobox">
      <div class="ib-title">${esc(i.name)}</div>
      ${i.logo ? `<div class="ib-logo"><img src="${asset(ctx.base, i.logo)}" alt=""></div>` : ''}
      <div class="ib-head">Информация о турнире</div>
      <dl>
        ${row('Серия', esc(i.series))}
        ${row('Организатор', esc(i.organizer))}
        ${row('Спонсоры', lines(i.sponsors))}
        ${row('Сервер', esc(i.server))}
        ${row('Тип', esc(TYPES[i.type] || i.type))}
        ${row('Локация', esc(i.location))}
        ${row('Формат', lines(i.format))}
        ${row('Призовой фонд', esc(i.prize_pool))}
        ${row('Лимит ПТС', i.pts_cap ? num(i.pts_cap) : '')}
        ${row('Начало', fmtDate(i.date_start))}
        ${row('Окончание', fmtDate(i.date_end))}
        ${row('Игра', esc(i.game || 'Dota 2'))}
        ${row('Версия', esc(i.version))}
        ${row('Команд', teamsCount)}
        ${row('Уровень', esc(i.tier))}
      </dl>
      ${links ? `<div class="ib-head">Ссылки</div><div class="ib-links">${links}</div>` : ''}
      ${chronology ? `<div class="ib-head">Хронология</div><dl>${chronology}</dl>` : ''}
    </aside>`;
}

/* ---------- Участники ---------- */

const TEAM_STATUS = { invited: 'Приглашена', qualified: 'Квалификация', registered: 'Заявка' };

function participantsSection(ctx) {
  const teams = ctx.roster?.teams || [];
  if (!teams.length) return '';
  const person = (p, tag) =>
    `<li class="${tag ? 'sub' : ''}">${flag(p.country)}<span class="nick">${esc(p.nick)}</span>${
      tag ? `<span class="pill">${tag}</span>` : `<span class="pos">${esc(p.pos ?? '')}</span>`
    }</li>`;

  const cards = teams
    .map((t) => {
      const players = (t.players || []).map((p, i) => person({ ...p, pos: p.pos ?? i + 1 })).join('');
      const subs = arr(t.subs).map((p) => person(p, 'Запас')).join('');
      const coach = arr(t.coach).map((p) => person(p, 'Тренер')).join('');
      return `
        <article class="pcard">
          <header>
            ${tlogo(ctx, t.name, 'md')}<h3>${esc(t.name)}</h3>
            ${t.status ? `<span class="pill">${esc(TEAM_STATUS[t.status] || t.status)}</span>` : ''}
          </header>
          ${t.qualifier ? `<div class="qual">${esc(t.qualifier)}</div>` : ''}
          <ul class="roster">${players}${subs}${coach}</ul>
        </article>`;
    })
    .join('');

  return `
    <section id="participants">
      <h2>Участники <span class="count">· ${teams.length}</span></h2>
      <div class="participants rosters-on">
        <div class="controls">
          <label class="sw"><input type="checkbox" data-toggle="rosters-on" checked><span>Показывать составы</span></label>
          <label class="sw"><input type="checkbox" data-toggle="compact"><span>Компактный вид</span></label>
        </div>
        <div class="pgrid">${cards}</div>
      </div>
    </section>`;
}

/* ---------- Призовые места ---------- */

function prizesSection(ctx) {
  const { info, result } = ctx;
  const prizeFor = (place) => {
    const p = (info.prizes || []).find((x) => place >= x.place && place <= (x.place_to ?? x.place));
    return p?.prize || null;
  };

  const placements = [...(result?.placements || [])].sort((a, b) => a.place - b.place);
  let rows;
  if (placements.length) {
    const map = new Map();
    for (const p of placements) {
      const key = p.label || String(p.place);
      if (!map.has(key)) map.set(key, { place: p.place, label: key, teams: [] });
      map.get(key).teams.push(p.team);
    }
    rows = [...map.values()];
  } else {
    // турнир ещё не сыгран — показываем только призовую сетку
    rows = [...(info.prizes || [])]
      .sort((a, b) => a.place - b.place)
      .map((p) => ({ place: p.place, label: p.place_to ? `${p.place}–${p.place_to}` : String(p.place), teams: [] }));
  }
  if (!rows.length) return '';
  rows.forEach((r) => (r.prize = prizeFor(r.place)));

  // По умолчанию — только места с призом (если призов нет — топ‑3). Остальные раскрываются.
  let visible = rows.filter((r) => r.prize);
  if (!visible.length) visible = rows.slice(0, 3);
  const hidden = rows.filter((r) => !visible.includes(r));

  const body = rows
    .map((r) => {
      const cls = r.place <= 3 ? `r${r.place}` : '';
      const extra = hidden.includes(r) ? 'extra' : '';
      const teams = r.teams.length
        ? `<div class="pteams">${r.teams.map((t) => teamChip(ctx, t)).join('')}</div>`
        : teamChip(ctx, null);
      return `<tr class="${cls} ${extra}"><td class="n"><span class="pbadge">${esc(r.label)}</span></td><td>${teams}</td><td class="r">${r.prize ? esc(r.prize) : '—'}</td></tr>`;
    })
    .join('');

  let more = '';
  if (hidden.length) {
    const start = String(hidden[0].label).split(/[–-]/)[0];
    const end = String(hidden[hidden.length - 1].label).split(/[–-]/).pop();
    const closed = start === end ? `Показать место ${start}` : `Показать места ${start}–${end}`;
    more = `<button type="button" class="more" data-expand data-closed="${esc(closed)}" data-open="Скрыть">${esc(closed)}</button>`;
  }

  return `
    <section id="prizes">
      <h2>Призовые места</h2>
      ${info.prize_pool ? `<p class="note">Призовой фонд <b>${esc(info.prize_pool)}</b> распределяется между участниками:</p>` : ''}
      <div class="tbl prizes">
        <table>
          <thead><tr><th>Место</th><th>Участник</th><th class="r">Приз</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
        ${more}
      </div>
    </section>`;
}

/* ---------- Групповой этап ---------- */

function computeGroup(g) {
  const names = arr(g.teams).length ? g.teams : [...new Set((g.matches || []).flatMap((m) => [m.team1, m.team2]))];
  const st = new Map(names.map((n) => [n, { name: n, w: 0, d: 0, l: 0, gw: 0, gl: 0 }]));
  for (const m of g.matches || []) {
    if (!hasScore(m)) continue;
    const a = st.get(m.team1), b = st.get(m.team2);
    if (!a || !b) continue;
    const s1 = +m.score1, s2 = +m.score2;
    a.gw += s1; a.gl += s2; b.gw += s2; b.gl += s1;
    if (s1 > s2) { a.w++; b.l++; } else if (s1 < s2) { b.w++; a.l++; } else { a.d++; b.d++; }
  }
  return [...st.values()].sort(
    (x, y) => y.w - x.w || y.d - x.d || y.gw - y.gl - (x.gw - x.gl) || y.gw - x.gw || x.name.localeCompare(y.name, 'ru'),
  );
}

function groupBlock(ctx, g) {
  const rows = computeGroup(g);
  const adv = Number(g.advance) || 0;
  const started = rows.some((r) => r.w + r.d + r.l);
  const anyDraw = rows.some((r) => r.d);

  const trs = rows
    .map((r, i) => {
      const cls = adv && started ? (i < adv ? 'adv' : 'out') : '';
      return `<tr class="${cls}"><td class="n">${i + 1}</td><td>${teamChip(ctx, r.name)}</td><td class="c">${r.w}-${anyDraw ? `${r.d}-` : ''}${r.l}</td><td class="c">${r.gw} - ${r.gl}</td></tr>`;
    })
    .join('');

  const head = (r) => {
    const t = ctx.teams.get(r.name);
    return `<th title="${esc(r.name)}">${t?.logo ? tlogo(ctx, r.name) : `<span class="abbr">${esc(abbr(r.name))}</span>`}</th>`;
  };
  const find = (a, b) => (g.matches || []).find((m) => (m.team1 === a && m.team2 === b) || (m.team1 === b && m.team2 === a));
  const cross = rows
    .map((row, i) => {
      const cells = rows
        .map((col, j) => {
          if (i === j) return `<td class="self"></td>`;
          const m = find(row.name, col.name);
          if (!m || !hasScore(m)) return `<td></td>`;
          const mine = m.team1 === row.name ? +m.score1 : +m.score2;
          const other = m.team1 === row.name ? +m.score2 : +m.score1;
          const c = mine > other ? 'w' : mine < other ? 'l' : 'd';
          return `<td class="${c}"><b>${mine}-${other}</b>${m.date ? `<small>${esc(shortDate(m.date))}</small>` : ''}</td>`;
        })
        .join('');
      return `<tr>${head(row)}${cells}</tr>`;
    })
    .join('');

  return `
    <div class="group">
      <h3>${esc(g.name || 'Группа')}</h3>
      <div class="gwrap">
        <div class="tbl st">
          <table>
            <thead><tr><th>#</th><th>Участник</th><th class="c">Матчи</th><th class="c">Карты</th></tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
        <div class="tbl xt"><table><tbody>${cross}</tbody></table></div>
      </div>
    </div>`;
}

function groupsSection(ctx) {
  const groups = ctx.result?.groups || [];
  if (!groups.length) return '';
  return `<section id="groups"><h2>Групповой этап</h2>${groups.map((g) => groupBlock(ctx, g)).join('')}</section>`;
}

/* ---------- Плей-офф ---------- */

function bmatch(ctx, m) {
  const known = hasScore(m);
  const s1 = +m.score1, s2 = +m.score2;
  const cls = (a, b) => (!known ? '' : a > b ? 'win' : a < b ? 'lose' : '');
  const team = (name, score, c) =>
    `<div class="bteam ${name ? c : 'tbd'}"><span class="bname">${
      name ? `${tlogo(ctx, name, 'sm')}<span class="txt">${esc(name)}</span>` : '<span class="txt">TBD</span>'
    }</span><span class="bscore">${known ? esc(score) : ''}</span></div>`;
  return `<div class="bmatch"${m.id ? ` data-id="${esc(m.id)}"` : ''}${m.next ? ` data-next="${esc(m.next)}"` : ''}${m.date ? ` title="${fmtDate(m.date)}"` : ''}>${team(m.team1, m.score1, cls(s1, s2))}${team(m.team2, m.score2, cls(s2, s1))}</div>`;
}

function playoffsSection(ctx) {
  const rounds = ctx.result?.playoffs?.rounds || [];
  if (!rounds.length) return '';
  const by = (k) => rounds.filter((r) => (r.bracket || 'upper') === k);
  const col = (r) =>
    `<div class="bcol"><div class="bhead">${esc(r.name)}</div><div class="bms">${(r.matches || []).map((m) => bmatch(ctx, m)).join('')}</div></div>`;
  const row = (k) => (by(k).length ? `<div class="brow">${by(k).map(col).join('')}</div>` : '');
  const fin = by('final');
  return `
    <section id="playoffs">
      <h2>Плей-офф</h2>
      <div class="bracket"><div class="binner">
        <svg class="blines" aria-hidden="true"></svg>
        <div class="bmain">${row('upper')}${row('lower')}</div>
        ${fin.length ? `<div class="bfinal">${fin.map(col).join('')}</div>` : ''}
      </div></div>
    </section>`;
}

// Линии сетки: от правого края матча к левому краю матча, куда проходит победитель (data-next)
function drawBrackets() {
  document.querySelectorAll('.binner').forEach((inner) => {
    const svg = inner.querySelector('.blines');
    if (!svg) return;
    const r0 = inner.getBoundingClientRect();
    svg.setAttribute('width', inner.scrollWidth);
    svg.setAttribute('height', inner.scrollHeight);
    let d = '';
    inner.querySelectorAll('.bmatch[data-next]').forEach((a) => {
      const b = inner.querySelector(`.bmatch[data-id="${CSS.escape(a.dataset.next)}"]`);
      if (!b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.right - r0.left, y1 = ra.top + ra.height / 2 - r0.top;
      const x2 = rb.left - r0.left, y2 = rb.top + rb.height / 2 - r0.top;
      const xm = x1 + (x2 - x1) / 2;
      d += `M${x1} ${y1}H${xm}V${y2}H${x2}`;
    });
    svg.innerHTML = `<path d="${d}"/>`;
  });
}

/* ---------- Матчи списком (если нет групп и сетки) ---------- */

function matchesSection(ctx) {
  const { result } = ctx;
  if (result?.groups?.length || result?.playoffs?.rounds?.length) return '';
  const matches = result?.matches || [];
  if (!matches.length) return '';
  const rounds = new Map();
  for (const m of matches) {
    const k = m.round || 'Матчи';
    if (!rounds.has(k)) rounds.set(k, []);
    rounds.get(k).push(m);
  }
  const html = [...rounds]
    .map(([round, ms]) => {
      const rows = ms
        .map((m) => {
          const known = hasScore(m);
          const s1 = +m.score1, s2 = +m.score2;
          const c1 = known ? (s1 > s2 ? 'win' : s1 < s2 ? 'lose' : '') : '';
          const c2 = known ? (s2 > s1 ? 'win' : s2 < s1 ? 'lose' : '') : '';
          return `<div class="match"><span class="${c1}">${esc(m.team1)}</span><span class="score">${known ? `${s1} : ${s2}` : 'vs'}</span><span class="t2 ${c2}">${esc(m.team2)}</span></div>`;
        })
        .join('');
      return `<div class="round"><h3>${esc(round)}</h3>${rows}</div>`;
    })
    .join('');
  return `<section id="matches"><h2>Матчи</h2>${html}</section>`;
}

/* ---------- Трансляции ---------- */

const LANGS = { ru: ['Русский', 'ru'], en: ['English', 'gb'], uk: ['Українська', 'ua'], kz: ['Қазақша', 'kz'], by: ['Беларуская', 'by'] };
const PLATFORMS = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', vk: 'VK Видео', telegram: 'Telegram' };

function streamsSection(ctx) {
  const streams = arr(ctx.info.streams).filter((s) => safeUrl(s.url));
  if (!streams.length) return '';
  const groups = new Map();
  for (const s of streams) {
    const k = s.lang || 'ru';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  const cards = [...groups]
    .map(([k, list]) => {
      const [name, cc] = LANGS[k] || [k, k];
      const links = list
        .map((s) => `<a class="pill-link" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(PLATFORMS[s.platform] || s.platform || 'Трансляция')}</a>`)
        .join('');
      return `<div class="scard"><div class="slang">${flag(cc)}<span>${esc(name)}</span></div><div class="slinks">${links}</div></div>`;
    })
    .join('');
  return `<section id="streams"><h2>Трансляции</h2><div class="sgrid">${cards}</div></section>`;
}

/* ---------- Страница турнира ---------- */

async function tournamentView(slug) {
  const base = `tournaments/${encodeURIComponent(slug)}/`;
  const info = await getJson(`${base}information.json`);
  if (!info) return notFound();
  const [roster, result] = await Promise.all([getJson(`${base}roster.json`), getJson(`${base}result.json`)]);
  const ctx = { slug, base, info, roster, result, teams: new Map((roster?.teams || []).map((t) => [t.name, t])) };

  document.title = `${info.name} — Anypedia`;

  const sections = [
    ['participants', 'Участники', participantsSection(ctx)],
    ['prizes', 'Призовые места', prizesSection(ctx)],
    ['groups', 'Групповой этап', groupsSection(ctx)],
    ['playoffs', 'Плей-офф', playoffsSection(ctx)],
    ['matches', 'Матчи', matchesSection(ctx)],
    ['streams', 'Трансляции', streamsSection(ctx)],
  ].filter((s) => s[2]);

  const nav = sections.map(([id, label]) => `<a href="#/t/${enc(slug)}" data-scroll="${id}">${label}</a>`).join('');

  return `
    <a class="back" href="#/">← Все турниры</a>
    <header class="thead">
      ${badge(info.status)}
      <h1>${esc(info.name)}</h1>
      ${info.description ? `<p>${esc(info.description)}</p>` : ''}
      ${nav ? `<nav class="snav">${nav}</nav>` : ''}
    </header>
    <div class="layout">
      <div class="main">${sections.map((s) => s[2]).join('') || '<div class="empty">Данные турнира пока не добавлены.</div>'}</div>
      ${infobox(ctx)}
    </div>`;
}

/* ---------- Служебное ---------- */

const notFound = () => `
  <div class="empty"><h2 style="margin-top:0;border:0">Страница не найдена</h2><p><a href="#/" class="btn">К списку турниров</a></p></div>`;

const errorView = (e) => `
  <div class="empty">
    <h2 style="margin-top:0;border:0">Не удалось загрузить данные</h2>
    <p>${esc(e.message)}</p>
    <p class="note">Если открыли <code>index.html</code> двойным кликом — так не работает. Запустите <code>npm run serve</code> и откройте <code>http://localhost:8080</code>.</p>
  </div>`;

async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const m = hash.match(/^\/t\/([^/?]+)/);
  document.title = 'Anypedia — турниры Dota 2 с ограничением по ПТС';
  try {
    if (m) app.innerHTML = await tournamentView(decodeURIComponent(m[1]));
    else if (hash === '/') app.innerHTML = await homeView();
    else app.innerHTML = notFound();
  } catch (e) {
    console.error(e);
    app.innerHTML = errorView(e);
  }
  window.scrollTo(0, 0);
  requestAnimationFrame(drawBrackets);
}

// Переключатели, раскрытие призов, прокрутка к секциям
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches?.('[data-toggle]')) t.closest('.participants')?.classList.toggle(t.dataset.toggle, t.checked);
});
app.addEventListener('click', (e) => {
  const more = e.target.closest('[data-expand]');
  if (more) {
    const box = more.closest('.prizes');
    const open = box.classList.toggle('open');
    more.textContent = open ? more.dataset.open : more.dataset.closed;
    return;
  }
  const link = e.target.closest('[data-scroll]');
  if (link) {
    e.preventDefault();
    document.getElementById(link.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

window.addEventListener('hashchange', route);
window.addEventListener('resize', drawBrackets);
document.fonts?.ready.then(drawBrackets);
route();
