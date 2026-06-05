/* ============================================================
   search.js — Глобальный поиск по турнирам и командам
   Подключается на всех страницах после data.js и teams.js
   ============================================================ */
(function () {

  /* ── Нормализация строки для поиска ── */
  function norm(v) {
    return String(v || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /* ── ID команды для ссылки ── */
  function teamSlug(team) {
    return team.id || String(team.name || '').normalize('NFKC').trim()
      .replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '')
      .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'team';
  }

  /* ── Все имена команды: актуальное + алиасы ── */
  function teamNames(team) {
    const a = team.aliases || [];
    const aliases = Array.isArray(a) ? a : String(a).split(',').map(s => s.trim()).filter(Boolean);
    return [team.name, ...aliases].filter(Boolean).map(norm);
  }

  /* ── Корень сайта — работает с любого URL ── */
  function siteRoot() {
    const p = location.pathname;
    if (/\/[^/]+\.html$/.test(p)) return location.origin + p.slice(0, p.lastIndexOf('/') + 1);
    const parts = p.replace(/\/+$/, '').split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'team') return location.origin + '/';
    if (parts.length === 1) return location.origin + '/';
    return location.origin + '/' + parts.slice(0, -1).join('/') + '/';
  }

  /* ── Статус турнира ── */
  function tournamentStatus(t) {
    const today = new Date(); today.setHours(0,0,0,0);
    const [sy,sm,sd] = t.start.split('-').map(Number);
    const [ey,em,ed] = t.end.split('-').map(Number);
    const s = new Date(sy, sm-1, sd);
    const e = new Date(ey, em-1, ed);
    if (today < s) return 'upcoming';
    if (today > e) return 'finished';
    return 'live';
  }

  const СТАТУС = { upcoming: 'Будущий', live: 'Текущий', finished: 'Завершён' };

  /* ──────────────────────────────────────────── */

  /* Ждём пока DOM полностью готов */
  function init() {
    const input    = document.getElementById('search');
    const dropdown = document.getElementById('searchDropdown');
    const wrap     = document.getElementById('searchWrap');
    if (!input || !dropdown || !wrap) return;

    /* Данные — читаем один раз */
    const allTournaments = typeof tournaments !== 'undefined' ? tournaments : [];
    const allTeams       = typeof teams       !== 'undefined' ? teams       : [];

    let activeIdx = -1;

    function close() {
      dropdown.classList.remove('visible');
      activeIdx = -1;
    }

    function render(q) {
      if (!q) { close(); return; }

      const base = siteRoot();

      const matchT = allTournaments.filter(t => norm(t.title).includes(q)).slice(0, 6);
      const matchK = allTeams.filter(t => teamNames(t).some(n => n.includes(q))).slice(0, 5);

      if (!matchT.length && !matchK.length) {
        dropdown.innerHTML = `<div class="sd-empty">Ничего не найдено</div>`;
        dropdown.classList.add('visible');
        return;
      }

      let html = '';

      if (matchT.length) {
        html += `<div class="sd-group-label">🏆 Турниры</div>`;
        for (const t of matchT) {
          const link = `${base}tournament.html?id=${encodeURIComponent(t.id)}`;
          html += `
            <a class="sd-item" href="${link}">
              <div class="sd-icon">🏆</div>
              <div class="sd-info">
                <div class="sd-title">${t.title}</div>
                <div class="sd-meta">${t.prize || '—'} · ${t.location || '—'}</div>
              </div>
              <span class="sd-badge">${СТАТУС[tournamentStatus(t)] || ''}</span>
            </a>`;
        }
      }

      if (matchK.length) {
        html += `<div class="sd-group-label">👥 Команды</div>`;
        for (const team of matchK) {
          const link = `${base}team.html?id=${encodeURIComponent(teamSlug(team))}`;
          html += `
            <a class="sd-item" href="${link}">
              <img class="sd-logo" src="${base}${team.logo || 'dota2.png'}"
                   alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="sd-icon" style="display:none">👥</div>
              <div class="sd-info">
                <div class="sd-title">${team.name}</div>
                <div class="sd-meta">${team.region || '—'}${team.prize ? ' · ' + team.prize : ''}</div>
              </div>
              <span class="sd-badge">Команда</span>
            </a>`;
        }
      }

      dropdown.innerHTML = html;
      dropdown.classList.add('visible');
      activeIdx = -1;
    }

    /* ── Обработчики ── */
    input.addEventListener('input', e => render(norm(e.target.value)));

    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.sd-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown')  { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
      else if (e.key === 'Escape') { close(); input.blur(); return; }
      else return;
      items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      items[activeIdx]?.scrollIntoView({ block: 'nearest' });
    });

    input.addEventListener('focus', () => { if (input.value.trim()) render(norm(input.value)); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
  }

  /* Запускаем сразу если DOM готов, иначе ждём */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
