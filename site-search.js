(function () {
  const searchInput = document.getElementById('search');
  const searchDropdown = document.getElementById('searchDropdown');
  const searchWrap = document.getElementById('searchWrap');

  if (!searchInput || !searchDropdown || !searchWrap) return;

  const allTournaments = typeof tournaments !== 'undefined' && Array.isArray(tournaments) ? tournaments : [];
  const allTeams = typeof teams !== 'undefined' && Array.isArray(teams) ? teams : [];
  let activeIdx = -1;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function toLocalDate(value) {
    const [y, m, d] = String(value || '').split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function tournamentStatus(tournament) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = toLocalDate(tournament.start);
    const end = toLocalDate(tournament.end);
    if (today < start) return 'upcoming';
    if (today > end) return 'finished';
    return 'live';
  }

  function slugifyTeam(value) {
    return String(value || '').normalize('NFKC').trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}_-]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'team';
  }

  function teamId(team) {
    return team.id || slugifyTeam(team.name);
  }

  function teamAliases(team) {
    const aliases = team.aliases || [];
    if (Array.isArray(aliases)) return aliases;
    return String(aliases).split(',').map(name => name.trim()).filter(Boolean);
  }

  function teamMatchesQuery(team, q) {
    return [team.name, ...teamAliases(team)]
      .filter(Boolean)
      .some(name => name.toLowerCase().includes(q));
  }

  function getBasePath() {
    const path = location.pathname;
    if (path.endsWith('/index.html') || path.endsWith('/team.html') || path.endsWith('/tournament.html')) {
      return path.slice(0, path.lastIndexOf('/') + 1) || '/';
    }

    const clean = path.replace(/\/+$/, '');
    const teamIndex = clean.lastIndexOf('/team/');
    if (teamIndex >= 0) return clean.slice(0, teamIndex + 1) || '/';

    const lastSegment = decodeURIComponent(clean.split('/').pop() || '');
    if (allTournaments.some(t => t.id === lastSegment)) {
      return clean.slice(0, clean.lastIndexOf('/') + 1) || '/';
    }

    return path.endsWith('/') ? path : (path.slice(0, path.lastIndexOf('/') + 1) || '/');
  }

  const siteBase = getBasePath();

  function tournamentLink(id) {
    return `${siteBase}${encodeURIComponent(id)}`;
  }

  function teamLink(team) {
    return `${siteBase}team.html?id=${encodeURIComponent(teamId(team))}`;
  }

  function assetUrl(value) {
    const url = String(value || 'dota2.png');
    if (/^(https?:|data:|\/)/i.test(url)) return url;
    return `${siteBase}${url}`;
  }

  function closeDropdown() {
    searchDropdown.classList.remove('visible');
    activeIdx = -1;
  }

  function renderDropdown(q) {
    if (!q) {
      closeDropdown();
      return;
    }

    const matchedTournaments = allTournaments
      .filter(t => String(t.title || '').toLowerCase().includes(q))
      .slice(0, 6);

    const matchedTeams = allTeams
      .filter(team => teamMatchesQuery(team, q))
      .slice(0, 5);

    if (!matchedTournaments.length && !matchedTeams.length) {
      searchDropdown.innerHTML = '<div class="sd-empty">Ничего не найдено</div>';
      searchDropdown.classList.add('visible');
      return;
    }

    let html = '';

    if (matchedTournaments.length) {
      html += '<div class="sd-group-label">🏆 Турниры</div>';
      matchedTournaments.forEach(t => {
        const statusBadge = {
          upcoming: 'Будущий',
          live: 'Текущий',
          finished: 'Завершён'
        }[tournamentStatus(t)];
        html += `
          <a class="sd-item" href="${tournamentLink(t.id)}">
            <div class="sd-icon">🏆</div>
            <div class="sd-info">
              <div class="sd-title">${escapeHtml(t.title)}</div>
              <div class="sd-meta">${escapeHtml(t.prize || '—')} · ${escapeHtml(t.location || '—')}</div>
            </div>
            <span class="sd-badge">${statusBadge}</span>
          </a>`;
      });
    }

    if (matchedTeams.length) {
      html += '<div class="sd-group-label">👥 Команды</div>';
      matchedTeams.forEach(team => {
        html += `
          <a class="sd-item" href="${teamLink(team)}">
            <img class="sd-logo" src="${escapeHtml(assetUrl(team.logo))}"
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

    searchDropdown.innerHTML = html;
    searchDropdown.classList.add('visible');
    activeIdx = -1;
  }

  searchInput.addEventListener('input', event => {
    renderDropdown(event.target.value.toLowerCase().trim());
  });

  searchInput.addEventListener('keydown', event => {
    const items = searchDropdown.querySelectorAll('.sd-item');
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
    } else if (event.key === 'Enter' && activeIdx >= 0) {
      event.preventDefault();
      items[activeIdx].click();
      return;
    } else if (event.key === 'Escape') {
      closeDropdown();
      return;
    } else {
      return;
    }

    items.forEach((item, idx) => item.classList.toggle('active', idx === activeIdx));
  });

  document.addEventListener('click', event => {
    if (!searchWrap.contains(event.target)) closeDropdown();
  });

  searchInput.addEventListener('focus', () => {
    renderDropdown(searchInput.value.toLowerCase().trim());
  });
})();
