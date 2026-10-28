// Anypedia — страницы турниров. Данные берутся из tournaments/<slug>/{information,roster,result}.json

const app = document.getElementById('app');
let indexCache = null;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = (s) => esc(encodeURIComponent(s));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? esc(u) : '');
const num = (n) => (n == null || n === '' || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('ru-RU'));

const STATUS = { upcoming: 'Скоро', live: 'Идёт', finished: 'Завершён' };
const badge = (s) => `<span class="badge st-${esc(s)}">${esc(STATUS[s] || s || '')}</span>`;

function fmtDate(d) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return isNaN(x) ? esc(d) : x.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function dateRange(a, b) {
  if (!a && !b) return 'Дата уточняется';
  if (!b || a === b) return fmtDate(a || b);
  const x = new Date(`${a}T00:00:00`), y = new Date(`${b}T00:00:00`);
  if (!isNaN(x) && !isNaN(y) && x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) {
    const month = x.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/ г\.$/, '');
    return `${x.getDate()}–${y.getDate()} ${month}`;
  }
  return `${fmtDate(a)} — ${fmtDate(b)}`;
}

async function getJson(url, optional = false) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) {
    if (optional && r.status === 404) return null;
    throw new Error(`${url} — ${r.status}`);
  }
  return r.json();
}

/* ---------- Главная: список турниров ---------- */

const tournamentCard = (t) => `
  <a class="card tcard" href="#/t/${enc(t.slug)}">
    <div class="tcard-top">${badge(t.status)}<span class="muted">${dateRange(t.date_start, t.date_end)}</span></div>
    <h3>${esc(t.name)}</h3>
    <dl class="mini">
      ${t.prize_pool ? `<div><dt>Призовой фонд</dt><dd>${esc(t.prize_pool)}</dd></div>` : ''}
      ${t.pts_cap ? `<div><dt>Лимит ПТС</dt><dd>${num(t.pts_cap)}</dd></div>` : ''}
      <div><dt>Команд</dt><dd>${t.teams_count || '—'}</dd></div>
      ${t.winner ? `<div><dt>Победитель</dt><dd>${esc(t.winner)}</dd></div>` : ''}
    </dl>
  </a>`;

async function homeView() {
  indexCache ??= await getJson('tournaments/index.json');
  const list = indexCache.tournaments || [];
  return `
    <section class="intro">
      <h1>Турниры Dota 2 с ограничением по ПТС</h1>
      <p>Призовые места, составы команд и результаты полупрофессиональных турниров СНГ.</p>
    </section>
    <h2>Все турниры</h2>
    ${
      list.length
        ? `<div class="grid">${list.map(tournamentCard).join('')}</div>`
        : `<div class="empty">Турниров пока нет. Добавьте папку в <code>tournaments/</code> и запустите <code>npm run build</code>.</div>`
    }`;
}

/* ---------- Страница турнира ---------- */

function prizeResolver(prizes) {
  return (place) => {
    const p = (prizes || []).find((x) => place >= x.place && place <= (x.place_to ?? x.place));
    return p?.prize || null;
  };
}

function placeCard({ place, label, team, prize, roster }) {
  const cls = place <= 3 ? `p${place}` : 'pn';
  const rt = team && (roster?.teams || []).find((t) => t.name === team);
  const nicks = rt ? (rt.players || []).map((p) => p.nick).join(', ') : '';
  return `
    <div class="place ${cls}">
      <div class="place-head"><span class="place-num">${esc(label || place)}</span><span class="place-word">${label ? 'места' : 'место'}</span></div>
      ${team ? `<div class="place-team">${esc(team)}</div>` : `<div class="place-team tbd">Определится по итогам</div>`}
      ${nicks ? `<div class="place-roster">${esc(nicks)}</div>` : ''}
      ${prize ? `<div class="place-prize">${esc(prize)}</div>` : ''}
    </div>`;
}

function placesSection(info, roster, result) {
  const prizeFor = prizeResolver(info.prizes);
  const placements = [...(result?.placements || [])].sort((a, b) => a.place - b.place);

  // Турнир ещё не сыгран: показываем только призовую сетку
  if (!placements.length) {
    const prizes = [...(info.prizes || [])].sort((a, b) => a.place - b.place);
    if (!prizes.length) return '';
    return `
      <h2>Призовые места</h2>
      <div class="places">${prizes
        .map((p) => placeCard({ place: p.place, label: p.place_to ? `${p.place}–${p.place_to}` : null, prize: p.prize }))
        .join('')}</div>`;
  }

  // По умолчанию — только места с призом. Если призов не указано, показываем топ-3.
  let shown = placements.filter((p) => prizeFor(p.place));
  if (!shown.length) shown = placements.slice(0, 3);

  const rows = placements
    .map((p) => {
      const medal = p.place === 1 ? 'gold' : p.place === 2 ? 'silver' : p.place === 3 ? 'bronze' : '';
      const prize = prizeFor(p.place);
      return `<tr class="${medal}"><td class="n">${esc(p.label || p.place)}</td><td>${esc(p.team)}</td><td class="pz">${prize ? esc(prize) : ''}</td></tr>`;
    })
    .join('');

  return `
    <h2>Призовые места</h2>
    <div class="places">${shown.map((p) => placeCard({ ...p, prize: prizeFor(p.place), roster })).join('')}</div>
    <details class="all">
      <summary>Все места (${placements.length} ${placements.length === 1 ? 'команда' : 'команд'})</summary>
      <table>
        <thead><tr><th>Место</th><th>Команда</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </details>`;
}

