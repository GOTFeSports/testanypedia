'use strict';

/**
 * bracketGenerator.js — генерация структур bracket.
 *
 * Все генерируемые структуры используют явные ссылки nextMatchId/nextMatchSlot
 * для bracket-engine.js (приоритетный путь в resolveAdvancement).
 *
 * Типы стадий:
 *   single  — Single Elimination
 *   double  — Double Elimination (Upper + Lower + Grand Final)
 *   group   — Group Stage (round-robin внутри каждой группы)
 *   swiss   — Swiss Stage (динамические пары по записям побед/поражений)
 */

/* ─── Single Elimination ───────────────────────────────────────── */

function generateSingleElimination(teamCount) {
  if (![4, 8, 16, 32, 64].includes(teamCount)) {
    throw new Error(`Single Elimination: поддерживается 4/8/16/32/64 команд, получено: ${teamCount}`);
  }

  const rounds            = Math.log2(teamCount);
  const matchIdsByRound   = {};
  let   matchIndex        = 1;

  for (let round = 1; round <= rounds; round++) {
    const count = teamCount / Math.pow(2, round);
    matchIdsByRound[round] = [];
    for (let i = 0; i < count; i++) {
      matchIdsByRound[round].push(`m${matchIndex++}`);
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
    isFinal:      opts.isFinal      ?? false,
    teamA:        opts.teamA        ?? 'TBD',
    teamB:        opts.teamB        ?? 'TBD',
    scoreA: 0, scoreB: 0,
    status: 'scheduled', winner: null, scheduledAt: null,
    ...(opts.nextMatchId   ? { nextMatchId:   opts.nextMatchId }   : {}),
    ...(opts.nextMatchSlot ? { nextMatchSlot: opts.nextMatchSlot } : {}),
    ...(opts.loserMatchId  ? { loserMatchId:  opts.loserMatchId }  : {}),
    ...(opts.loserMatchSlot? { loserMatchSlot:opts.loserMatchSlot }: {}),
  };
}

function generateDoubleElimination(teamCount) {
  if (![4, 8].includes(teamCount)) {
    throw new Error(`Double Elimination: поддерживается 4/8 команд, получено: ${teamCount}`);
  }
  return teamCount === 4 ? generateDoubleElim4() : generateDoubleElim8();
}

function generateDoubleElim4() {
  return {
    type: 'double',
    stages: [
      { name: 'Upper Bracket', matches: [
        makeMatch('u1', 1, { nextMatchId:'u-final', nextMatchSlot:'A', loserMatchId:'l1', loserMatchSlot:'A' }),
        makeMatch('u2', 1, { nextMatchId:'u-final', nextMatchSlot:'B', loserMatchId:'l1', loserMatchSlot:'B' }),
        makeMatch('u-final', 2, { nextMatchId:'grand-final', nextMatchSlot:'A', loserMatchId:'l-final', loserMatchSlot:'B' }),
      ]},
      { name: 'Lower Bracket', matches: [
        makeMatch('l1', 1, { nextMatchId:'l-final', nextMatchSlot:'A' }),
        makeMatch('l-final', 2, { nextMatchId:'grand-final', nextMatchSlot:'B' }),
      ]},
      { name: 'Grand Final', matches: [
        makeMatch('grand-final', 1, { isFinal: true }),
      ]},
    ],
  };
}

function generateDoubleElim8() {
  return {
    type: 'double',
    stages: [
      { name: 'Upper Bracket', matches: [
        makeMatch('u1', 1, { nextMatchId:'u5', nextMatchSlot:'A', loserMatchId:'l1', loserMatchSlot:'A' }),
        makeMatch('u2', 1, { nextMatchId:'u5', nextMatchSlot:'B', loserMatchId:'l1', loserMatchSlot:'B' }),
        makeMatch('u3', 1, { nextMatchId:'u6', nextMatchSlot:'A', loserMatchId:'l2', loserMatchSlot:'A' }),
        makeMatch('u4', 1, { nextMatchId:'u6', nextMatchSlot:'B', loserMatchId:'l2', loserMatchSlot:'B' }),
        makeMatch('u5', 2, { nextMatchId:'u-final', nextMatchSlot:'A', loserMatchId:'l3', loserMatchSlot:'B' }),
        makeMatch('u6', 2, { nextMatchId:'u-final', nextMatchSlot:'B', loserMatchId:'l4', loserMatchSlot:'B' }),
        makeMatch('u-final', 3, { nextMatchId:'grand-final', nextMatchSlot:'A', loserMatchId:'l-final', loserMatchSlot:'B' }),
      ]},
      { name: 'Lower Bracket', matches: [
        makeMatch('l1', 1, { nextMatchId:'l3', nextMatchSlot:'A' }),
        makeMatch('l2', 1, { nextMatchId:'l4', nextMatchSlot:'A' }),
        makeMatch('l3', 2, { nextMatchId:'l5', nextMatchSlot:'A' }),
        makeMatch('l4', 2, { nextMatchId:'l5', nextMatchSlot:'B' }),
        makeMatch('l5', 3, { nextMatchId:'l-final', nextMatchSlot:'A' }),
        makeMatch('l-final', 4, { nextMatchId:'grand-final', nextMatchSlot:'B' }),
      ]},
      { name: 'Grand Final', matches: [
        makeMatch('grand-final', 1, { isFinal: true }),
      ]},
    ],
  };
}

/* ─── Group Stage ──────────────────────────────────────────────── */

/**
 * Генерирует групповой этап.
 * Каждая группа — round-robin внутри себя.
 * Команды в группах хранятся как алиасы A1/A2/B1/B2 — замена на реальные
 * через /seed или /randomseed.
 *
 * Поле groupTeams хранит массив слотов каждой группы — именно их засеивают.
 *
 * НЕ генерирует плейофф внутри себя — плейофф создаётся как отдельная стадия
 * через finalizeBracket (многостадийный wizard).
 */
function generateGroupStage({ groupCount, teamsPerGroup }) {
  if (![2, 4, 8].includes(groupCount)) {
    throw new Error(`Group Stage: поддерживается 2/4/8 групп, получено: ${groupCount}`);
  }
  if (![4, 6, 8].includes(teamsPerGroup)) {
    throw new Error(`Group Stage: поддерживается 4/6/8 команд в группе, получено: ${teamsPerGroup}`);
  }

  const groupLetters = ['A','B','C','D','E','F','G','H'];
  const stages       = [];
  let   matchCounter = 1;

  for (let g = 0; g < groupCount; g++) {
    const letter    = groupLetters[g];
    const groupName = `Группа ${letter}`;
    // Алиасные имена слотов: A1, A2, ... — реальные команды вписываются через /seed
    const teamSlots = Array.from({ length: teamsPerGroup }, (_, i) => `${letter}${i + 1}`);
    const matches   = [];

    // Round-robin: раунды распределяются по схеме "круговой" —
    // при чётном числе команд: N-1 раундов, каждый по N/2 матчей.
    // При нечётном: N раундов по (N-1)/2 матчей (одна команда отдыхает).
    const n      = teamsPerGroup;
    const rounds = n % 2 === 0 ? n - 1 : n;

    // Алгоритм круговой: фиксируем первую команду, вращаем остальных
    const roster = [...teamSlots];
    const fixed  = roster[0];
    const rotate = roster.slice(1);

    for (let r = 0; r < rounds; r++) {
      const currentRoster = [fixed, ...rotate];
      const pairs = [];
      const half  = Math.floor(currentRoster.length / 2);
      for (let i = 0; i < half; i++) {
        pairs.push([currentRoster[i], currentRoster[currentRoster.length - 1 - i]]);
      }
      pairs.forEach(([tA, tB]) => {
        matches.push({
          id:          `g${letter}-m${matchCounter++}`,
          round:       r + 1,
          isFinal:     false,
          isGroupMatch:true,
          groupName,
          groupLetter: letter,
          teamA:       tA,
          teamB:       tB,
          scoreA: 0, scoreB: 0,
          status: 'scheduled', winner: null, scheduledAt: null,
        });
      });
      // Поворот: последний элемент перемещается на вторую позицию
      rotate.unshift(rotate.pop());
    }

    stages.push({
      name:       groupName,
      groupLetter:letter,
      teamSlots,           // слоты для посева — A1, A2, ...
      isGroup:    true,
      matches,
    });
  }

  return { type: 'group', stages };
}

/**
 * Устаревший алиас для обратной совместимости с wizard который использует
 * generateGroupStagePlayoff. Теперь плейофф — отдельная стадия.
 */
function generateGroupStagePlayoff({ groupCount, teamsPerGroup, advancingPerGroup = 2 }) {
  return generateGroupStage({ groupCount, teamsPerGroup });
}

/* ─── Swiss Stage (динамическая модель) ────────────────────────── */

/**
 * Генерирует Swiss Stage с настоящей динамической логикой.
 *
 * Структура данных:
 *   bracket.swissConfig = { winsToAdvance, lossesToElim, teamCount, teams }
 *   bracket.stages = [ { name, isSwiss, swissRound, matches } ]
 *
 * Первый раунд генерируется сразу (случайные/последовательные пары).
 * Следующие раунды генерируются через generateSwissNextRound() после
 * внесения всех результатов текущего раунда.
 *
 * Пары строятся: команды с одинаковой записью (побед-поражений) играют друг с другом.
 * Команды, набравшие winsToAdvance, вышли. Набравшие lossesToElim — выбыли.
 */
function generateSwissStage({ teamCount = 8, winsToAdvance = 3, lossesToElim = 3 } = {}) {
  if (![8, 16].includes(teamCount)) {
    throw new Error(`Swiss Stage: поддерживается 8/16 команд, получено: ${teamCount}`);
  }

  // Инициализируем команды с записями
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    name:   `Команда ${i + 1}`,  // заменяется через /seed или /randomseed
    wins:   0,
    losses: 0,
    active: true,   // false когда выбыл или вышел
    advanced: false, // вышел в следующую стадию
    eliminated: false,
  }));

  // Генерируем первый раунд: пары подряд по позиции
  const round1Matches = [];
  let matchCounter = 1;
  for (let i = 0; i < teamCount; i += 2) {
    round1Matches.push({
      id:          `sw${matchCounter++}`,
      round:       1,
      swissRound:  1,
      isFinal:     false,
      isSwissMatch:true,
      teamA:       teams[i].name,
      teamB:       teams[i + 1].name,
      scoreA: 0, scoreB: 0,
      status: 'scheduled', winner: null, scheduledAt: null,
    });
  }

  return {
    type:        'swiss',
    winsToAdvance,
    lossesToElim,
    swissConfig: { winsToAdvance, lossesToElim, teamCount, teams },
    stages: [{
      name:       'Swiss Раунд 1',
      swissRound: 1,
      isSwiss:    true,
      isFinal:    false,  // финал Swiss определяется особо
      matches:    round1Matches,
    }],
  };
}

