'use strict';

/**
 * bracketGenerator.js — генерация структур bracket для всех типов турниров.
 *
 * Совместимость: все генерируемые структуры используют явные ссылки
 * nextMatchId/nextMatchSlot для продвижения победителей. Это приоритетный
 * путь в bracket-engine.js (см. resolveAdvancement), не требует изменений
 * движка и корректно работает с tournament-sync.js.
 *
 * Поддерживаемые типы:
 *   single    — Single Elimination
 *   double    — Double Elimination (Upper + Lower + Grand Final)
 *   group     — Group Stage + Playoff
 */

/* ─── Single Elimination ───────────────────────────────────────── */

/**
 * Генерирует single elimination bracket для N участников.
 * N должно быть степенью двойки: 4, 8, 16, 32, 64.
 *
 * Структура: все раунды в одной стадии "Плейофф".
 * Победители продвигаются через явные nextMatchId/nextMatchSlot.
 *
 * @param {number} teamCount — количество команд
 * @returns {object} bracket-объект совместимый с data.js
 */
function generateSingleElimination(teamCount) {
  if (![4, 8, 16, 32, 64].includes(teamCount)) {
    throw new Error(`Single Elimination: поддерживается 4/8/16/32/64 команд, получено: ${teamCount}`);
  }

  const rounds     = Math.log2(teamCount); // 4→2, 8→3, 16→4 и т.д.
  const matches    = [];
  let   matchIndex = 1;

  // Генерируем раунды от первого к финальному
  // matchesInRound[r] = массив id матчей в раунде r (1-based)
  const matchIdsByRound = {};

  for (let round = 1; round <= rounds; round++) {
    const count = teamCount / Math.pow(2, round);
    matchIdsByRound[round] = [];
    for (let i = 0; i < count; i++) {
      matchIdsByRound[round].push(`m${matchIndex++}`);
    }
  }

  // Строим матчи с явными ссылками
  for (let round = 1; round <= rounds; round++) {
    const ids     = matchIdsByRound[round];
    const isFinal = round === rounds;
    const nextIds = matchIdsByRound[round + 1] || [];

    ids.forEach((id, idx) => {
      const match = {
        id,
        round,
        isFinal,
        teamA:       'TBD',
        teamB:       'TBD',
        scoreA:      0,
        scoreB:      0,
        status:      'scheduled',
        winner:      null,
        scheduledAt: null,
      };

      if (!isFinal) {
        // Победитель матча idx идёт в матч Math.floor(idx/2) следующего раунда
        const nextMatchId  = nextIds[Math.floor(idx / 2)];
        const nextSlot     = idx % 2 === 0 ? 'A' : 'B';
        match.nextMatchId  = nextMatchId;
        match.nextMatchSlot= nextSlot;
      }

      matches.push(match);
    });
  }

  // Первый раунд — слоты teamA/teamB остаются TBD (заполняются через /seed)

  return {
    type: 'single',
    stages: [
      {
        name:    'Плейофф',
        matches,
      },
    ],
  };
}

/* ─── Double Elimination ───────────────────────────────────────── */

/**
 * Генерирует double elimination bracket.
 * Поддерживается: 4, 8 команд.
 *
 * Структуры:
 *   Upper Bracket  — проигравшие падают в Lower
 *   Lower Bracket  — проигравшие выбывают
 *   Grand Final    — победитель Upper vs. победитель Lower
 *
 * Все связи явные через nextMatchId/nextMatchSlot.
 *
 * @param {number} teamCount
 * @returns {object} bracket-объект
 */
function generateDoubleElimination(teamCount) {
  if (![4, 8].includes(teamCount)) {
    throw new Error(`Double Elimination: поддерживается 4/8 команд, получено: ${teamCount}`);
  }

  if (teamCount === 4) {
    return generateDoubleElim4();
  }
  return generateDoubleElim8();
}