function teamsSection(info, roster) {
  const teams = roster?.teams || [];
  if (!teams.length) return '';
  const cap = Number(info.pts_cap) || 0;
  const cards = teams
    .map((t) => {
      const players = t.players || [];
      const total = players.reduce((s, p) => s + (Number(p.pts) || 0), 0);
      const over = cap && total > cap;
      const pct = cap ? Math.min(100, Math.round((total / cap) * 100)) : 0;
      return `
        <article class="team ${over ? 'over' : ''}">
          <header><h3>${esc(t.name)}</h3>${t.tag ? `<span class="tag">${esc(t.tag)}</span>` : ''}</header>
          ${
            cap
              ? `<div class="pts"><div class="bar2"><i style="width:${pct}%"></i></div><span>${num(total)} / ${num(cap)} ПТС${over ? ' · выше лимита' : ''}</span></div>`
              : total
                ? `<div class="pts"><span>${num(total)} ПТС</span></div>`
                : ''
          }
          <ul class="players">${players
            .map(
              (p) =>
                `<li><span class="role">${esc(p.role || '')}</span><span class="nick">${esc(p.nick)}</span><span class="ppts">${p.pts != null ? num(p.pts) : ''}</span></li>`,
            )
            .join('')}</ul>
        </article>`;
    })
    .join('');
  return `<h2>Участники <span class="muted">· ${teams.length}</span></h2><div class="teams">${cards}</div>`;
}

function matchesSection(result) {
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
          const s1 = Number(m.score1), s2 = Number(m.score2);
          const known = !isNaN(s1) && !isNaN(s2) && m.score1 != null && m.score2 != null;
          const c1 = known ? (s1 > s2 ? 'win' : s1 < s2 ? 'lose' : '') : '';
          const c2 = known ? (s2 > s1 ? 'win' : s2 < s1 ? 'lose' : '') : '';
          return `<div class="match"><span class="${c1}">${esc(m.team1)}</span><span class="score">${known ? `${s1} : ${s2}` : 'vs'}</span><span class="t2 ${c2}">${esc(m.team2)}</span></div>`;
        })
        .join('');
      return `<div class="round"><h3>${esc(round)}</h3>${rows}</div>`;
    })
    .join('');
  return `<h2>Матчи</h2>${html}`;
}

async function tournamentView(slug) {
  const base = `tournaments/${encodeURIComponent(slug)}/`;
  const info = await getJson(`${base}information.json`, true);
  if (!info) return notFound();
  const [roster, result] = await Promise.all([getJson(`${base}roster.json`, true), getJson(`${base}result.json`, true)]);

  document.title = `${info.name} — Anypedia`;

  const links = info.links || {};
  const linkBtns = [
    [links.challonge, 'Сетка на Challonge', ''],
    [links.rules, 'Регламент', 'ghost'],
    [links.stream, 'Трансляция', 'ghost'],
  ]
    .filter(([u]) => safeUrl(u))
    .map(([u, t, c]) => `<a class="btn ${c}" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`)
    .join('');

  const fact = (label, value) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '');

  return `
    <a class="back" href="#/">← Все турниры</a>
    <section class="hero">
      ${badge(info.status)}
      <h1>${esc(info.name)}</h1>
      ${info.description ? `<p>${esc(info.description)}</p>` : ''}
      <dl class="facts">
        ${fact('Даты', dateRange(info.date_start, info.date_end))}
        ${fact('Организатор', esc(info.organizer))}
        ${fact('Формат', esc(info.format))}
        ${fact('Призовой фонд', esc(info.prize_pool))}
        ${fact('Лимит ПТС', info.pts_cap ? num(info.pts_cap) : '')}
        ${fact('Команд', roster?.teams?.length || '')}
      </dl>
      ${linkBtns ? `<div class="links">${linkBtns}</div>` : ''}
    </section>
    ${placesSection(info, roster, result)}
    ${teamsSection(info, roster)}
    ${matchesSection(result)}`;
}

/* ---------- Служебное ---------- */

const notFound = () => `
  <div class="empty"><h2 style="margin-top:0">Страница не найдена</h2><p><a href="#/" class="btn">К списку турниров</a></p></div>`;

const errorView = (e) => `
  <div class="empty">
    <h2 style="margin-top:0">Не удалось загрузить данные</h2>
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
}

window.addEventListener('hashchange', route);
route();
