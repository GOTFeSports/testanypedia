/* ============================================================
   team.js — Логика страницы команды
   ============================================================ */

/* ============================================================
   ТЕМА
   ============================================================ */
const html      = document.documentElement;
const themeBtn  = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');

const ИКОНКА_ЛУНЫ   = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const ИКОНКА_СОЛНЦА = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

function применитьТему(тема) {
  html.setAttribute('data-theme', тема);
  themeIcon.innerHTML = тема === 'dark' ? ИКОНКА_ЛУНЫ : ИКОНКА_СОЛНЦА;
  localStorage.setItem('ap-theme', тема);
}
применитьТему(localStorage.getItem('ap-theme') || 'dark');
themeBtn.addEventListener('click', () =>
  применитьТему(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

/* ============================================================
   КНОПКА «НАВЕРХ»
   ============================================================ */
const toTopBtn = document.getElementById('toTopBtn');
window.addEventListener('scroll', () =>
  toTopBtn.classList.toggle('visible', window.scrollY > 300));
toTopBtn.addEventListener('click', () =>
  window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ============================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ============================================================ */
function экранировать(значение) {
  return String(значение ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function нормализовать(значение) {
  return String(значение || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function транслитерироватьСлаг(значение) {
  return String(значение || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'team';
}

function получитьIdКоманды(команда) {
  return команда.id || транслитерироватьСлаг(команда.name);
}

function всеИменаКоманды(команда) {
  const псевдонимы = команда.aliases || [];
  const список = Array.isArray(псевдонимы)
    ? псевдонимы
    : String(псевдонимы).split(',').map(s => s.trim()).filter(Boolean);
  return [команда.name, ...список].filter(Boolean).map(нормализовать);
}

function найтиКомандуПоИмени(имя) {
  if (!имя) return null;
  const ключ = нормализовать(имя);
  return (typeof teams !== 'undefined' ? teams : [])
    .find(к => всеИменаКоманды(к).includes(ключ)) || null;
}

function всеТурниры() {
  return typeof tournaments !== 'undefined' && Array.isArray(tournaments) ? tournaments : [];
}

function всеКоманды() {
  return typeof teams !== 'undefined' && Array.isArray(teams) ? teams : [];
}

/* ============================================================
   URL-ХЕЛПЕРЫ
   ============================================================ */
function получитьIdИзUrl() {
  const paramsId = new URLSearchParams(window.location.search).get('id');
  if (paramsId) return paramsId;
  const части = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const индексTeam = части.indexOf('team');
  if (индексTeam >= 0 && части[индексTeam + 1]) {
    return decodeURIComponent(части[индексTeam + 1]);
  }
  const последний = decodeURIComponent(части.pop() || '');
  return последний && последний !== 'team.html' ? последний : '';
}

function получитьБазовыйПуть(id) {
  const путь = location.pathname;
  if (путь.endsWith('/team.html')) return путь.slice(0, путь.lastIndexOf('/') + 1);
  const чистый = путь.replace(/\/+$/, '');
  const суффикс = `/team/${encodeURIComponent(id)}`;
  if (чистый.endsWith(суффикс)) return чистый.slice(0, -суффикс.length + 1);
  const индексTeam = чистый.lastIndexOf('/team/');
  if (индексTeam >= 0) return чистый.slice(0, индексTeam + 1);
  return '/';
}

function ссылкаНаТурнир(idТурнира) {
  return `${получитьБазовыйПуть(получитьIdИзUrl())}tournament.html?id=${encodeURIComponent(idТурнира)}`;
}

/* Вычисляем корень сайта — для поиска и ссылок */
function корньСайта() {
  const p = location.pathname;
  if (/\/[^/]+\.html$/.test(p)) return location.origin + p.slice(0, p.lastIndexOf('/') + 1);
  const части = p.replace(/\/+$/, '').split('/').filter(Boolean);
  if (части[0] === 'team') return location.origin + '/';
  if (части.length <= 1)   return location.origin + '/';
  return location.origin + '/' + части.slice(0, -1).join('/') + '/';
}

/* ============================================================
   ПОИСК ТУРНИРА ПО НАЗВАНИЮ
   ============================================================ */
function найтиТурнирПоНазванию(название) {
  const ключ = нормализовать(название);
  if (!ключ) return null;
  return всеТурниры().find(t => нормализовать(t.title) === ключ) || null;
}

/* ============================================================
   ФОРМАТИРОВАНИЕ ДАТ
   ============================================================ */
function форматДата(значение) {
  if (!значение) return '—';
  const части = String(значение).split('-').map(Number);
  if (части.length !== 3 || части.some(Number.isNaN)) return экранировать(значение);
  return new Date(части[0], части[1] - 1, части[2]).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function форматДатаКраткая(значение) {
  if (!значение) return '—';
  const части = String(значение).split('-').map(Number);
  if (части.length !== 3 || части.some(Number.isNaN)) return экранировать(значение);
  return new Date(части[0], части[1] - 1, части[2]).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

/* ============================================================
   ПОСТРОЕНИЕ СПИСКА ТУРНИРОВ КОМАНДЫ
   ============================================================ */
function построитьСтрокиТурниров(команда) {
  const строки = (команда.tournaments || []).map(запись => {
    const найденный = найтиТурнирПоНазванию(запись.title);
    return {
      дата:       запись.date || (найденный ? найденный.start : ''),
      датаТекст:  запись.date
        ? форматДатаКраткая(запись.date)
        : (найденный ? форматДатаКраткая(найденный.start) : '—'),
      место:      запись.place || '—',
      название:   запись.title || '—',
      idТурнира:  найденный ? найденный.id : null,
      призовые:   запись.prize || '—',
      лимит:      запись.limit || (найденный ? (найденный.limit || '—') : '—'),
    };
  });

  строки.sort((a, b) => String(b.дата).localeCompare(String(a.дата)));
  return строки;
}

/* ============================================================
   РЕНДЕР: СОСТАВ
   ============================================================ */
function рендерСостав(игроки, бывшие = false) {
  if (!игроки.length) return `<div class="empty-state">Нет данных</div>`;

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Никнейм</th>
          <th>Позиция</th>
          <th>Присоединился</th>
          ${бывшие ? '<th>Покинул</th><th>Новая команда</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${игроки.map(игрок => {
          /* Новая команда — кликабельная если есть страница */
          let новаяКомандаHTML = '—';
          if (бывшие && игрок.newTeam && игрок.newTeam !== '—') {
            const найденная = найтиКомандуПоИмени(игрок.newTeam);
            if (найденная) {
              const id = получитьIdКоманды(найденная);
              новаяКомандаHTML = `<a href="${корньСайта()}team.html?id=${encodeURIComponent(id)}"
                style="color:var(--accent);font-weight:600">${экранировать(игрок.newTeam)}</a>`;
            } else {
              новаяКомандаHTML = экранировать(игрок.newTeam);
            }
          }

          return `
            <tr class="searchable-row">
              <td data-label="Никнейм">${экранировать(игрок.nick || '—')}</td>
              <td data-label="Позиция"><span class="pos-pill">${экранировать(игрок.pos ?? '—')}</span></td>
              <td data-label="Присоединился">${форматДата(игрок.joined)}</td>
              ${бывшие ? `
                <td data-label="Покинул">${форматДата(игрок.left)}</td>
                <td data-label="Новая команда">${новаяКомандаHTML}</td>
              ` : ''}
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/* ============================================================
   РЕНДЕР: ТУРНИРЫ КОМАНДЫ
   ============================================================ */
function рендерТурниры(строки) {
  if (!строки.length) return `<div class="empty-state">Турниры не указаны</div>`;

  function классМедали(место) {
    const м = String(место).trim();
    if (м === '1') return 'place-gold';
    if (м === '2') return 'place-silver';
    if (м === '3') return 'place-bronze';
    return '';
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Дата</th>
          <th>Место</th>
          <th>Турнир</th>
          <th>Призовые</th>
          <th>Ограничения</th>
        </tr>
      </thead>
      <tbody>
        ${строки.map(строка => {
          const ссылкаТурнир = строка.idТурнира
            ? `<a href="${ссылкаНаТурнир(строка.idТурнира)}">${экранировать(строка.название)}</a>`
            : экранировать(строка.название || '—');
          const класс = классМедали(строка.место);
          return `
            <tr class="searchable-row ${класс}">
              <td data-label="Дата">${экранировать(строка.датаТекст)}</td>
              <td data-label="Место" class="place-cell">${экранировать(String(строка.место || '—'))}</td>
              <td data-label="Турнир">${ссылкаТурнир}</td>
              <td data-label="Призовые">${экранировать(строка.призовые)}</td>
              <td data-label="Ограничения">${экранировать(строка.лимит || '—')}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/* ============================================================
   ПОИСК — дропдаун турниров и команд
   ============================================================ */
function инициализироватьПоиск() {
  const поле     = document.getElementById('search');
  const дропдаун = document.getElementById('searchDropdown');
  const обёртка  = document.getElementById('searchWrap');
  if (!поле || !дропдаун || !обёртка) return;

  const всеТурнирыСписок = typeof tournaments !== 'undefined' ? tournaments : [];
  const всеКоманды  = typeof teams       !== 'undefined' ? teams       : [];
  const всеОрганизаторы = typeof organizers !== 'undefined' ? organizers : [];

  const статусТекст = { upcoming: 'Будущий', live: 'Текущий', finished: 'Завершён' };
  let активныйИндекс = -1;

  function статусТурнира(t) {
    const сегодня = new Date(); сегодня.setHours(0,0,0,0);
    const [гн,мн,дн] = t.start.split('-').map(Number);
    const [гк,мк,дк] = t.end.split('-').map(Number);
    const начало = new Date(гн, мн-1, дн);
    const конец  = new Date(гк, мк-1, дк);
    if (сегодня < начало) return 'upcoming';
    if (сегодня > конец)  return 'finished';
    return 'live';
  }

  function командаПодходит(команда, запрос) {
    return всеИменаКоманды(команда).some(н => н.includes(запрос));
  }

  function организаторПодходит(организатор, запрос) {
    const псевдонимы = организатор.aliases || [];
    const список = Array.isArray(псевдонимы)
      ? псевдонимы
      : String(псевдонимы).split(',').map(s => s.trim()).filter(Boolean);
    return [организатор.name, ...список].filter(Boolean)
      .map(нормализовать).some(н => н.includes(запрос));
  }

  function закрыть() {
    дропдаун.classList.remove('visible');
    активныйИндекс = -1;
  }

  function показатьДропдаун(запрос) {
    if (!запрос) { закрыть(); return; }

    const база = корньСайта();

    const турниры = всеТурнирыСписок
      .filter(t => t.title.toLowerCase().includes(запрос))
      .slice(0, 6);

    const команды = всеКоманды
      .filter(к => командаПодходит(к, запрос))
      .slice(0, 5);

    const организаторы = всеОрганизаторы
      .filter(о => организаторПодходит(о, запрос))
      .slice(0, 5);

    if (!турниры.length && !команды.length && !организаторы.length) {
      дропдаун.innerHTML = `<div class="sd-empty">Ничего не найдено</div>`;
      дропдаун.classList.add('visible');
      return;
    }

    let html = '';

    if (турниры.length) {
      html += `<div class="sd-group-label">🏆 Турниры</div>`;
      турниры.forEach(t => {
        const значок = статусТекст[статусТурнира(t)] || '';
        const ссылка = `${база}tournament.html?id=${encodeURIComponent(t.id)}`;
        html += `
          <a class="sd-item" href="${ссылка}">
            <div class="sd-icon">🏆</div>
            <div class="sd-info">
              <div class="sd-title">${t.title}</div>
              <div class="sd-meta">${t.prize || '—'} · ${t.location || '—'}</div>
            </div>
            <span class="sd-badge">${значок}</span>
          </a>`;
      });
    }

    if (команды.length) {
      html += `<div class="sd-group-label">👥 Команды</div>`;
      команды.forEach(к => {
        const id = получитьIdКоманды(к);
        const ссылка = `${база}team.html?id=${encodeURIComponent(id)}`;
        html += `
          <a class="sd-item" href="${ссылка}">
            <img class="sd-logo" src="${база}${к.logo || 'dota2.png'}"
                 alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="sd-icon" style="display:none">👥</div>
            <div class="sd-info">
              <div class="sd-title">${к.name}</div>
              <div class="sd-meta">${к.region || '—'}${к.prize ? ' · ' + к.prize : ''}</div>
            </div>
            <span class="sd-badge">Команда</span>
          </a>`;
      });
    }

    if (организаторы.length) {
      html += `<div class="sd-group-label">🛡️ Организаторы</div>`;
      организаторы.forEach(о => {
        const id = о.id || транслитерироватьСлаг(о.name);
        const ссылка = `${база}organizer.html?id=${encodeURIComponent(id)}`;
        html += `
          <a class="sd-item" href="${ссылка}">
            <img class="sd-logo" src="${база}${о.logo || 'dota2.png'}"
                 alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="sd-icon" style="display:none">🛡️</div>
            <div class="sd-info">
              <div class="sd-title">${о.name}</div>
              <div class="sd-meta">${о.region || '—'}</div>
            </div>
            <span class="sd-badge">Организатор</span>
          </a>`;
      });
    }

    дропдаун.innerHTML = html;
    дропдаун.classList.add('visible');
    активныйИндекс = -1;
  }

  поле.addEventListener('input', e => показатьДропдаун(e.target.value.toLowerCase().trim()));

  поле.addEventListener('keydown', e => {
    const элементы = дропдаун.querySelectorAll('.sd-item');
    if (!элементы.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      активныйИндекс = Math.min(активныйИндекс + 1, элементы.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      активныйИндекс = Math.max(активныйИндекс - 1, 0);
    } else if (e.key === 'Enter' && активныйИндекс >= 0) {
      e.preventDefault(); элементы[активныйИндекс].click(); return;
    } else if (e.key === 'Escape') {
      закрыть(); поле.blur(); return;
    }
    элементы.forEach((эл, и) => эл.classList.toggle('active', и === активныйИндекс));
    if (активныйИндекс >= 0) элементы[активныйИндекс].scrollIntoView({ block: 'nearest' });
  });

  поле.addEventListener('focus', () => {
    const запрос = поле.value.toLowerCase().trim();
    if (запрос) показатьДропдаун(запрос);
  });

  document.addEventListener('click', e => {
    if (!обёртка.contains(e.target)) закрыть();
  });
}

/* ============================================================
   ГЛАВНАЯ ЛОГИКА — найти команду и отрисовать
   ============================================================ */
const запрошенныйId = получитьIdИзUrl();
const команда = всеКоманды().find(к =>
  получитьIdКоманды(к) === запрошенныйId || транслитерироватьСлаг(к.name) === запрошенныйId
);

if (!команда) {
  const базаОшибки = '/';
  document.body.innerHTML = `
    <div style="height:100vh;display:flex;align-items:center;justify-content:center;
                background:var(--bg);font-family:'Inter',sans-serif;text-align:center;color:var(--text)">
      <div>
        <h1 style="font-size:22px;margin-bottom:10px">Команда не найдена</h1>
        <p style="color:var(--text-muted);margin-bottom:20px">Проверьте ссылку или вернитесь на главную</p>
        <a href="${базаОшибки}" style="padding:10px 18px;background:var(--bg3);border:1px solid var(--border);
           border-radius:10px;display:inline-block;color:var(--accent)">← Назад</a>
      </div>
    </div>`;
  /* Поиск всё равно инициализируем */
  инициализироватьПоиск();
  throw new Error('Команда не найдена');
}

/* Чистим URL (убираем ?id=...) */
const текущийId = получитьIdКоманды(команда);
if (!location.pathname.includes('/team/') || new URLSearchParams(window.location.search).has('id')) {
  const базаПути = получитьБазовыйПуть(текущийId);
  history.replaceState(null, '', `${базаПути}team/${encodeURIComponent(текущийId)}`);
}

document.title = `${команда.name} · Anypedia`;
document.getElementById('pageBody').style.display = 'grid';

/* Путь для логотипа и ссылок */
const базаПути = получитьБазовыйПуть(текущийId);

/* Ссылка «Anypedia» в шапке → корень */
const ссылкаДомой = document.getElementById('homeLink');
if (ссылкаДомой) ссылкаДомой.href = `${базаПути || '/'}index.html`;

/* Инфобокс */
document.getElementById('teamInfobox').innerHTML = `
  <img class="team-logo"
       src="${базаПути}${экранировать(команда.logo || 'dota2.png')}"
       alt="${экранировать(команда.name)}"
       onerror="this.style.display='none'">
  <h1>${экранировать(команда.name)}</h1>
  <div class="info-row">
    <span class="info-label">Регион</span>
    <span class="info-val">${экранировать(команда.region || '—')}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Призовые</span>
    <span class="info-val" style="color:var(--accent);font-weight:700">
      ${экранировать(команда.prize || '—')}
    </span>
  </div>
  <a class="btn btn-tg ${команда.telegramLink ? '' : 'is-disabled'}"
     href="${экранировать(команда.telegramLink || '#')}" target="_blank" rel="noopener">
     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.173l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.386z"/></svg>
    Telegram
  </a>
  <a class="btn btn-captain ${команда.captainLink ? '' : 'is-disabled'}"
     href="${экранировать(команда.captainLink || '#')}" target="_blank" rel="noopener">
     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-10 1.657-10 5v2h20v-2c0-3.343-6.686-5-10-5z"/>
</svg>
    Связаться с капитаном
  </a>
`;

/* Описание */
document.getElementById('summaryBlock').innerHTML = `
  <h1 class="page-title">${экранировать(команда.name)}</h1>
  <p class="desc-text">${экранировать(команда.description || 'Описание команды пока не добавлено.')}</p>
`;

/* Составы */
document.getElementById('activeRoster').innerHTML  = рендерСостав(команда.activeRoster || команда.roster || []);
document.getElementById('formerPlayers').innerHTML = рендерСостав(команда.formerPlayers || [], true);

/* Турниры */
document.getElementById('teamTournaments').innerHTML = рендерТурниры(построитьСтрокиТурниров(команда));

/* Поиск */
инициализироватьПоиск();
