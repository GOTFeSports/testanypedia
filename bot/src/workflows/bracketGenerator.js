'use strict';

/**
 * bracketGenerator.js — генерация структур bracket.
 *
 * ID матчей — человекочитаемые:
 *   Swiss:   sw-r1-m1, sw-r2-m3, ...
 *   Playoff: po-r1-m1, po-sf1, po-final, ...
 *   Group:   ga-m1, gb-m2, ...  (ga = Group A)
 *   Double:  ub-r1-m1 (upper), lb-r1-m1 (lower), gf (grand final)
 *
 * ВАЖНО — Swiss НЕ использует nextMatchId/nextMatchSlot.
 * Продвижение в плейофф происходит вручную через /swissnext,
 * который после завершения всех раундов Swiss записывает
 * победителей в слоты плейоффа (если он есть в том же bracket).
 * bracket-engine НЕ вызывается для Swiss-матчей.
 */

/* ─── Single Elimination ───────────────────────────────────────── */

/**
 * @param {number} teamCount — 4 | 8 | 16 | 32 | 64
 * @param {string} [prefix='po'] — префикс для id матчей
 */
function generateSingleElimination(teamCount, prefix = 'po') {
  if (![4, 8, 16, 32, 64].includes(teamCount)) {
    throw new Error(`Single Elimination: поддерживается 4/8/16/32/64 команд, получено: ${teamCount}`);
  }

  const rounds          = Math.log2(teamCount);
  const matchIdsByRound = {};
  let   matchIndex      = 1;

  for (let round = 1; round <= rounds; round++) {
    const count = teamCount / Math.pow(2, round);
    matchIdsByRound[round] = [];
    for (let i = 0; i < count; i++) {
      // Читаемые id для последних раундов
      let id;
      if (round === rounds)     id = `${prefix}-final`;
      else if (round === rounds - 1 && count === 2) id = `${prefix}-sf${i + 1}`;
      else if (round === rounds - 2 && count === 4) id = `${prefix}-qf${i + 1}`;
      else id = `${prefix}-r${round}-m${matchIndex}`;
      matchIndex++;
      matchIdsByRound[round].push(id);
    }
  }

  const matches = [];
  for (let round = 1; round <= rounds; round++) {
    const ids     = matchIdsByRound[round];
    const isFinal = round === rounds;
    const nextIds = matchIdsByRound[round + 1] || [];

    ids.forEach((id, idx) => {
      const m = {
        id, round, isFinal,
        teamA: 'TBD', teamB: 'TBD',
        scoreA: 0, scoreB: 0,
        status: 'scheduled', winner: null, scheduledAt: null,
      };
      if (!isFinal) {
        m.nextMatchId   = nextIds[Math.floor(idx / 2)];
        m.nextMatchSlot = idx % 2 === 0 ? 'A' : 'B';
      }
      matches.push(m);
    });
  }

  return { type: 'single', stages: [{ name: 'Плейофф', matches }] };
}

/* ─── Double Elimination ───────────────────────────────────────── */

function makeMatch(id, round, opts = {}) {
  return {
    id, round,
    isFinal: opts.isFinal ?? false,
    teamA:   opts.teamA   ?? 'TBD',
    teamB:   opts.teamB   ?? 'TBD',
    scoreA: 0, scoreB: 0,
    status: 'scheduled', winner: null, scheduledAt: null,
    ...(opts.nextMatchId    ? { nextMatchId:    opts.nextMatchId }    : {}),
    ...(opts.nextMatchSlot  ? { nextMatchSlot:  opts.nextMatchSlot }  : {}),
    ...(opts.loserMatchId   ? { loserMatchId:   opts.loserMatchId }   : {}),
    ...(opts.loserMatchSlot ? { loserMatchSlot: opts.loserMatchSlot } : {}),
  };
}

function generateDoubleElimination(teamCount) {
  if (![4, 8].includes(teamCount)) {
    throw new Error(`Double Elimination: поддерживается 4/8 команд, получено: ${teamCount}`);
  }
  return teamCount === 4 ? _doubleElim4() : _doubleElim8();
}

