'use strict';

const {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStagePlayoff,
  generateSwissStage,
  getEmptySlots,
  seedTeamInSlot,
  validateGeneratedBracket,
} = require('../../workflows/bracketGenerator');
const { loadBracketEngine }  = require('../../data/bracketEngineBridge');
const { enqueueCommit }      = require('../../github/commitQueue');
const { buildJsMutateFn, findTournamentById, parseJsDataFile } = require('../../data/jsDataFile');
const { getFile }            = require('../../github/client');
const { logAction }          = require('../../activityLog/logger');
const { canManageTournament } = require('../middleware/tournamentAuth');
const REPO_PATHS             = require('../../github/repoPaths');
const config                 = require('../../config');
const log                    = require('../../logger');

const WIZARD_TTL_MS = 10 * 60 * 1000;

/* ─── Типы стадий ──────────────────────────────────────────────── */
const STAGE_TYPES = {
  '1': { key: 'single', label: 'Single Elimination' },
  '2': { key: 'double', label: 'Double Elimination' },
  '3': { key: 'group',  label: 'Group Stage' },
  '4': { key: 'swiss',  label: 'Swiss Stage' },
};

/* ─── Wizard состояния ─────────────────────────────────────────── */
const bracketWizards = new Map();

function isExpired(state) {
  return Date.now() - state.startedAt > WIZARD_TTL_MS;
}

/* ─── Загрузка турнира из GitHub ───────────────────────────────── */
async function loadTournament(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const tournament  = findTournamentById(tournaments, tournamentId);
  if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
  return tournament;
}

/* ─── /createbracket ───────────────────────────────────────────── */

