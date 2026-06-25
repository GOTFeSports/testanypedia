'use strict';

const {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStagePlayoff,
  getEmptySlots,
  seedTeamInSlot,
  validateGeneratedBracket,
} = require('../../workflows/bracketGenerator');
const { loadBracketEngine } = require('../../data/bracketEngineBridge');
const { enqueueCommit }     = require('../../github/commitQueue');
const { buildJsMutateFn, findTournamentById } = require('../../data/jsDataFile');
const { getFile }           = require('../../github/client');
const { parseJsDataFile }   = require('../../data/jsDataFile');
const { logAction }         = require('../../activityLog/logger');
const REPO_PATHS            = require('../../github/repoPaths');
const log                   = require('../../logger');

/* ─── wizard состояния ─────────────────────────────────────────── */

const bracketWizards = new Map(); // userId → WizardState
const WIZARD_TTL_MS  = 10 * 60 * 1000;

function isExpired(state) {
  return Date.now() - state.startedAt > WIZARD_TTL_MS;
}

/* ─── /createbracket ───────────────────────────────────────────── */

async function createBracketCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply(
      '❌ Укажите id турнира.\n\n' +
      'Использование: <code>/createbracket &lt;tournamentId&gt;</code>\n\n' +
      'Пример: <code>/createbracket SkewerEsports-Season-3</code>',
      { parse_mode: 'HTML' }
    );
  }

  await ctx.sendChatAction('typing');

  // Проверяем существование турнира и наличие существующей сетки
  let existingBracket = null;
  try {
    const file = await getFile(REPO_PATHS.DATA_JS);
    if (!file) throw new Error('data.js не найден');
    const tournaments = parseJsDataFile(file.content, 'tournaments');
    const tournament  = findTournamentById(tournaments, tournamentId);
    if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден в data.js`);
    existingBracket = tournament.bracket ?? null;
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  // Предупреждение если сетка уже есть
  if (existingBracket?.stages?.length) {
    // Проверяем есть ли уже сыгранные матчи
    const hasPlayedMatches = existingBracket.stages
      .flatMap(s => s.matches || [])
      .some(m => m.status !== 'scheduled');

    if (hasPlayedMatches) {
      return ctx.reply(
        `⚠️ У турнира <code>${tournamentId}</code> уже есть сетка с сыгранными матчами.\n\n` +
        `Пересоздание сетки уничтожит результаты матчей. Это запрещено.\n\n` +
        `Если нужно исправить отдельный матч — используйте /forcematch.`,
        { parse_mode: 'HTML' }
      );
    }

    // Сетка есть но матчи не сыграны — спрашиваем подтверждение
    bracketWizards.set(ctx.from.id, {
      step:         'confirm_overwrite',
      tournamentId,
      startedAt:    Date.now(),
      data:         {},
    });

    return ctx.reply(
      `⚠️ У турнира <code>${tournamentId}</code> уже есть сетка (матчи не сыграны).\n\n` +
      `Вы уверены что хотите её пересоздать?\n\n` +
      `Напишите <b>да</b> для подтверждения или <b>нет</b> для отмены.`,
      { parse_mode: 'HTML' }
    );
  }

  // Запускаем wizard выбора типа сетки
  bracketWizards.set(ctx.from.id, {
    step:         'choose_type',
    tournamentId,
    startedAt:    Date.now(),
    data:         {},
  });

  return askBracketType(ctx, tournamentId);
}

async function askBracketType(ctx, tournamentId) {
  await ctx.reply(
    `🏗 <b>Создание сетки для</b> <code>${tournamentId}</code>\n\n` +
    `Выберите тип сетки:\n\n` +
    `<b>1</b> — Single Elimination\n` +
    `<b>2</b> — Double Elimination\n` +
    `<b>3</b> — Group Stage + Playoff\n\n` +
    `Введите номер (1, 2 или 3):`,
    { parse_mode: 'HTML' }
  );
}

/* ─── Обработчик текстовых сообщений wizard ────────────────────── */

async function processBracketWizardText(ctx) {
  const userId = ctx.from?.id;
  const state  = bracketWizards.get(userId);

  if (!state || isExpired(state)) {
    bracketWizards.delete(userId);
    return false;
  }

  const text = (ctx.message?.text || '').trim().toLowerCase();

  // Отмена
  if (text === '/cancel') {
    bracketWizards.delete(userId);
    await ctx.reply('❌ Создание сетки отменено.');
    return true;
  }

  switch (state.step) {
    case 'confirm_overwrite':
      return handleConfirmOverwrite(ctx, state, userId, text);
    case 'choose_type':
      return handleChooseType(ctx, state, userId, text);
    case 'choose_team_count':
      return handleChooseTeamCount(ctx, state, userId, text);
    case 'choose_group_count':
      return handleChooseGroupCount(ctx, state, userId, text);
    case 'choose_teams_per_group':
      return handleChooseTeamsPerGroup(ctx, state, userId, text);
    case 'choose_advancing':
      return handleChooseAdvancing(ctx, state, userId, text);
    default:
      bracketWizards.delete(userId);
      return false;
  }
}

async function handleConfirmOverwrite(ctx, state, userId, text) {
  if (['да', 'yes', '+'].includes(text)) {
    state.step = 'choose_type';
    await askBracketType(ctx, state.tournamentId);
  } else {
    bracketWizards.delete(userId);
    await ctx.reply('❌ Отменено. Существующая сетка не изменена.');
  }
  return true;
}

async function handleChooseType(ctx, state, userId, text) {
  if (text === '1') {
    state.data.type = 'single';
    state.step      = 'choose_team_count';
    await ctx.reply(
      '👥 <b>Single Elimination — количество команд:</b>\n\n' +
      '4, 8, 16, 32 или 64\n\n' +
      'Введите число:',
      { parse_mode: 'HTML' }
    );
  } else if (text === '2') {
    state.data.type = 'double';
    state.step      = 'choose_team_count';
    await ctx.reply(
      '👥 <b>Double Elimination — количество команд:</b>\n\n' +
      '4 или 8\n\n' +
      'Введите число:',
      { parse_mode: 'HTML' }
    );
  } else if (text === '3') {
    state.data.type = 'group';
    state.step      = 'choose_group_count';
    await ctx.reply(
      '🗂 <b>Количество групп:</b>\n\n' +
      '2 или 4\n\n' +
      'Введите число:',
      { parse_mode: 'HTML' }
    );
  } else {
    await ctx.reply('❌ Введите 1, 2 или 3.', { parse_mode: 'HTML' });
  }
  return true;
}

async function handleChooseTeamCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  const allowed = state.data.type === 'double' ? [4, 8] : [4, 8, 16, 32, 64];

  if (!allowed.includes(n)) {
    await ctx.reply(
      `❌ Допустимые значения: ${allowed.join(', ')}. Введите число:`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  state.data.teamCount = n;
  await finalizeBracketCreation(ctx, state, userId);
  return true;
}

async function handleChooseGroupCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![2, 4].includes(n)) {
    await ctx.reply('❌ Введите 2 или 4.', { parse_mode: 'HTML' });
    return true;
  }
  state.data.groupCount = n;
  state.step = 'choose_teams_per_group';
  await ctx.reply(
    '👥 <b>Команд в каждой группе:</b>\n\n' +
    '4, 6 или 8\n\n' +
    'Введите число:',
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handleChooseTeamsPerGroup(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![4, 6, 8].includes(n)) {
    await ctx.reply('❌ Введите 4, 6 или 8.', { parse_mode: 'HTML' });
    return true;
  }
  state.data.teamsPerGroup = n;
  state.step = 'choose_advancing';
  await ctx.reply(
    '🎯 <b>Сколько команд выходит из каждой группы:</b>\n\n' +
    '1 или 2\n\n' +
    'Введите число:',
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handleChooseAdvancing(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (![1, 2].includes(n)) {
    await ctx.reply('❌ Введите 1 или 2.', { parse_mode: 'HTML' });
    return true;
  }
  state.data.advancingPerGroup = n;
  await finalizeBracketCreation(ctx, state, userId);
  return true;
}

async function finalizeBracketCreation(ctx, state, userId) {
  bracketWizards.delete(userId);
  await ctx.sendChatAction('typing');

  const { tournamentId, data } = state;

  try {
    // Генерируем сетку
    let bracket;
    if (data.type === 'single') {
      bracket = generateSingleElimination(data.teamCount);
    } else if (data.type === 'double') {
      bracket = generateDoubleElimination(data.teamCount);
    } else {
      bracket = generateGroupStagePlayoff({
        groupCount:        data.groupCount,
        teamsPerGroup:     data.teamsPerGroup,
        advancingPerGroup: data.advancingPerGroup,
      });
    }

    // Валидируем совместимость с bracket-engine
    const errors = validateGeneratedBracket(bracket);
    if (errors.length) {
      throw new Error(`Ошибки валидации сетки:\n${errors.join('\n')}`);
    }

    // Считаем количество матчей для отображения
    const totalMatches = bracket.stages.reduce((acc, s) => acc + (s.matches?.length || 0), 0);
    const stageNames   = bracket.stages.map(s => s.name).join(', ');

    // Коммитим в data.js
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const tournament = findTournamentById(tournaments, tournamentId);
        if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
        tournament.bracket = bracket;
        return tournaments;
      },
      `bracket: создана сетка для "${tournamentId}" (${data.type}, ${totalMatches} матчей)`,
    );

    const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    // Логируем
    try {
      await logAction({
        actorTelegramId: ctx.from.id,
        actorRole:       ctx.userRole,
        action:     'bracket.created',
        targetType: 'tournament',
        targetId:   tournamentId,
        details:    { type: data.type, totalMatches, stageNames, commitSha },
      });
    } catch (logErr) {
      log.error({ logErr: logErr.message }, 'createBracket: ошибка activity-log');
    }

    await ctx.reply(
      `✅ <b>Сетка создана!</b>\n\n` +
      `Турнир: <code>${tournamentId}</code>\n` +
      `Тип: <b>${data.type}</b>\n` +
      `Стадии: ${stageNames}\n` +
      `Матчей: ${totalMatches}\n\n` +
      `Теперь назначьте команды:\n` +
      `<code>/seed ${tournamentId}</code>\n\n` +
      `Или просмотрите сетку:\n` +
      `<code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'createBracket: ошибка генерации');
    await ctx.reply(`❌ Ошибка создания сетки:\n<code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/* ─── /seed ────────────────────────────────────────────────────── */

// Состояния seed-wizard
const seedStates = new Map(); // userId → { tournamentId, slots, current }

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

  try {
    const file = await getFile(REPO_PATHS.DATA_JS);
    const tournaments = parseJsDataFile(file.content, 'tournaments');
    const tournament  = findTournamentById(tournaments, tournamentId);

    if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
    if (!tournament.bracket?.stages?.length) {
      throw new Error(`У турнира "${tournamentId}" нет сетки. Сначала создайте её: /createbracket ${tournamentId}`);
    }

    const slots = getEmptySlots(tournament.bracket);

    if (slots.length === 0) {
      return ctx.reply(
        `✅ Все слоты турнира <code>${tournamentId}</code> уже заполнены.\n\n` +
        `Посмотреть сетку: <code>/bracket ${tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    }

    // Показываем список свободных слотов
    const lines = slots.map((s, i) =>
      `${i + 1}. <code>${s.matchId}</code> слот <b>${s.slot}</b> (${s.stageName})`
    );

    seedStates.set(ctx.from.id, {
      tournamentId,
      slots,
      current:   0,
      startedAt: Date.now(),
    });

    await ctx.reply(
      `🎯 <b>Посев команд для</b> <code>${tournamentId}</code>\n\n` +
      `Свободные слоты (${slots.length}):\n` +
      lines.join('\n') +
      '\n\nЗаполняем по очереди. Введите название команды для первого слота:\n\n' +
      `<b>Слот 1:</b> матч <code>${slots[0].matchId}</code>, позиция <b>${slots[0].slot}</b>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
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
    await ctx.reply('❌ Посев отменён. Уже заполненные слоты сохранены.');
    return true;
  }

  if (text === '/skip') {
    // Пропускаем этот слот
    state.current++;
    if (state.current >= state.slots.length) {
      seedStates.delete(userId);
      await ctx.reply('✅ Посев завершён (некоторые слоты пропущены).\n\nПосмотреть: <code>/bracket ' + state.tournamentId + '</code>', { parse_mode: 'HTML' });
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `⏭ Слот пропущен.\n\n` +
        `<b>Слот ${state.current + 1}/${state.slots.length}:</b> матч <code>${next.matchId}</code>, позиция <b>${next.slot}</b>\n\n` +
        `Введите название команды или /skip:`,
        { parse_mode: 'HTML' }
      );
    }
    return true;
  }

  // Записываем команду в слот через commitQueue
  const slot = state.slots[state.current];
  await ctx.sendChatAction('typing');

  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const tournament = findTournamentById(tournaments, state.tournamentId);
        if (!tournament?.bracket) throw new Error('Сетка не найдена');
        seedTeamInSlot(tournament.bracket, slot.matchId, slot.slot, text);
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
        `✅ <b>Все слоты заполнены!</b>\n\n` +
        `Последний: <code>${slot.matchId}</code>[${slot.slot}] = <b>${text}</b>\n\n` +
        `Посмотреть сетку: <code>/bracket ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `✅ <b>${text}</b> → <code>${slot.matchId}</code>[${slot.slot}]\n\n` +
        `<b>Слот ${state.current + 1}/${state.slots.length}:</b> матч <code>${next.matchId}</code>, позиция <b>${next.slot}</b>\n\n` +
        `Введите название команды или /skip:`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }

  return true;
}

/**
 * Главная точка входа для текстовых сообщений — сначала bracket wizard,
 * потом seed wizard.
 */
async function processBracketOrSeedText(ctx) {
  // Сначала проверяем bracket wizard
  const bHandled = await processBracketWizardText(ctx);
  if (bHandled) return true;

  // Потом seed wizard
  return processSeedText(ctx);
}

module.exports = {
  createBracketCommand,
  seedCommand,
  processBracketOrSeedText,
};