function _doubleElim4() {
  return {
    type: 'double',
    stages: [
      { name: 'Upper Bracket', matches: [
        makeMatch('ub-r1-m1', 1, { nextMatchId:'ub-final', nextMatchSlot:'A', loserMatchId:'lb-r1-m1', loserMatchSlot:'A' }),
        makeMatch('ub-r1-m2', 1, { nextMatchId:'ub-final', nextMatchSlot:'B', loserMatchId:'lb-r1-m1', loserMatchSlot:'B' }),
        makeMatch('ub-final',  2, { nextMatchId:'gf',       nextMatchSlot:'A', loserMatchId:'lb-final', loserMatchSlot:'B' }),
      ]},
      { name: 'Lower Bracket', matches: [
        makeMatch('lb-r1-m1', 1, { nextMatchId:'lb-final', nextMatchSlot:'A' }),
        makeMatch('lb-final',  2, { nextMatchId:'gf',       nextMatchSlot:'B' }),
      ]},
      { name: 'Grand Final', matches: [
        makeMatch('gf', 1, { isFinal: true }),
      ]},
    ],
  };
}

function _doubleElim8() {
  return {
    type: 'double',
    stages: [
      { name: 'Upper Bracket', matches: [
        makeMatch('ub-r1-m1', 1, { nextMatchId:'ub-r2-m1', nextMatchSlot:'A', loserMatchId:'lb-r1-m1', loserMatchSlot:'A' }),
        makeMatch('ub-r1-m2', 1, { nextMatchId:'ub-r2-m1', nextMatchSlot:'B', loserMatchId:'lb-r1-m1', loserMatchSlot:'B' }),
        makeMatch('ub-r1-m3', 1, { nextMatchId:'ub-r2-m2', nextMatchSlot:'A', loserMatchId:'lb-r1-m2', loserMatchSlot:'A' }),
        makeMatch('ub-r1-m4', 1, { nextMatchId:'ub-r2-m2', nextMatchSlot:'B', loserMatchId:'lb-r1-m2', loserMatchSlot:'B' }),
        makeMatch('ub-r2-m1', 2, { nextMatchId:'ub-final', nextMatchSlot:'A', loserMatchId:'lb-r2-m1', loserMatchSlot:'B' }),
        makeMatch('ub-r2-m2', 2, { nextMatchId:'ub-final', nextMatchSlot:'B', loserMatchId:'lb-r2-m2', loserMatchSlot:'B' }),
        makeMatch('ub-final',  3, { nextMatchId:'gf',       nextMatchSlot:'A', loserMatchId:'lb-final', loserMatchSlot:'B' }),
      ]},
      { name: 'Lower Bracket', matches: [
        makeMatch('lb-r1-m1', 1, { nextMatchId:'lb-r2-m1', nextMatchSlot:'A' }),
        makeMatch('lb-r1-m2', 1, { nextMatchId:'lb-r2-m2', nextMatchSlot:'A' }),
        makeMatch('lb-r2-m1', 2, { nextMatchId:'lb-r3-m1', nextMatchSlot:'A' }),
        makeMatch('lb-r2-m2', 2, { nextMatchId:'lb-r3-m1', nextMatchSlot:'B' }),
        makeMatch('lb-r3-m1', 3, { nextMatchId:'lb-final', nextMatchSlot:'A' }),
        makeMatch('lb-final',  4, { nextMatchId:'gf',       nextMatchSlot:'B' }),
      ]},
      { name: 'Grand Final', matches: [
        makeMatch('gf', 1, { isFinal: true }),
      ]},
    ],
  };
}

/* ─── Group Stage ──────────────────────────────────────────────── */

function generateGroupStage({ groupCount, teamsPerGroup }) {
  if (![2, 4, 8].includes(groupCount)) {
    throw new Error(`Group Stage: поддерживается 2/4/8 групп, получено: ${groupCount}`);
  }
  if (![4, 6, 8].includes(teamsPerGroup)) {
    throw new Error(`Group Stage: поддерживается 4/6/8 команд в группе, получено: ${teamsPerGroup}`);
  }

  const letters = ['a','b','c','d','e','f','g','h'];
  const stages  = [];
  let   mIdx    = 1;

  for (let g = 0; g < groupCount; g++) {
    const letter    = letters[g];
    const Letter    = letter.toUpperCase();
    const teamSlots = Array.from({ length: teamsPerGroup }, (_, i) => `${Letter}${i + 1}`);
    const matches   = [];

    const n      = teamsPerGroup;
    const rounds = n % 2 === 0 ? n - 1 : n;
    const roster = [...teamSlots];
    const fixed  = roster[0];
    const rotate = roster.slice(1);

    for (let r = 0; r < rounds; r++) {
      const cur  = [fixed, ...rotate];
      const half = Math.floor(cur.length / 2);
      for (let i = 0; i < half; i++) {
        matches.push({
          id:           `g${letter}-m${mIdx++}`,
          round:        r + 1,
          isFinal:      false,
          isGroupMatch: true,
          groupName:    `Группа ${Letter}`,
          groupLetter:  Letter,
          teamA:        cur[i],
          teamB:        cur[cur.length - 1 - i],
          scoreA: 0, scoreB: 0,
          status: 'scheduled', winner: null, scheduledAt: null,
        });
      }
      rotate.unshift(rotate.pop());
    }

    stages.push({
      name:        `Группа ${Letter}`,
      groupLetter: Letter,
      teamSlots,
      isGroup:     true,
      matches,
    });
  }

  return { type: 'group', stages };
}