function makeMatch(id, round, opts = {}) {
  return {
    id,
    round,
    isFinal:        opts.isFinal        ?? false,
    isGrandFinal:   opts.isGrandFinal   ?? false,
    teamA:          opts.teamA          ?? 'TBD',
    teamB:          opts.teamB          ?? 'TBD',
    scoreA:         0,
    scoreB:         0,
    status:         'scheduled',
    winner:         null,
    scheduledAt:    null,
    nextMatchId:    opts.nextMatchId    ?? undefined,
    nextMatchSlot:  opts.nextMatchSlot  ?? undefined,
    loserMatchId:   opts.loserMatchId   ?? undefined,  // куда падает проигравший
    loserMatchSlot: opts.loserMatchSlot ?? undefined,
  };
}

/**
 * Double Elimination 4 команды:
 *
 * Upper R1: u1, u2
 * Upper R2 (Final): u-final
 * Lower R1: l1 (проигравшие из u1 vs u2)
 * Lower Final: l-final (победитель l1 vs проигравший u-final)
 * Grand Final: grand-final
 */
function generateDoubleElim4() {
  const stages = [
    {
      name: 'Upper Bracket',
      matches: [
        makeMatch('u1', 1, { nextMatchId: 'u-final', nextMatchSlot: 'A', loserMatchId: 'l1', loserMatchSlot: 'A' }),
        makeMatch('u2', 1, { nextMatchId: 'u-final', nextMatchSlot: 'B', loserMatchId: 'l1', loserMatchSlot: 'B' }),
        makeMatch('u-final', 2, { nextMatchId: 'grand-final', nextMatchSlot: 'A', loserMatchId: 'l-final', loserMatchSlot: 'B' }),
      ],
    },
    {
      name: 'Lower Bracket',
      matches: [
        makeMatch('l1', 1, { nextMatchId: 'l-final', nextMatchSlot: 'A' }),
        makeMatch('l-final', 2, { nextMatchId: 'grand-final', nextMatchSlot: 'B' }),
      ],
    },
    {
      name: 'Grand Final',
      matches: [
        makeMatch('grand-final', 1, { isFinal: true, isGrandFinal: true }),
      ],
    },
  ];

  return { type: 'double', stages };
}

/**
 * Double Elimination 8 команд:
 *
 * Upper R1: u1-u4 (4 матча)
 * Upper R2: u5-u6 (2 матча, победители u1-u4)
 * Upper Final: u-final (победители u5-u6)
 * Lower R1: l1-l2 (проигравшие из Upper R1 — пары)
 * Lower R2: l3-l4 (победители l1-l2 vs проигравшие Upper R2)
 * Lower Semis: l5 (победители l3 vs l4)
 * Lower Final: l-final (победитель l5 vs проигравший u-final)
 * Grand Final: grand-final
 */