/**
 * Вычислить текущие записи команд из всех сыгранных матчей Swiss.
 * Возвращает Map<teamName, { wins, losses, active, advanced, eliminated }>
 */
function computeSwissStandings(bracket) {
  if (!bracket?.swissConfig) return new Map();

  const { winsToAdvance, lossesToElim, teams } = bracket.swissConfig;
  // Восстанавливаем записи из результатов матчей
  const standings = new Map();
  teams.forEach(t => {
    standings.set(t.name, { name: t.name, wins: 0, losses: 0, advanced: false, eliminated: false });
  });

  for (const stage of (bracket.stages || [])) {
    if (!stage.isSwiss) continue;
    for (const m of (stage.matches || [])) {
      if (m.status !== 'finished' || !m.winner) continue;
      const loser = m.winner === m.teamA ? m.teamB : m.teamA;
      if (standings.has(m.winner)) standings.get(m.winner).wins++;
      if (standings.has(loser))    standings.get(loser).losses++;
    }
  }

  // Помечаем статус
  for (const [, s] of standings) {
    if (s.wins   >= winsToAdvance) s.advanced    = true;
    if (s.losses >= lossesToElim)  s.eliminated  = true;
    s.active = !s.advanced && !s.eliminated;
  }

  return standings;
}

/**
 * Проверить — все матчи текущего Swiss-раунда завершены?
 */