// Обратная совместимость
function generateGroupStagePlayoff({ groupCount, teamsPerGroup }) {
  return generateGroupStage({ groupCount, teamsPerGroup });
}

/* ─── Swiss Stage ──────────────────────────────────────────────── */

/**
 * Генерирует Swiss Stage.
 *
 * Принципиальные отличия от SE:
 * - Swiss-матчи НЕ имеют nextMatchId/nextMatchSlot — без автопродвижения
 * - Следующий раунд строится через generateSwissNextRound() после завершения всех матчей
 * - Плейофф заполняется ТОЛЬКО командами достигшими порога побед (через fillPlayoffFromSwiss)
 * - ID: sw-r1-m1, sw-r1-m2, sw-r2-m1, ...
 */
function generateSwissStage({ teamCount = 8, winsToAdvance = 3, lossesToElim = 3 } = {}) {
  if (![8, 16].includes(teamCount)) {
    throw new Error(`Swiss Stage: поддерживается 8/16 команд, получено: ${teamCount}`);
  }

  const teams = Array.from({ length: teamCount }, (_, i) => ({
    name:       `Команда ${i + 1}`,
    wins:       0,
    losses:     0,
    advanced:   false,
    eliminated: false,
  }));

  const round1Matches = [];
  for (let i = 0; i < teamCount; i += 2) {
    round1Matches.push({
      id:           `sw-r1-m${Math.floor(i / 2) + 1}`,
      round:        1,
      swissRound:   1,
      isFinal:      false,
      isSwissMatch: true,
      // НЕТ nextMatchId — Swiss не использует автопродвижение bracket-engine
      teamA:        teams[i].name,
      teamB:        teams[i + 1].name,
      scoreA: 0, scoreB: 0,
      status: 'scheduled', winner: null, scheduledAt: null,
    });
  }

  return {
    type:         'swiss',
    winsToAdvance,
    lossesToElim,
    swissConfig:  { winsToAdvance, lossesToElim, teamCount, teams },
    stages: [{
      name:       'Swiss Раунд 1',
      swissRound: 1,
      isSwiss:    true,
      matches:    round1Matches,
    }],
  };
}

/** Пересчитать записи команд из всех Swiss-матчей */
function computeSwissStandings(bracket) {
  if (!bracket?.swissConfig) return new Map();
  const { winsToAdvance, lossesToElim, teams } = bracket.swissConfig;
  const map = new Map();
  teams.forEach(t => map.set(t.name, { name: t.name, wins: 0, losses: 0, advanced: false, eliminated: false }));

  for (const stage of (bracket.stages || [])) {
    if (!stage.isSwiss) continue;
    for (const m of (stage.matches || [])) {
      if (m.status !== 'finished' || !m.winner) continue;
      const loser = m.winner === m.teamA ? m.teamB : m.teamA;
      if (map.has(m.winner)) map.get(m.winner).wins++;
      if (map.has(loser))    map.get(loser).losses++;
    }
  }

  for (const [, s] of map) {
    if (s.wins   >= winsToAdvance) s.advanced    = true;
    if (s.losses >= lossesToElim)  s.eliminated  = true;
    s.active = !s.advanced && !s.eliminated;
  }

  return map;
}

/** Все матчи текущего Swiss-раунда завершены? */
function isSwissRoundComplete(bracket) {
  if (!bracket?.stages) return false;
  const swissStages = bracket.stages.filter(s => s.isSwiss);
  if (!swissStages.length) return false;
  const last = swissStages[swissStages.length - 1];
  return last.matches.every(m => m.status === 'finished');
}

/**
 * Сгенерировать следующий Swiss-раунд.
 * Пары: команды с одинаковой записью побед-поражений.
 * ID: sw-rN-m1, sw-rN-m2, ...
 */