function generateDoubleElim8() {
  const stages = [
    {
      name: 'Upper Bracket',
      matches: [
        // Round 1
        makeMatch('u1', 1, { nextMatchId: 'u5', nextMatchSlot: 'A', loserMatchId: 'l1', loserMatchSlot: 'A' }),
        makeMatch('u2', 1, { nextMatchId: 'u5', nextMatchSlot: 'B', loserMatchId: 'l1', loserMatchSlot: 'B' }),
        makeMatch('u3', 1, { nextMatchId: 'u6', nextMatchSlot: 'A', loserMatchId: 'l2', loserMatchSlot: 'A' }),
        makeMatch('u4', 1, { nextMatchId: 'u6', nextMatchSlot: 'B', loserMatchId: 'l2', loserMatchSlot: 'B' }),
        // Round 2
        makeMatch('u5', 2, { nextMatchId: 'u-final', nextMatchSlot: 'A', loserMatchId: 'l3', loserMatchSlot: 'B' }),
        makeMatch('u6', 2, { nextMatchId: 'u-final', nextMatchSlot: 'B', loserMatchId: 'l4', loserMatchSlot: 'B' }),
        // Upper Final
        makeMatch('u-final', 3, { nextMatchId: 'grand-final', nextMatchSlot: 'A', loserMatchId: 'l-final', loserMatchSlot: 'B' }),
      ],
    },
    {
      name: 'Lower Bracket',
      matches: [
        // Round 1 — проигравшие из Upper R1
        makeMatch('l1', 1, { nextMatchId: 'l3', nextMatchSlot: 'A' }),
        makeMatch('l2', 1, { nextMatchId: 'l4', nextMatchSlot: 'A' }),
        // Round 2 — победители Lower R1 vs проигравшие Upper R2
        makeMatch('l3', 2, { nextMatchId: 'l5', nextMatchSlot: 'A' }),
        makeMatch('l4', 2, { nextMatchId: 'l5', nextMatchSlot: 'B' }),
        // Semis
        makeMatch('l5', 3, { nextMatchId: 'l-final', nextMatchSlot: 'A' }),
        // Lower Final
        makeMatch('l-final', 4, { nextMatchId: 'grand-final', nextMatchSlot: 'B' }),
      ],
    },
    {
      name: 'Grand Final',
      matches: [
        makeMatch('grand-final', 1, { isFinal: true, isGrandFinal: true }),
      ],
    },
  ];

  return { type: 'double', stages };
}

/* ─── Group Stage + Playoff ────────────────────────────────────── */

/**
 * Генерирует групповой этап + плейофф.
 *
 * @param {object} opts
 * @param {number} opts.groupCount       — количество групп (2, 4)
 * @param {number} opts.teamsPerGroup    — команд в группе (4, 6, 8)
 * @param {number} opts.advancingPerGroup — выходит из группы (1, 2)
 * @returns {object} bracket-объект
 */
function generateGroupStagePlayoff({ groupCount, teamsPerGroup, advancingPerGroup }) {
  if (![2, 4].includes(groupCount)) {
    throw new Error(`Group Stage: поддерживается 2/4 группы, получено: ${groupCount}`);
  }
  if (![4, 6, 8].includes(teamsPerGroup)) {
    throw new Error(`Group Stage: поддерживается 4/6/8 команд в группе, получено: ${teamsPerGroup}`);
  }
  if (![1, 2].includes(advancingPerGroup)) {
    throw new Error(`Group Stage: из группы выходит 1 или 2 команды, получено: ${advancingPerGroup}`);
  }

  const stages       = [];
  const groupLetters = ['A', 'B', 'C', 'D'];
  let   matchCounter = 1;

  // Генерируем группы (round-robin: каждый с каждым)
  for (let g = 0; g < groupCount; g++) {
    const groupName = `Группа ${groupLetters[g]}`;
    const matches   = [];
    const teamSlots = Array.from({ length: teamsPerGroup }, (_, i) => `${groupLetters[g]}${i + 1}`);

    // Round-robin: каждая пара встречается один раз
    let round = 1;
    for (let i = 0; i < teamsPerGroup; i++) {
      for (let j = i + 1; j < teamsPerGroup; j++) {
        matches.push({
          id:          `g${groupLetters[g]}-m${matchCounter++}`,
          round,
          isFinal:     false,
          groupMatch:  true,
          teamA:       teamSlots[i],
          teamB:       teamSlots[j],
          scoreA:      0,
          scoreB:      0,
          status:      'scheduled',
          winner:      null,
          scheduledAt: null,
        });
        // Новый раунд каждые teamsPerGroup/2 матчей (приблизительно)
        if (matches.length % Math.ceil(teamsPerGroup / 2) === 0) round++;
      }
    }

    stages.push({ name: groupName, matches, isGroup: true });
  }

  // Генерируем плейофф
  const advancingTotal = groupCount * advancingPerGroup;
  // Ближайшая степень двойки для плейоффа
  const playoffSize = Math.pow(2, Math.ceil(Math.log2(advancingTotal)));
  const playoffRounds = Math.log2(playoffSize);

  const playoffMatches  = [];
  const playoffIdxByRound = {};

  for (let round = 1; round <= playoffRounds; round++) {
    const count = playoffSize / Math.pow(2, round);
    playoffIdxByRound[round] = [];
    for (let i = 0; i < count; i++) {
      playoffIdxByRound[round].push(`p${matchCounter++}`);
    }
  }

  for (let round = 1; round <= playoffRounds; round++) {
    const ids     = playoffIdxByRound[round];
    const isFinal = round === playoffRounds;
    const nextIds = playoffIdxByRound[round + 1] || [];

    ids.forEach((id, idx) => {
      const m = {
        id,
        round,
        isFinal,
        teamA:       'TBD',
        teamB:       'TBD',
        scoreA:      0,
        scoreB:      0,
        status:      'scheduled',
        winner:      null,
        scheduledAt: null,
      };
      if (!isFinal) {
        m.nextMatchId   = nextIds[Math.floor(idx / 2)];
        m.nextMatchSlot = idx % 2 === 0 ? 'A' : 'B';
      }
      playoffMatches.push(m);
    });
  }

  stages.push({ name: 'Плейофф', matches: playoffMatches });

  return { type: 'group', stages };
}