function isSwissRoundComplete(bracket) {
  if (!bracket?.stages) return false;
  const swissStages = bracket.stages.filter(s => s.isSwiss);
  if (!swissStages.length) return false;
  const lastRound = swissStages[swissStages.length - 1];
  return lastRound.matches.every(m => m.status === 'finished');
}

/**
 * Сгенерировать следующий Swiss-раунд.
 * Пары: команды с одинаковой записью (wins-losses) играют друг с другом.
 * Команды которые уже вышли или выбыли — не участвуют.
 *
 * @param {object} bracket - мутируется (добавляется новая стадия)
 * @returns {{ ok: boolean, message: string, newStage: object|null }}
 */
function generateSwissNextRound(bracket) {
  if (!bracket?.swissConfig) {
    return { ok: false, message: 'Это не Swiss bracket', newStage: null };
  }
  if (!isSwissRoundComplete(bracket)) {
    return { ok: false, message: 'Не все матчи текущего раунда завершены', newStage: null };
  }

  const standings = computeSwissStandings(bracket);
  const { winsToAdvance, lossesToElim } = bracket.swissConfig;

  // Команды которые ещё играют
  const active = [...standings.values()].filter(s => s.active);

  if (active.length < 2) {
    return { ok: false, message: 'Недостаточно активных команд для следующего раунда', newStage: null };
  }

  // Группируем по записи (wins-losses)
  const byRecord = new Map();
  for (const s of active) {
    const key = `${s.wins}-${s.losses}`;
    if (!byRecord.has(key)) byRecord.set(key, []);
    byRecord.get(key).push(s.name);
  }

  // Строим пары внутри каждой группы записей
  const matches      = [];
  const swissStages  = bracket.stages.filter(s => s.isSwiss);
  const nextRoundNum = swissStages.length + 1;
  let   matchCounter = bracket.stages.flatMap(s => s.matches || []).length + 1;

  // Сортируем группы по убыванию числа побед (начинаем с "лидеров")
  const sortedKeys = [...byRecord.keys()].sort((a, b) => {
    const [wa] = a.split('-').map(Number);
    const [wb] = b.split('-').map(Number);
    return wb - wa;
  });

  for (const key of sortedKeys) {
    const group = byRecord.get(key);
    // При нечётном числе — последняя команда "перетекает" в следующую группу
    for (let i = 0; i + 1 < group.length; i += 2) {
      matches.push({
        id:          `sw${matchCounter++}`,
        round:       nextRoundNum,
        swissRound:  nextRoundNum,
        isFinal:     false,
        isSwissMatch:true,
        teamA:       group[i],
        teamB:       group[i + 1],
        scoreA: 0, scoreB: 0,
        status: 'scheduled', winner: null, scheduledAt: null,
      });
    }
  }

  if (!matches.length) {
    return { ok: false, message: 'Не удалось составить пары (возможно все команды завершили Swiss)', newStage: null };
  }

  const newStage = {
    name:       `Swiss Раунд ${nextRoundNum}`,
    swissRound: nextRoundNum,
    isSwiss:    true,
    matches,
  };

  bracket.stages.push(newStage);

  // Обновляем swissConfig.teams из standings
  bracket.swissConfig.teams = [...standings.values()];

  return { ok: true, message: `Раунд ${nextRoundNum} сгенерирован (${matches.length} матчей)`, newStage };
}