async function createBracketCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply(
      '❌ Укажите id турнира.\n\n' +
      'Использование: <code>/createbracket &lt;tournamentId&gt;</code>',
      { parse_mode: 'HTML' }
    );
  }

  await ctx.sendChatAction('typing');

  // Проверяем существование турнира и права
  let tournament;
  try {
    tournament = await loadTournament(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const userId = ctx.from?.id;
  const access = canManageTournament(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(
      `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`,
      { parse_mode: 'HTML' }
    );
  }

  // Если сетка уже есть — проверяем наличие сыгранных матчей
  if (tournament.bracket?.stages?.length) {
    const hasPlayed = tournament.bracket.stages
      .flatMap(s => s.matches || [])
      .some(m => m.status !== 'scheduled');

    if (hasPlayed) {
      return ctx.reply(
        `⚠️ У турнира <code>${tournamentId}</code> есть сетка с сыгранными матчами.\n\n` +
        `Пересоздание запрещено — это уничтожит результаты.\n\n` +
        `Для исправления отдельного матча: <code>/forcematch ${tournamentId} &lt;matchId&gt; &lt;счёт&gt;</code>`,
        { parse_mode: 'HTML' }
      );
    }

    // Сетка есть, матчи не сыграны — спрашиваем подтверждение
    bracketWizards.set(userId, {
      step: 'confirm_overwrite',
      tournamentId,
      startedAt: Date.now(),
      stageCount: 0,
      stages: [],    // [{type, params}]
      currentStage: 0,
    });

    return ctx.reply(
      `⚠️ У турнира <code>${tournamentId}</code> уже есть сетка.\n\n` +
      `Пересоздать? Напишите <b>да</b> или <b>нет</b>.`,
      { parse_mode: 'HTML' }
    );
  }

  // Запускаем wizard
  bracketWizards.set(userId, {
    step: 'choose_stage_count',
    tournamentId,
    startedAt: Date.now(),
    stageCount: 0,
    stages: [],
    currentStage: 0,
  });

  await askStageCount(ctx, tournamentId);
}

async function askStageCount(ctx, tournamentId) {
  await ctx.reply(
    `🏗 <b>Создание сетки</b> · <code>${tournamentId}</code>\n\n` +
    `Сколько этапов в турнире?\n\n` +
    `<i>Примеры:\n` +
    `• 1 — только финальный плейофф\n` +
    `• 2 — групповой этап + плейофф\n` +
    `• 3 — группа → группа → плейофф</i>\n\n` +
    `Введите число от 1 до 4:`,
    { parse_mode: 'HTML' }
  );
}

async function askStageType(ctx, state) {
  const n = state.currentStage + 1;
  await ctx.reply(
    `📋 <b>Этап ${n} из ${state.stageCount}</b>\n\n` +
    `Выберите тип:\n\n` +
    `<b>1</b> — Single Elimination\n` +
    `<b>2</b> — Double Elimination\n` +
    `<b>3</b> — Group Stage\n` +
    `<b>4</b> — Swiss Stage\n\n` +
    `Введите номер:`,
    { parse_mode: 'HTML' }
  );
}

/* ─── Обработчик текста wizard ─────────────────────────────────── */

async function processBracketWizardText(ctx) {
  const userId = ctx.from?.id;
  const state  = bracketWizards.get(userId);
  if (!state || isExpired(state)) { bracketWizards.delete(userId); return false; }

  const text = (ctx.message?.text || '').trim().toLowerCase();

  if (text === '/cancel') {
    bracketWizards.delete(userId);
    await ctx.reply('❌ Создание сетки отменено.');
    return true;
  }

  switch (state.step) {
    case 'confirm_overwrite':   return handleConfirmOverwrite(ctx, state, userId, text);
    case 'choose_stage_count':  return handleStageCount(ctx, state, userId, text);
    case 'choose_stage_type':   return handleStageType(ctx, state, userId, text);
    case 'choose_team_count':   return handleTeamCount(ctx, state, userId, text);
    case 'choose_group_count':  return handleGroupCount(ctx, state, userId, text);
    case 'choose_teams_per_group': return handleTeamsPerGroup(ctx, state, userId, text);
    case 'choose_advancing':    return handleAdvancing(ctx, state, userId, text);
    case 'choose_swiss_teams':  return handleSwissTeams(ctx, state, userId, text);
    case 'choose_swiss_wins':   return handleSwissWins(ctx, state, userId, text);
    default:
      bracketWizards.delete(userId);
      return false;
  }
}

async function handleConfirmOverwrite(ctx, state, userId, text) {
  if (['да', 'yes', '+'].includes(text)) {
    state.step = 'choose_stage_count';
    await askStageCount(ctx, state.tournamentId);
  } else {
    bracketWizards.delete(userId);
    await ctx.reply('Отменено. Существующая сетка не изменена.');
  }
  return true;
}

async function handleStageCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (isNaN(n) || n < 1 || n > 4) {
    await ctx.reply('❌ Введите число от 1 до 4:', { parse_mode: 'HTML' });
    return true;
  }
  state.stageCount = n;
  state.currentStage = 0;
  state.step = 'choose_stage_type';
  await askStageType(ctx, state);
  return true;
}

async function handleStageType(ctx, state, userId, text) {
  const choice = STAGE_TYPES[text];
  if (!choice) {
    await ctx.reply('❌ Введите 1, 2, 3 или 4:', { parse_mode: 'HTML' });
    return true;
  }

  // Начинаем собирать параметры для этой стадии
  state.currentStageType = choice.key;
  state.stages[state.currentStage] = { type: choice.key, label: choice.label };

  // Запрашиваем параметры в зависимости от типа
  if (choice.key === 'single' || choice.key === 'double') {
    const allowed = choice.key === 'double' ? '4 или 8' : '4, 8, 16 или 32';
    state.step = 'choose_team_count';
    await ctx.reply(
      `👥 <b>${choice.label}</b>\n\nКоличество команд (${allowed}):`,
      { parse_mode: 'HTML' }
    );
  } else if (choice.key === 'group') {
    state.step = 'choose_group_count';
    await ctx.reply(
      `🗂 <b>Group Stage</b>\n\nКоличество групп (2 или 4):`,
      { parse_mode: 'HTML' }
    );
  } else if (choice.key === 'swiss') {
    state.step = 'choose_swiss_teams';
    await ctx.reply(
      `🔄 <b>Swiss Stage</b>\n\nКоличество команд (8 или 16):`,
      { parse_mode: 'HTML' }
    );
  }
  return true;
}