/* ─── Посев команд (seed) ──────────────────────────────────────── */

/**
 * Получить список свободных слотов в bracket.
 * Возвращает [{matchId, slot, currentValue}] где currentValue === 'TBD'.
 */
/**
 * Вернуть только стартовые слоты для посева команд.
 *
 * Правило: заполняются вручную ТОЛЬКО первый раунд ПЕРВОЙ
 * не-групповой и не-Swiss стадии.
 *
 * Обоснование:
 * - Группы (isGroup) используют алиасные имена A1/B2 — не TBD-слоты
 * - Swiss (isSwiss) первый раунд уже имеет сгенерированные "Команда N"
 * - Double Elimination — у него несколько "первых" стадий (Upper, Lower).
 *   Нужна только Upper Bracket (первая по порядку стадия)
 * - Слоты поздних раундов заполняются движком автоматически
 *
 * @param {object|null} bracket
 * @returns {Array<{matchId, slot, stageName, round}>}
 */
function getEmptySlots(bracket) {
  const slots = [];
  if (!bracket?.stages) return slots;

  // Ищем ПЕРВУЮ стадию которую нужно засеивать вручную
  // (не группа, не Swiss)
  const seedableStage = bracket.stages.find(
    s => !s.isGroup && !s.isSwiss && s.matches && s.matches.length > 0
  );

  if (!seedableStage) return slots;

  const matches  = seedableStage.matches;
  const minRound = Math.min(...matches.map(m => m.round ?? 1));
  const startMatches = matches.filter(m => (m.round ?? 1) === minRound);

  for (const m of startMatches) {
    if (!m.teamA || m.teamA === 'TBD') {
      slots.push({ matchId: m.id, slot: 'A', stageName: seedableStage.name, round: minRound });
    }
    if (!m.teamB || m.teamB === 'TBD') {
      slots.push({ matchId: m.id, slot: 'B', stageName: seedableStage.name, round: minRound });
    }
  }

  return slots;
}

/**
 * Вписать команду в конкретный слот.
 * Мутирует bracket in-place.
 */
function seedTeamInSlot(bracket, matchId, slot, teamName) {
  if (!bracket?.stages) throw new Error('bracket не содержит stages');
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.id === matchId) {
        if (slot === 'A') {
          m.teamA = teamName;
        } else if (slot === 'B') {
          m.teamB = teamName;
        } else {
          throw new Error(`Неверный слот: "${slot}". Допустимые: A, B`);
        }
        return true;
      }
    }
  }
  throw new Error(`Матч "${matchId}" не найден в сетке`);
}

/**
 * Валидация сгенерированной сетки — проверяем совместимость с bracket-engine.
 * Возвращает массив ошибок (пустой = OK).
 */