/**
 * Получить итоговую таблицу Swiss как текст для Telegram.
 */
function formatSwissStandings(bracket) {
  const standings = computeSwissStandings(bracket);
  if (!standings.size) return 'Нет данных';

  const { winsToAdvance, lossesToElim } = bracket.swissConfig;
  const rows = [...standings.values()].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  const lines = rows.map(s => {
    const status = s.advanced ? '✅' : s.eliminated ? '❌' : '⏳';
    return `${status} ${s.name}: ${s.wins}W — ${s.losses}L`;
  });
  return lines.join('\n');
}

/* ─── Посев: получить слоты ────────────────────────────────────── */

/**
 * Вернуть список слотов для ручного посева.
 *
 * Логика приоритета:
 * 1. Если есть Swiss стадии → возвращаем команды Swiss (teamSlots из swissConfig)
 * 2. Если есть Group стадии → возвращаем слоты каждой группы (isGroup: true)
 * 3. Иначе → возвращаем TBD-слоты первого раунда первой незаполненной стадии
 *
 * Это гарантирует что /seed всегда начинает с самого начала.
 */
function getEmptySlots(bracket) {
  if (!bracket?.stages?.length) return [];

  // Приоритет 1: Swiss — команды первого раунда
  const swissStages = bracket.stages.filter(s => s.isSwiss);
  if (swissStages.length) {
    const firstSwiss = swissStages[0];
    const slots = [];
    if (bracket.swissConfig?.teams) {
      bracket.swissConfig.teams.forEach((t, i) => {
        slots.push({
          type:     'swiss',
          teamIndex: i,
          current:  t.name,
          label:    `Команда ${i + 1}`,
        });
      });
    }
    return slots;
  }

  // Приоритет 2: Group Stage — слоты каждой группы
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
          current:    slotName, // текущее значение (алиас или реальное имя)
        });
      });
    }
    return slots;
  }

  // Приоритет 3: TBD-слоты первого раунда первой Play-стадии
  const playstage = bracket.stages.find(s => !s.isGroup && !s.isSwiss && s.matches?.length);
  if (!playstage) return [];

  const matches  = playstage.matches;
  const minRound = Math.min(...matches.map(m => m.round ?? 1));
  const slots    = [];

  for (const m of matches.filter(m => (m.round ?? 1) === minRound)) {
    if (!m.teamA || m.teamA === 'TBD') {
      slots.push({ type:'match', matchId: m.id, slot:'A', stageName: playstage.name });
    }
    if (!m.teamB || m.teamB === 'TBD') {
      slots.push({ type:'match', matchId: m.id, slot:'B', stageName: playstage.name });
    }
  }

  return slots;
}