async function handleTeamCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  const allowed = state.currentStageType === 'double' ? [4, 8] : [4, 8, 16, 32];
  if (!allowed.includes(n)) {
    await ctx.reply(`❌ Допустимые значения: ${allowed.join(', ')}:`, { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].teamCount = n;
  return advanceToNextStage(ctx, state, userId);
}

async function handleGroupCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![2, 4].includes(n)) {
    await ctx.reply('❌ Введите 2 или 4:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].groupCount = n;
  state.step = 'choose_teams_per_group';
  await ctx.reply('👥 Команд в каждой группе (4, 6 или 8):', { parse_mode: 'HTML' });
  return true;
}

async function handleTeamsPerGroup(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![4, 6, 8].includes(n)) {
    await ctx.reply('❌ Введите 4, 6 или 8:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].teamsPerGroup = n;
  state.step = 'choose_advancing';
  await ctx.reply('🎯 Сколько команд выходит из каждой группы (1 или 2):', { parse_mode: 'HTML' });
  return true;
}

async function handleAdvancing(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![1, 2].includes(n)) {
    await ctx.reply('❌ Введите 1 или 2:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].advancingPerGroup = n;
  return advanceToNextStage(ctx, state, userId);
}

async function handleSwissTeams(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![8, 16].includes(n)) {
    await ctx.reply('❌ Введите 8 или 16:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].teamCount = n;
  state.step = 'choose_swiss_wins';
  await ctx.reply(
    '🎯 Побед для выхода из Swiss (обычно 3):\n\n' +
    'Введите число или /skip для значения по умолчанию (3):',
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handleSwissWins(ctx, state, userId, text) {
  const isSkip = text === '/skip';
  const n = isSkip ? 3 : parseInt(text, 10);
  if (!isSkip && (isNaN(n) || n < 2 || n > 5)) {
    await ctx.reply('❌ Введите число от 2 до 5 или /skip:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].winsToAdvance = n;
  state.stages[state.currentStage].lossesToElim  = n; // симметрично
  return advanceToNextStage(ctx, state, userId);
}

/**
 * Переходим к следующей стадии или финализируем если все стадии собраны.
 */
async function advanceToNextStage(ctx, state, userId) {
  state.currentStage++;

  if (state.currentStage < state.stageCount) {
    state.step = 'choose_stage_type';
    await askStageType(ctx, state);
    return true;
  }

  // Все стадии собраны — показываем итог и создаём
  await finalizeBracket(ctx, state, userId);
  return true;
}

/**
 * Генерирует bracket из собранных стадий и коммитит в data.js.
 */
async function finalizeBracket(ctx, state, userId) {
  bracketWizards.delete(userId);
  await ctx.sendChatAction('typing');

  const { tournamentId, stages } = state;

  try {
    // Показываем итоговый план
    const plan = stages.map((s, i) => `  ${i+1}. ${s.label}`).join('\n');
    log.info({ tournamentId, stages: stages.map(s=>s.type) }, 'createBracket: финализация');

    // Генерируем bracket для каждой стадии и объединяем.
    // При объединении нескольких стадий нужно:
    // 1. Переименовать id матчей чтобы не было дублей между стадиями
    // 2. Обновить nextMatchId-ссылки после переименования
    // 3. isFinal=true оставить только в последней стадии (последний финальный матч)
    const allStages = [];
    let matchIdCounter = 1;

    for (const stageConfig of stages) {
      let generated;

      if (stageConfig.type === 'single') {
        generated = generateSingleElimination(stageConfig.teamCount);
      } else if (stageConfig.type === 'double') {
        generated = generateDoubleElimination(stageConfig.teamCount);
      } else if (stageConfig.type === 'group') {
        generated = generateGroupStagePlayoff({
          groupCount:        stageConfig.groupCount,
          teamsPerGroup:     stageConfig.teamsPerGroup,
          advancingPerGroup: stageConfig.advancingPerGroup,
        });
      } else if (stageConfig.type === 'swiss') {
        generated = generateSwissStage({
          teamCount:    stageConfig.teamCount,
          winsToAdvance:stageConfig.winsToAdvance || 3,
          lossesToElim: stageConfig.lossesToElim  || 3,
        });
      }

      // Переименовываем id матчей внутри каждой сгенерированной стадии
      // чтобы гарантировать глобальную уникальность при объединении
      for (const stage of generated.stages) {
        // Строим карту переименований: oldId → newId
        const idMap = {};
        for (const m of (stage.matches || [])) {
          const newId = `s${stages.indexOf(stageConfig)+1}m${matchIdCounter++}`;
          idMap[m.id] = newId;
          m.id = newId;
        }
        // Обновляем ссылки nextMatchId/loserMatchId
        for (const m of (stage.matches || [])) {
          if (m.nextMatchId  && idMap[m.nextMatchId])  m.nextMatchId  = idMap[m.nextMatchId];
          if (m.loserMatchId && idMap[m.loserMatchId]) m.loserMatchId = idMap[m.loserMatchId];
        }
        // isFinal пока убираем у всех — проставим только в последней стадии ниже
        for (const m of (stage.matches || [])) {
          m.isFinal = false;
        }
        allStages.push(stage);
      }
    }

    // Проставляем isFinal только в ПОСЛЕДНЕЙ стадии (последний финал)
    // Ищем финальный матч последней стадии по старой логике: у него нет nextMatchId
    const lastStage = allStages[allStages.length - 1];
    if (lastStage?.matches?.length) {
      // Среди матчей без nextMatchId берём самый "поздний" (максимальный round)
      const noNext = lastStage.matches.filter(m => !m.nextMatchId);
      if (noNext.length) {
        const maxRound = Math.max(...noNext.map(m => m.round ?? 1));
        const finalMatch = noNext.find(m => (m.round ?? 1) === maxRound);
        if (finalMatch) finalMatch.isFinal = true;
      }
    }

    // Если несколько типов — используем 'multi', иначе тип первой стадии
    const bracketType = stages.length === 1 ? stages[0].type : 'multi';
    const bracket = { type: bracketType, stages: allStages };

    // Валидация
    const errors = validateGeneratedBracket(bracket);
    if (errors.length) throw new Error(`Ошибки сетки:\n${errors.join('\n')}`);

    const totalMatches = allStages.reduce((a, s) => a + (s.matches?.length || 0), 0);

    // Коммитим
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const tournament = findTournamentById(tournaments, tournamentId);
        if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
        tournament.bracket = bracket;
        return tournaments;
      },
      `bracket: ${tournamentId} — ${stages.map(s=>s.label).join(' → ')} (${totalMatches} матчей)`,
    );

    const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    try {
      await logAction({
        actorTelegramId: userId,
        actorRole:       ctx.userRole || 'admin',
        action:     'bracket.created',
        targetType: 'tournament',
        targetId:   tournamentId,
        details:    { stages: stages.map(s=>s.type), totalMatches, commitSha },
      });
    } catch (_) {}

    await ctx.reply(
      `✅ <b>Сетка создана!</b>\n\n` +
      `Турнир: <code>${tournamentId}</code>\n` +
      `Этапы:\n${plan}\n` +
      `Матчей всего: ${totalMatches}\n\n` +
      `Назначить команды: <code>/seed ${tournamentId}</code>\n` +
      `Просмотр: <code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'createBracket: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/* ─── /seed ────────────────────────────────────────────────────── */

const seedStates = new Map();

async function seedCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply(
      '❌ Укажите id турнира.\n\n' +
      'Использование: <code>/seed &lt;tournamentId&gt;</code>',
      { parse_mode: 'HTML' }
    );
  }

  await ctx.sendChatAction('typing');

  let tournament;
  try {
    tournament = await loadTournament(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  // Проверяем права
  const userId = ctx.from?.id;
  const access = canManageTournament(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(
      `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`,
      { parse_mode: 'HTML' }
    );
  }

  if (!tournament.bracket?.stages?.length) {
    return ctx.reply(
      `❌ У турнира <code>${tournamentId}</code> нет сетки.\n\n` +
      `Создайте сначала: <code>/createbracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  // Только первый раунд каждой стадии
  const slots = getEmptySlots(tournament.bracket);

  if (slots.length === 0) {
    return ctx.reply(
      `✅ Все стартовые слоты турнира <code>${tournamentId}</code> заполнены.\n\n` +
      `Просмотр сетки: <code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const lines = slots.map((s, i) =>
    `${i+1}. Матч <code>${s.matchId}</code> · слот <b>${s.slot}</b> [${s.stageName}]`
  );

  seedStates.set(userId, {
    tournamentId,
    slots,
    current:   0,
    startedAt: Date.now(),
  });

  await ctx.reply(
    `🎯 <b>Посев команд</b> · <code>${tournamentId}</code>\n\n` +
    `Стартовые слоты (${slots.length}):\n${lines.join('\n')}\n\n` +
    `Заполняем по очереди. /skip — пропустить, /cancel — отменить.\n\n` +
    `<b>Слот 1:</b> матч <code>${slots[0].matchId}</code>, позиция <b>${slots[0].slot}</b>`,
    { parse_mode: 'HTML' }
  );
}

async function processSeedText(ctx) {
  const userId = ctx.from?.id;
  const state  = seedStates.get(userId);
  if (!state || Date.now() - state.startedAt > WIZARD_TTL_MS) {
    seedStates.delete(userId);
    return false;
  }

  const text = (ctx.message?.text || '').trim();

  if (text === '/cancel') {
    seedStates.delete(userId);
    await ctx.reply('❌ Посев отменён.');
    return true;
  }

  const slot = state.slots[state.current];

  if (text === '/skip') {
    state.current++;
    if (state.current >= state.slots.length) {
      seedStates.delete(userId);
      await ctx.reply(
        `✅ Посев завершён.\n\nПросмотр: <code>/bracket ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `⏭ Пропущено.\n\n<b>Слот ${state.current+1}/${state.slots.length}:</b> ` +
        `матч <code>${next.matchId}</code>, позиция <b>${next.slot}</b>`,
        { parse_mode: 'HTML' }
      );
    }
    return true;
  }

  await ctx.sendChatAction('typing');

  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, state.tournamentId);
        if (!t?.bracket) throw new Error('Сетка не найдена');
        seedTeamInSlot(t.bracket, slot.matchId, slot.slot, text);
        return tournaments;
      },
      `seed: ${state.tournamentId}/${slot.matchId}[${slot.slot}] = "${text}"`,
    );

    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    state.current++;

    if (state.current >= state.slots.length) {
      seedStates.delete(userId);

      try {
        await logAction({
          actorTelegramId: userId,
          actorRole:       ctx.userRole || 'admin',
          action:     'bracket.seeded',
          targetType: 'tournament',
          targetId:   state.tournamentId,
          details:    { totalSlots: state.slots.length },
        });
      } catch (_) {}

      await ctx.reply(
        `✅ <b>Посев завершён!</b>\n\n` +
        `Последний слот: <code>${slot.matchId}</code>[${slot.slot}] = <b>${text}</b>\n\n` +
        `Просмотр: <code>/bracket ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `✅ <b>${text}</b> → <code>${slot.matchId}</code>[${slot.slot}]\n\n` +
        `<b>Слот ${state.current+1}/${state.slots.length}:</b> ` +
        `матч <code>${next.matchId}</code>, позиция <b>${next.slot}</b>`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  return true;
}

async function processBracketOrSeedText(ctx) {
  const bHandled = await processBracketWizardText(ctx);
  if (bHandled) return true;
  return processSeedText(ctx);
}

module.exports = {
  createBracketCommand,
  seedCommand,
  processBracketOrSeedText,
};