/**
 * Собрать историю всех уже сыгранных пар Swiss (для защиты от повторов).
 * Возвращает Set строк "TeamA|TeamB" (отсортировано, так что порядок не важен).
 */
function getSwissPlayedPairs(bracket) {
  const pairs = new Set();
  for (const stage of (bracket.stages || [])) {
    if (!stage.isSwiss) continue;
    for (const m of (stage.matches || [])) {
      if (m.teamA && m.teamB) {
        pairs.add([m.teamA, m.teamB].sort().join('|'));
      }
    }
  }
  return pairs;
}

/**
 * Построить пары внутри группы команд с одинаковым счётом,
 * избегая повторных встреч. Использует жадный алгоритм:
 * для каждой ещё не распределённой команды ищем первого доступного
 * соперника, с которым она ещё не играла.
 *
 * Если внутри своей группы по счёту не находится пары без повтора —
 * команда "переносится" в соседнюю группу (на одну ступень ниже по
 * победам) — стандартная практика Swiss-систем при коллизиях.
 *
 * @returns {Array<[string,string]>} пары
 */
function pairTeamsAvoidingRepeats(sortedGroups, playedPairs) {
  // sortedGroups: [[team,...], [team,...], ...] — от лучшей записи к худшей
  const pairs    = [];
  const unpaired = [];

  // Собираем всех в один список с указанием исходной группы (для tie-break сортировки)
  let pool = sortedGroups.flatMap((group, gi) => group.map(name => ({ name, gi })));

  while (pool.length > 0) {
    const current = pool.shift();
    let opponentIdx = -1;

    // Ищем первого доступного соперника без повторной встречи,
    // предпочитая ближайших по группе (минимальная разница gi)
    let bestDiff = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const pairKey   = [current.name, candidate.name].sort().join('|');
      if (playedPairs.has(pairKey)) continue;

      const diff = Math.abs(candidate.gi - current.gi);
      if (diff < bestDiff) {
        bestDiff    = diff;
        opponentIdx = i;
        if (diff === 0) break; // идеальное совпадение — та же группа, дальше не ищем
      }
    }

    if (opponentIdx === -1) {
      // Нет доступного соперника без повтора — команда не сыграет в этом раунде
      // (статистически редкий случай при больших турнирах, но возможен в малых)
      unpaired.push(current);
      continue;
    }

    const opponent = pool.splice(opponentIdx, 1)[0];
    pairs.push([current.name, opponent.name]);
    playedPairs.add([current.name, opponent.name].sort().join('|'));
  }

  return { pairs, unpaired: unpaired.map(u => u.name) };
}

function generateSwissNextRound(bracket) {
  if (!bracket?.swissConfig) return { ok: false, message: 'Не Swiss bracket', newStage: null };
  if (!isSwissRoundComplete(bracket)) return { ok: false, message: 'Не все матчи текущего раунда завершены', newStage: null };

  const standings = computeSwissStandings(bracket);
  const active     = [...standings.values()].filter(s => s.active);
  if (active.length < 2) return { ok: false, message: 'Недостаточно активных команд', newStage: null };

  const swissStages = bracket.stages.filter(s => s.isSwiss);
  const nextRound    = swissStages.length + 1;
  const playedPairs  = getSwissPlayedPairs(bracket);

  // Группируем по записи (wins-losses), сортируем по убыванию побед
  const byRecord = new Map();
  for (const s of active) {
    const key = `${s.wins}-${s.losses}`;
    if (!byRecord.has(key)) byRecord.set(key, []);
    byRecord.get(key).push(s.name);
  }

  const sortedKeys = [...byRecord.keys()].sort((a, b) => {
    const [wa] = a.split('-').map(Number);
    const [wb] = b.split('-').map(Number);
    return wb - wa;
  });

  const sortedGroups = sortedKeys.map(k => byRecord.get(k));
  const { pairs, unpaired } = pairTeamsAvoidingRepeats(sortedGroups, playedPairs);

  if (!pairs.length) {
    return { ok: false, message: 'Нет доступных пар без повторных встреч', newStage: null };
  }

  const matches = pairs.map(([teamA, teamB], i) => ({
    id:           `sw-r${nextRound}-m${i + 1}`,
    round:        nextRound,
    swissRound:   nextRound,
    isFinal:      false,
    isSwissMatch: true,
    teamA, teamB,
    scoreA: 0, scoreB: 0,
    status: 'scheduled', winner: null, scheduledAt: null,
  }));

  const newStage = {
    name:       `Swiss Раунд ${nextRound}`,
    swissRound: nextRound,
    isSwiss:    true,
    matches,
  };

  bracket.stages.push(newStage);
  bracket.swissConfig.teams = [...standings.values()];

  const msg = unpaired.length
    ? `Раунд ${nextRound} создан (${matches.length} матчей). ⚠️ ${unpaired.length} команд(а) без пары: ${unpaired.join(', ')}`
    : `Раунд ${nextRound} создан (${matches.length} матчей)`;

  return { ok: true, message: msg, newStage, unpaired };
}