/**
 * Вписать команду в слот (поддерживает все три типа слотов).
 */
function seedTeamInSlot(bracket, slotDescriptor, teamName) {
  if (slotDescriptor.type === 'swiss') {
    const { teamIndex } = slotDescriptor;
    const team = bracket.swissConfig?.teams?.[teamIndex];
    if (!team) throw new Error(`Swiss слот ${teamIndex} не найден`);
    const oldName = team.name;
    team.name = teamName;
    // Обновляем имя в матчах первого раунда
    const firstSwiss = bracket.stages.find(s => s.isSwiss && s.swissRound === 1);
    if (firstSwiss) {
      for (const m of firstSwiss.matches) {
        if (m.teamA === oldName) m.teamA = teamName;
        if (m.teamB === oldName) m.teamB = teamName;
      }
    }
    return;
  }

  if (slotDescriptor.type === 'group') {
    const { stageIndex, slotIndex, slotName } = slotDescriptor;
    const stage = bracket.stages[stageIndex];
    if (!stage) throw new Error(`Стадия ${stageIndex} не найдена`);
    const oldName = stage.teamSlots[slotIndex];
    stage.teamSlots[slotIndex] = teamName;
    // Обновляем имя во всех матчах группы
    for (const m of (stage.matches || [])) {
      if (m.teamA === oldName) m.teamA = teamName;
      if (m.teamB === oldName) m.teamB = teamName;
    }
    return;
  }

  // type === 'match' — обычный TBD-слот
  const { matchId, slot } = slotDescriptor;
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.id === matchId) {
        if (slot === 'A') m.teamA = teamName;
        else              m.teamB = teamName;
        return;
      }
    }
  }
  throw new Error(`Матч "${matchId}" не найден`);
}

/**
 * Случайное перемешивание слотов (для /randomseed).
 * Принимает массив имён команд, возвращает список операций посева.
 */
function randomShuffleTeams(teams) {
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/* ─── Валидация ─────────────────────────────────────────────────── */

function validateGeneratedBracket(bracket) {
  const errors = [];
  if (!bracket?.stages?.length) {
    errors.push('bracket.stages пуст');
    return errors;
  }

  const seenIds = new Set();
  const allIds  = new Set();

  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (!m.id) { errors.push(`Матч без id в стадии "${stage.name}"`); continue; }
      if (seenIds.has(m.id)) errors.push(`Дублирующийся id матча: "${m.id}"`);
      seenIds.add(m.id);
      allIds.add(m.id);
    }
  }

  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.nextMatchId && !allIds.has(m.nextMatchId)) {
        errors.push(`Матч "${m.id}": nextMatchId "${m.nextMatchId}" не существует`);
      }
    }
  }

  const finals = [];
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.isFinal) finals.push(m.id);
    }
  }

  // Swiss: финальный матч определяется иначе (последний раунд Swiss)
  const hasSwiss = bracket.stages.some(s => s.isSwiss);
  if (!hasSwiss) {
    if (finals.length === 0) errors.push('Нет матча с isFinal: true');
    if (finals.length  > 1) errors.push(`Несколько финальных матчей: ${finals.join(', ')}`);
  }

  return errors;
}

/* ─── Экспорт ───────────────────────────────────────────────────── */

module.exports = {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStage,
  generateGroupStagePlayoff,  // совместимость
  generateSwissStage,
  generateSwissNextRound,
  computeSwissStandings,
  isSwissRoundComplete,
  formatSwissStandings,
  getEmptySlots,
  seedTeamInSlot,
  randomShuffleTeams,
  validateGeneratedBracket,
};
