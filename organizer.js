/* ============================================================
   organizer.js — Логика страницы организатора
   ============================================================ */

/* ---------- THEME ---------- */
const html      = document.documentElement;
const themeBtn  = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');

const MOON_SVG = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const SUN_SVG  = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
  localStorage.setItem('ap-theme', theme);
}
applyTheme(localStorage.getItem('ap-theme') || 'dark');
themeBtn.addEventListener('click', () =>
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ---------- BACK TO TOP ---------- */
const toTopBtn = document.getElementById('toTopBtn');
window.addEventListener('scroll', () =>
  toTopBtn.classList.toggle('visible', window.scrollY > 300));
toTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- HELPERS ---------- */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function toLocalDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const today = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
function getStatus(t) {
  const s = toLocalDate(t.start), e = toLocalDate(t.end);
  if (today < s) return 'upcoming';
  if (today > e) return 'finished';
  return 'live';
}
const statusLabel = { upcoming: 'Будущий', live: 'Текущий', finished: 'Завершён' };
const statusClass = { upcoming: 'upcoming-tag', live: 'live-tag', finished: 'finished-tag' };

/* ---------- URL HELPERS ---------- */
function getIdFromUrl() {
  const paramsId = new URLSearchParams(window.location.search).get('id');
  if (paramsId) return paramsId;
  const parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const idx = parts.indexOf('organizer');
  if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  const last = decodeURIComponent(parts.pop() || '');
  return last && last !== 'organizer.html' ? last : '';
}

function getBasePath(id) {
  const path = location.pathname;
  if (path.endsWith('/organizer.html')) return path.slice(0, path.lastIndexOf('/') + 1);
  const clean = path.replace(/\/+$/, '');
  const suffix = `/organizer/${encodeURIComponent(id)}`;
  if (clean.endsWith(suffix)) return clean.slice(0, -suffix.length + 1);
  const idx = clean.lastIndexOf('/organizer/');
  if (idx >= 0) return clean.slice(0, idx + 1);
  return '/';
}

function siteRoot() {
  const p = location.pathname;
  if (/\/[^/]+\.html$/.test(p)) return location.origin + p.slice(0, p.lastIndexOf('/') + 1);
  const parts = p.replace(/\/+$/, '').split('/').filter(Boolean);
  if (!parts.length || parts[0] === 'organizer' || parts[0] === 'team') return location.origin + '/';
  if (parts.length === 1) return location.origin + '/';
  return location.origin + '/' + parts.slice(0, -1).join('/') + '/';
}

/* ============================================================
   ГЛАВНАЯ ЛОГИКА
   ============================================================ */
const requestedId = getIdFromUrl();
const org = (typeof organizers !== 'undefined' ? organizers : []).find(o =>
  getOrganizerId(o) === requestedId || slugifyOrganizer(o.name) === requestedId
);

if (!org) {
  document.body.innerHTML = `
    <div style="height:100vh;display:flex;align-items:center;justify-content:center;
                background:var(--bg);font-family:'Inter',sans-serif;text-align:center;color:var(--text)">
      <div>
        <h1 style="font-size:22px;margin-bottom:10px">Организатор не найден</h1>
        <p style="color:var(--text-muted);margin-bottom:20px">Проверьте ссылку или вернитесь на главную</p>
        <a href="/" style="padding:10px 18px;background:var(--bg3);border:1px solid var(--border);
           border-radius:10px;display:inline-block;color:var(--accent)">← Назад</a>
      </div>
    </div>`;
  initSearch();
  throw new Error('Организатор не найден');
}

/* Чистим URL → /organizer/<id> */
const currentId = getOrganizerId(org);
if (!location.pathname.includes('/organizer/') || new URLSearchParams(window.location.search).has('id')) {
  const base = getBasePath(currentId);
  history.replaceState(null, '', `${base}organizer/${encodeURIComponent(currentId)}`);
}

document.title = `${org.name} · Anypedia`;
document.getElementById('pageBody').style.display = 'grid';

const basePath = getBasePath(currentId);

const homeLink = document.getElementById('homeLink');
if (homeLink) homeLink.href = `${basePath || '/'}index.html`;

/* ---------- INFOBOX ---------- */
const links = org.links || {};
document.getElementById('orgInfobox').innerHTML = `
  <img class="team-logo"
       src="${basePath}${escapeHtml(org.logo || 'dota2.png')}"
       alt="${escapeHtml(org.name)}"
       onerror="this.style.display='none'">
  <h1>${escapeHtml(org.name)}</h1>
  <div class="info-row">
    <span class="info-label">Регион</span>
    <span class="info-val">${escapeHtml(org.region || '—')}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Призовые</span>
    <span class="info-val" style="color:var(--accent);font-weight:700">${escapeHtml((typeof calcOrganizerPrize === 'function' ? calcOrganizerPrize(org) : org.prize) || '—')}</span>
  </div>
  <a class="btn btn-tg ${org.telegramLink ? '' : 'is-disabled'}"
     href="${escapeHtml(org.telegramLink || '#')}" target="_blank" rel="noopener">
     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.173l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.386z"/></svg>
    Telegram
  </a>
  <a class="btn btn-captain ${org.discordLink ? '' : 'is-disabled'}"
     href="${escapeHtml(org.discordLink || '#')}" target="_blank" rel="noopener">
     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963a.074.074 0 0 0-.041-.104 13.2 13.2 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/></svg>
    Discord
  </a>
  ${links.website ? `
  <a class="btn btn-captain" href="${escapeHtml(links.website)}" target="_blank" rel="noopener">
    🌐 Сайт
  </a>` : ''}
`;

/* ---------- DESCRIPTION ---------- */
document.getElementById('summaryBlock').innerHTML = `
  <h1 class="page-title">${escapeHtml(org.name)}</h1>
  <p class="desc-text">${escapeHtml(org.description || 'Описание организатора пока не добавлено.')}</p>
`;

/* ---------- ТУРНИРЫ ОРГАНИЗАТОРА ---------- */
function buildOrgTournamentsTable() {
  const list = (typeof tournaments !== 'undefined' ? tournaments : [])
    .filter(t => {
      const matched = findAllOrganizersByName(t.organizer);
      return matched.some(o => getOrganizerId(o) === currentId);
    });

  if (!list.length) return `<div class="empty-state">Турниры не найдены</div>`;

  list.sort((a, b) => toLocalDate(b.start) - toLocalDate(a.start));

  const rows = list.map(t => {
    const st = getStatus(t);
    const dateText = t.start === t.end ? formatDate(t.start) : `${formatDate(t.start)} — ${formatDate(t.end)}`;
    const link = `${siteRoot()}${encodeURIComponent(t.id)}`;
    return `
      <tr class="searchable-row" onclick="location.href='${link}'" style="cursor:pointer">
        <td data-label="Дата">${dateText}</td>
        <td data-label="Турнир"><a href="${link}" style="font-weight:600">${escapeHtml(t.title)}</a></td>
        <td data-label="Статус"><span class="tag ${statusClass[st]}">${statusLabel[st]}</span></td>
        <td data-label="Приз" style="font-weight:600">${escapeHtml(t.prize || '—')}</td>
        <td data-label="Команд">${t.teams ?? '—'}</td>
      </tr>`;
  }).join('');

  return `
    <table class="data-table">
      <thead><tr><th>Дата</th><th>Турнир</th><th>Статус</th><th>Приз</th><th>Команд</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

document.getElementById('organizerTournaments').innerHTML = buildOrgTournamentsTable();

/* ============================================================
   ПОИСК — турниры + команды + организаторы
   ============================================================ */
function initSearch() {
  const input    = document.getElementById('search');
  const dropdown = document.getElementById('searchDropdown');
  const wrap     = document.getElementById('searchWrap');
  if (!input || !dropdown || !wrap) return;

  const allTournaments = typeof tournaments !== 'undefined' ? tournaments : [];
  const allTeams       = typeof teams !== 'undefined' ? teams : [];
  const allOrganizers  = typeof organizers !== 'undefined' ? organizers : [];

  let activeIdx = -1;

  function close() {
    dropdown.classList.remove('visible');
    activeIdx = -1;
  }

  function teamSlug(team) {
    return team.id || String(team.name || '').normalize('NFKC').trim()
      .replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '')
      .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'team';
  }
  function teamNames(team) {
    const a = team.aliases || [];
    const aliases = Array.isArray(a) ? a : String(a).split(',').map(s => s.trim()).filter(Boolean);
    return [team.name, ...aliases].filter(Boolean).map(normOrgStr);
  }

  function render(q) {
    if (!q) { close(); return; }
    const base = siteRoot();

    const matchT = allTournaments.filter(t => normOrgStr(t.title).includes(q)).slice(0, 6);
    const matchK = allTeams.filter(team => teamNames(team).some(n => n.includes(q))).slice(0, 5);
    const matchO = allOrganizers.filter(o => organizerAllNames(o).some(n => n.includes(q))).slice(0, 5);

    if (!matchT.length && !matchK.length && !matchO.length) {
      dropdown.innerHTML = `<div class="sd-empty">Ничего не найдено</div>`;
      dropdown.classList.add('visible');
      return;
    }

    let out = '';

    if (matchT.length) {
      out += `<div class="sd-group-label">🏆 Турниры</div>`;
      matchT.forEach(t => {
        const link = `${base}${encodeURIComponent(t.id)}`;
        out += `
          <a class="sd-item" href="${link}">
            <div class="sd-icon">🏆</div>
            <div class="sd-info">
              <div class="sd-title">${escapeHtml(t.title)}</div>
              <div class="sd-meta">${escapeHtml(t.prize || '—')} · ${escapeHtml(t.location || '—')}</div>
            </div>
            <span class="sd-badge">${statusLabel[getStatus(t)] || ''}</span>
          </a>`;
      });
    }

    if (matchK.length) {
      out += `<div class="sd-group-label">👥 Команды</div>`;
      matchK.forEach(team => {
        const tid = teamSlug(team);
        const link = `${base}team/${encodeURIComponent(tid)}`;
        out += `
          <a class="sd-item" href="${link}">
            <img class="sd-logo" src="${base}${team.logo || 'dota2.png'}"
                 alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="sd-icon" style="display:none">👥</div>
            <div class="sd-info">
              <div class="sd-title">${escapeHtml(team.name)}</div>
              <div class="sd-meta">${escapeHtml(team.region || '—')}${team.prize ? ' · ' + escapeHtml(team.prize) : ''}</div>
            </div>
            <span class="sd-badge">Команда</span>
          </a>`;
      });
    }

    if (matchO.length) {
      out += `<div class="sd-group-label">🛡️ Организаторы</div>`;
      matchO.forEach(o => {
        const oid = getOrganizerId(o);
        const link = `${base}organizer/${encodeURIComponent(oid)}`;
        out += `
          <a class="sd-item" href="${link}">
            <img class="sd-logo" src="${base}${o.logo || 'dota2.png'}"
                 alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="sd-icon" style="display:none">🛡️</div>
            <div class="sd-info">
              <div class="sd-title">${escapeHtml(o.name)}</div>
              <div class="sd-meta">${escapeHtml(o.region || '—')}</div>
            </div>
            <span class="sd-badge">Организатор</span>
          </a>`;
      });
    }

    dropdown.innerHTML = out;
    dropdown.classList.add('visible');
    activeIdx = -1;
  }

  input.addEventListener('input', e => render(normOrgStr(e.target.value)));

  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.sd-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else if (e.key === 'Escape') { close(); input.blur(); return; }
    else return;
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  });

  input.addEventListener('focus', () => { if (input.value.trim()) render(normOrgStr(input.value)); });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
}

initSearch();