/**
 * Заполнить слоты плейоффа командами достигшими порога побед в Swiss.
 * Вызывается из /swissnext когда Swiss полностью завершён.
 *
 * @param {object} bracket — bracket с Swiss + Playoff стадиями
 * @returns {{ ok, filled, message }}
 */
function fillPlayoffFromSwiss(bracket) {
  if (!bracket?.swissConfig) return { ok: false, filled: 0, message: 'Нет Swiss конфигурации' };

  const standings = computeSwissStandings(bracket);
  const allTeams  = [...standings.values()];

  // КРИТИЧЕСКАЯ ПРОВЕРКА: плейофф заполняется ТОЛЬКО когда Swiss полностью
  // завершён — то есть каждая команда либо вышла (advanced), либо выбыла
  // (eliminated). Если есть хотя бы одна активная команда — рано заполнять
  // плейофф, иначе слоты займут случайные текущие лидеры, а не финальный
  // состав вышедших.
  const stillActive = allTeams.filter(t => t.active);
  if (stillActive.length > 0) {
    return {
      ok: false,
      filled: 0,
      message: `Swiss ещё не завершён: ${stillActive.length} команд(а) всё ещё играют (${stillActive.map(t=>t.name).join(', ')})`,
    };
  }

  const advanced = allTeams
    .filter(s => s.advanced)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses); // лучшие первыми

  if (!advanced.length) return { ok: false, filled: 0, message: 'Нет команд достигших порога побед' };

  // Ищем playoff стадию (не Swiss, не Group)
  const playoffStages = bracket.stages.filter(s => !s.isSwiss && !s.isGroup);
  if (!playoffStages.length) return { ok: true, filled: 0, message: 'Плейофф не найден в bracket (Swiss без плейоффа)' };

  // Первый раунд плейоффа
  const firstPlayoff = playoffStages[0];
  const firstRound   = Math.min(...firstPlayoff.matches.map(m => m.round ?? 1));
  const r1matches    = firstPlayoff.matches.filter(m => (m.round ?? 1) === firstRound);

  // Заполняем слоты TBD по порядку
  let filled = 0;
  const slots = [];
  for (const m of r1matches) {
    if (!m.teamA || m.teamA === 'TBD') slots.push({ matchId: m.id, slot: 'A', match: m });
    if (!m.teamB || m.teamB === 'TBD') slots.push({ matchId: m.id, slot: 'B', match: m });
  }

  for (let i = 0; i < Math.min(slots.length, advanced.length); i++) {
    const { match, slot } = slots[i];
    if (slot === 'A') match.teamA = advanced[i].name;
    else              match.teamB = advanced[i].name;
    filled++;
  }

  return { ok: true, filled, message: `${filled} команд посеяно в плейофф` };
}

/** Форматирование таблицы Swiss для Telegram */
function formatSwissStandings(bracket) {
  const standings = computeSwissStandings(bracket);
  if (!standings.size) return 'Нет данных';

  const { winsToAdvance, lossesToElim } = bracket.swissConfig || {};
  return [...standings.values()]
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .map(s => {
      const icon = s.advanced ? '✅' : s.eliminated ? '❌' : '⏳';
      return `${icon} ${s.name}: ${s.wins}W — ${s.losses}L`;
    })
    .join('\n');
}

/* ─── Посев ─────────────────────────────────────────────────────── */

/**
 * Приоритет: Swiss → Group → первый раунд Playoff.
 * Swiss и Group НЕ засеиваются в плейофф — только их стартовые слоты.
 */