function validateGeneratedBracket(bracket) {
  const errors = [];
  if (!bracket?.stages?.length) {
    errors.push('bracket.stages пуст');
    return errors;
  }

  const allIds  = new Set();
  const finals  = [];

  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (!m.id)    { errors.push(`Матч без id в стадии "${stage.name}"`); continue; }
      if (allIds.has(m.id)) errors.push(`Дублирующийся id матча: "${m.id}"`);
      allIds.add(m.id);
      if (m.isFinal) finals.push(m.id);
    }
  }

  // Проверяем ссылки nextMatchId
  for (const stage of bracket.stages) {
    for (const m of (stage.matches || [])) {
      if (m.nextMatchId && !allIds.has(m.nextMatchId)) {
        errors.push(`Матч "${m.id}": nextMatchId "${m.nextMatchId}" не существует`);
      }
    }
  }

  if (finals.length === 0) errors.push('Нет матча с isFinal: true');
  if (finals.length > 1)   errors.push(`Несколько финальных матчей: ${finals.join(', ')}`);

  return errors;
}


/* ─── Swiss Stage ──────────────────────────────────────────────── */

/**
 * Генерирует Swiss Stage bracket.
 *
 * Swiss система: все команды начинают вместе, после каждого раунда
 * команды с одинаковым счётом побед играют друг с другом.
 * Нет выбывания до накопления нужного кол-ва побед/поражений.
 *
 * @param {object} opts
 * @param {number} opts.teamCount     — количество команд (8, 16)
 * @param {number} opts.winsToAdvance — побед для выхода (default: 3)
 * @param {number} opts.lossesToElim  — поражений для выбывания (default: 3)
 * @returns {object} bracket-объект
 */
function generateSwissStage({ teamCount = 8, winsToAdvance = 3, lossesToElim = 3 } = {}) {
  if (![8, 16].includes(teamCount)) {
    throw new Error(`Swiss Stage: поддерживается 8/16 команд, получено: ${teamCount}`);
  }

  // Swiss по природе динамический — пары определяются после каждого раунда.
  // В структуре данных представляем раунды как "слои" матчей,
  // где конкретные команды TBD кроме первого раунда.
  // Первый раунд: случайные пары (по порядку слотов).
  // Раунды 2+: TBD, заполняются организатором через /match после раунда.

  const totalRounds = winsToAdvance + lossesToElim - 1;
  const matchesPerRound = Math.floor(teamCount / 2);

  const stages = [];
  let matchCounter = 1;

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = [];
    const isFirstRound = round === 1;

    for (let i = 0; i < matchesPerRound; i++) {
      roundMatches.push({
        id:          `sw${matchCounter++}`,
        round,
        isFinal:     false,
        swissRound:  round,
        teamA:       isFirstRound ? `Команда ${i * 2 + 1}` : 'TBD',
        teamB:       isFirstRound ? `Команда ${i * 2 + 2}` : 'TBD',
        scoreA:      0,
        scoreB:      0,
        status:      'scheduled',
        winner:      null,
        scheduledAt: null,
      });
    }

    stages.push({
      name:        `Swiss Раунд ${round}`,
      swissRound:  round,
      isSwiss:     true,
      matches:     roundMatches,
    });
  }

  // Финальный матч Swiss (не isFinal — это просто последний раунд)
  // Реальный финал идёт в отдельном плейоффе если есть
  // Добавляем фиктивный isFinal чтобы bracket-engine был доволен
  const lastStage = stages[stages.length - 1];
  if (lastStage?.matches?.length) {
    lastStage.matches[0].isFinal = true;
  }

  return {
    type:          'swiss',
    winsToAdvance,
    lossesToElim,
    stages,
  };
}

module.exports = {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStagePlayoff,
  generateSwissStage,
  getEmptySlots,
  seedTeamInSlot,
  validateGeneratedBracket,
};