function getEmptySlots(bracket) {
  if (!bracket?.stages?.length) return [];

  // Приоритет 1: Swiss-команды
  const swissStages = bracket.stages.filter(s => s.isSwiss);
  if (swissStages.length && bracket.swissConfig?.teams) {
    return bracket.swissConfig.teams.map((t, i) => ({
      type:      'swiss',
      teamIndex: i,
      current:   t.name,
      label:     `Команда ${i + 1}`,
    }));
  }

  // Приоритет 2: Group-слоты
  const groupStages = bracket.stages.filter(s => s.isGroup);
  if (groupStages.length) {
    const slots = [];
    for (const stage of groupStages) {
      (stage.teamSlots || []).forEach((slotName, i) => {
        slots.push({
          type:       'group',
          stageIndex: bracket.stages.indexOf(stage),
          slotIndex:  i,
          slotName,
          stageName:  stage.name,
          current:    slotName,
        });
      });
    }
    return slots;
  }

  // Приоритет 3: первый раунд первой Playoff-стадии
  const playStage = bracket.stages.find(s => !s.isGroup && !s.isSwiss && s.matches?.length);
  if (!playStage) return [];

  const minRound = Math.min(...playStage.matches.map(m => m.round ?? 1));
  const slots    = [];
  for (const m of playStage.matches.filter(m => (m.round ?? 1) === minRound)) {
    if (!m.teamA || m.teamA === 'TBD') slots.push({ type:'match', matchId:m.id, slot:'A', stageName:playStage.name });
    if (!m.teamB || m.teamB === 'TBD') slots.push({ type:'match', matchId:m.id, slot:'B', stageName:playStage.name });
  }
  return slots;
}

/** Вписать команду в слот */
function seedTeamInSlot(bracket, slotDescriptor, teamName) {
  if (slotDescriptor.type === 'swiss') {
    const team = bracket.swissConfig?.teams?.[slotDescriptor.teamIndex];
    if (!team) throw new Error(`Swiss слот ${slotDescriptor.teamIndex} не найден`);
    const old = team.name;
    team.name = teamName;
    const r1 = bracket.stages.find(s => s.isSwiss && s.swissRound === 1);
    if (r1) for (const m of r1.matches) {
      if (m.teamA === old) m.teamA = teamName;
      if (m.teamB === old) m.teamB = teamName;
    }
    return;
  }

  if (slotDescriptor.type === 'group') {
    const stage = bracket.stages[slotDescriptor.stageIndex];
    if (!stage) throw new Error(`Стадия ${slotDescriptor.stageIndex} не найдена`);
    const old = stage.teamSlots[slotDescriptor.slotIndex];
    stage.teamSlots[slotDescriptor.slotIndex] = teamName;
    for (const m of (stage.matches || [])) {
      if (m.teamA === old) m.teamA = teamName;
      if (m.teamB === old) m.teamB = teamName;
    }
    return;
  }

  // type === 'match'
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.id === slotDescriptor.matchId) {
        if (slotDescriptor.slot === 'A') m.teamA = teamName;
        else                             m.teamB = teamName;
        return;
      }
    }
  }
  throw new Error(`Матч "${slotDescriptor.matchId}" не найден`);
}

/** Fisher-Yates shuffle */
function randomShuffleTeams(teams) {
  const a = [...teams];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Валидация ─────────────────────────────────────────────────── */

function validateGeneratedBracket(bracket) {
  const errors = [];
  if (!bracket?.stages?.length) { errors.push('bracket.stages пуст'); return errors; }

  const seen = new Set();
  const all  = new Set();

  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (!m.id)           { errors.push(`Матч без id в стадии "${stage.name}"`); continue; }
      if (seen.has(m.id))  errors.push(`Дублирующийся id: "${m.id}"`);
      seen.add(m.id);
      all.add(m.id);
    }
  }

  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.nextMatchId && !all.has(m.nextMatchId))
        errors.push(`Матч "${m.id}": nextMatchId "${m.nextMatchId}" не существует`);
    }
  }

  const hasSwiss  = bracket.stages.some(s => s.isSwiss);
  const hasGroup  = bracket.stages.some(s => s.isGroup);
  const finals    = [];
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.isFinal) finals.push(m.id);
    }
  }

  if (!hasSwiss && !hasGroup) {
    if (!finals.length) errors.push('Нет матча с isFinal: true');
    if (finals.length > 1) errors.push(`Несколько финалов: ${finals.join(', ')}`);
  }

  return errors;
}

/* ─── Экспорт ───────────────────────────────────────────────────── */

module.exports = {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStage,
  generateGroupStagePlayoff,
  generateSwissStage,
  generateSwissNextRound,
  getSwissPlayedPairs,
  pairTeamsAvoidingRepeats,
  computeSwissStandings,
  isSwissRoundComplete,
  fillPlayoffFromSwiss,
  formatSwissStandings,
  getEmptySlots,
  seedTeamInSlot,
  randomShuffleTeams,
  validateGeneratedBracket,
};
