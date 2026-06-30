'use strict';

const {
  generateSingleElimination,
  generateDoubleElimination,
  generateGroupStage,
  generateSwissStage,
  generateSwissNextRound,
  computeSwissStandings,
  isSwissRoundComplete,
  fillPlayoffFromSwiss,
  formatSwissStandings,
  getEmptySlots,
  seedTeamInSlot,
  randomShuffleTeams,
  validateGeneratedBracket,
} = require('../../workflows/bracketGenerator');
const { enqueueCommit }      = require('../../github/commitQueue');
const { buildJsMutateFn, findTournamentById, parseJsDataFile } = require('../../data/jsDataFile');
const { getFile }            = require('../../github/client');
const { logAction }          = require('../../activityLog/logger');
const { canManageTournament } = require('../middleware/tournamentAuth');
const REPO_PATHS             = require('../../github/repoPaths');
const log                    = require('../../logger');

const WIZARD_TTL_MS = 10 * 60 * 1000;

/* ─── Типы стадий ──────────────────────────────────────────────── */
const STAGE_TYPES = {
  '1': { key: 'single', label: 'Single Elimination' },
  '2': { key: 'double', label: 'Double Elimination' },
  '3': { key: 'group',  label: 'Group Stage' },
  '4': { key: 'swiss',  label: 'Swiss Stage' },
};

/* ─── Состояния wizard-ов ──────────────────────────────────────── */
const bracketWizards = new Map();
const seedStates     = new Map();

function isExpired(state) {
  return Date.now() - state.startedAt > WIZARD_TTL_MS;
}

/* ─── Загрузка турнира ─────────────────────────────────────────── */
async function loadTournament(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const tournament  = findTournamentById(tournaments, tournamentId);
  if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
  return tournament;
}

/* ─── Форматирование итогового плана сетки (UX) ───────────────── */
function formatBracketPlan(stageConfigs) {
  const lines = [];
  stageConfigs.forEach((s, i) => {
    let desc = s.label;
    if (s.type === 'single' || s.type === 'double') desc += ` (${s.teamCount} команд)`;
    if (s.type === 'group')  desc += ` (${s.groupCount} гр. × ${s.teamsPerGroup} команд)`;
    if (s.type === 'swiss')  desc += ` (${s.teamCount} команд, ${s.winsToAdvance}W/${s.lossesToElim}L)`;
    lines.push(desc);
    if (i < stageConfigs.length - 1) {
      const adv = s.advancingCount ? `топ-${s.advancingCount}` : 'победители';
      lines.push(`  ↓ ${adv}`);
    }
  });
  return lines.join('\n');
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

  if (tournament.bracket?.stages?.length) {
    const hasPlayed = tournament.bracket.stages
      .flatMap(s => s.matches || [])
      .some(m => m.status !== 'scheduled');

    if (hasPlayed) {
      return ctx.reply(
        `⚠️ У турнира <code>${tournamentId}</code> есть сетка с сыгранными матчами.\n\n` +
        `Пересоздание запрещено.`,
        { parse_mode: 'HTML' }
      );
    }

    bracketWizards.set(userId, {
      step: 'confirm_overwrite', tournamentId,
      startedAt: Date.now(), stageCount: 0, stages: [], currentStage: 0,
    });
    return ctx.reply(
      `⚠️ У турнира <code>${tournamentId}</code> уже есть сетка.\n\n` +
      `Пересоздать? Напишите <b>да</b> или <b>нет</b>.`,
      { parse_mode: 'HTML' }
    );
  }

  bracketWizards.set(userId, {
    step: 'choose_stage_count', tournamentId,
    startedAt: Date.now(), stageCount: 0, stages: [], currentStage: 0,
  });
  await askStageCount(ctx, tournamentId);
}

async function askStageCount(ctx, tournamentId) {
  await ctx.reply(
    `🏗 <b>Создание сетки</b> · <code>${tournamentId}</code>\n\n` +
    `Сколько этапов в турнире?\n\n` +
    `<i>• 1 — только финальный плейофф\n` +
    `• 2 — Swiss/Group → Playoff\n` +
    `• 3 — Group → Group → Playoff</i>\n\n` +
    `Введите число (1–4):`,
    { parse_mode: 'HTML' }
  );
}

async function askStageType(ctx, state) {
  await ctx.reply(
    `📋 <b>Этап ${state.currentStage + 1} из ${state.stageCount}</b>\n\n` +
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
    case 'confirm_overwrite':      return handleConfirmOverwrite(ctx, state, userId, text);
    case 'choose_stage_count':     return handleStageCount(ctx, state, userId, text);
    case 'choose_stage_type':      return handleStageType(ctx, state, userId, text);
    case 'choose_team_count':      return handleTeamCount(ctx, state, userId, text);
    case 'choose_group_count':     return handleGroupCount(ctx, state, userId, text);
    case 'choose_teams_per_group': return handleTeamsPerGroup(ctx, state, userId, text);
    case 'choose_swiss_teams':     return handleSwissTeams(ctx, state, userId, text);
    case 'choose_swiss_wins':      return handleSwissWins(ctx, state, userId, text);
    default:
      bracketWizards.delete(userId);
      return false;
  }
}

async function handleConfirmOverwrite(ctx, state, userId, text) {
  if (['да','yes','+'].includes(text)) {
    state.step = 'choose_stage_count';
    await askStageCount(ctx, state.tournamentId);
  } else {
    bracketWizards.delete(userId);
    await ctx.reply('Отменено.');
  }
  return true;
}

async function handleStageCount(ctx, state, userId, text) {
  const n = parseInt(text, 10);
  if (isNaN(n) || n < 1 || n > 4) {
    await ctx.reply('❌ Введите число от 1 до 4:', { parse_mode: 'HTML' });
    return true;
  }
  state.stageCount   = n;
  state.currentStage = 0;
  state.step         = 'choose_stage_type';
  await askStageType(ctx, state);
  return true;
}

async function handleStageType(ctx, state, userId, text) {
  const choice = STAGE_TYPES[text];
  if (!choice) {
    await ctx.reply('❌ Введите 1, 2, 3 или 4:', { parse_mode: 'HTML' });
    return true;
  }
  state.currentStageType = choice.key;
  state.stages[state.currentStage] = { type: choice.key, label: choice.label };

  if (choice.key === 'single' || choice.key === 'double') {
    const allowed = choice.key === 'double' ? '4 или 8' : '4, 8, 16 или 32';
    state.step = 'choose_team_count';
    await ctx.reply(`👥 <b>${choice.label}</b>\n\nКоличество команд (${allowed}):`, { parse_mode: 'HTML' });
  } else if (choice.key === 'group') {
    state.step = 'choose_group_count';
    await ctx.reply('🗂 <b>Group Stage</b>\n\nКоличество групп (2, 4 или 8):', { parse_mode: 'HTML' });
  } else if (choice.key === 'swiss') {
    state.step = 'choose_swiss_teams';
    await ctx.reply('🔄 <b>Swiss Stage</b>\n\nКоличество команд (8 или 16):', { parse_mode: 'HTML' });
  }
  return true;
}

async function handleTeamCount(ctx, state, userId, text) {
  const n       = parseInt(text, 10);
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
  if (![2, 4, 8].includes(n)) {
    await ctx.reply('❌ Введите 2, 4 или 8:', { parse_mode: 'HTML' });
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
  // Количество выходящих = teamCount следующей стадии если она есть
  // Спросим у пользователя
  state.step = 'choose_teams_per_group_done';
  // Сразу переходим к следующей стадии (advancing = teamCount следующей стадии)
  state.stages[state.currentStage].advancingCount = null; // заполнится позже
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
    '🎯 Побед для выхода из Swiss (обычно 3):\n\n/skip — использовать 3',
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handleSwissWins(ctx, state, userId, text) {
  const isSkip = text === '/skip';
  const n      = isSkip ? 3 : parseInt(text, 10);
  if (!isSkip && (isNaN(n) || n < 2 || n > 5)) {
    await ctx.reply('❌ Введите число от 2 до 5 или /skip:', { parse_mode: 'HTML' });
    return true;
  }
  state.stages[state.currentStage].winsToAdvance = n;
  state.stages[state.currentStage].lossesToElim  = n;
  state.stages[state.currentStage].advancingCount = `топ-?`;
  return advanceToNextStage(ctx, state, userId);
}

async function advanceToNextStage(ctx, state, userId) {
  state.currentStage++;
  if (state.currentStage < state.stageCount) {
    state.step = 'choose_stage_type';
    await askStageType(ctx, state);
    return true;
  }
  await finalizeBracket(ctx, state, userId);
  return true;
}

async function finalizeBracket(ctx, state, userId) {
  bracketWizards.delete(userId);
  await ctx.sendChatAction('typing');

  const { tournamentId, stages } = state;

  try {
    const allStages  = [];

    for (let si = 0; si < stages.length; si++) {
      const sc = stages[si];
      let generated;

      if (sc.type === 'single') {
        generated = generateSingleElimination(sc.teamCount);
      } else if (sc.type === 'double') {
        generated = generateDoubleElimination(sc.teamCount);
      } else if (sc.type === 'group') {
        generated = generateGroupStage({ groupCount: sc.groupCount, teamsPerGroup: sc.teamsPerGroup });
      } else if (sc.type === 'swiss') {
        generated = generateSwissStage({ teamCount: sc.teamCount, winsToAdvance: sc.winsToAdvance || 3, lossesToElim: sc.lossesToElim || 3 });
      }

      // ID уже читаемые (sw-r1-m1, po-final и т.д.) — переименование не нужно
      for (const stage of generated.stages) {
        // Сбрасываем isFinal — проставим только для последней стадии ниже
        for (const m of (stage.matches || [])) { m.isFinal = false; }
        allStages.push({ ...stage, _generatedType: sc.type });
      }

      // Сохраняем swissConfig если Swiss
      if (generated.swissConfig) {
        allStages._swissConfig = generated.swissConfig;
      }
    }

    // isFinal только в последней не-Swiss стадии
    const lastNonSwiss = [...allStages].reverse().find(s => !s.isSwiss);
    if (lastNonSwiss?.matches?.length) {
      const noNext   = lastNonSwiss.matches.filter(m => !m.nextMatchId);
      const maxRound = Math.max(...noNext.map(m => m.round ?? 1));
      const fin      = noNext.find(m => (m.round ?? 1) === maxRound);
      if (fin) fin.isFinal = true;
    } else if (allStages.some(s => s.isSwiss)) {
      // Только Swiss — последний матч последнего раунда = isFinal
      const lastSwiss = [...allStages].reverse().find(s => s.isSwiss);
      if (lastSwiss?.matches?.length) {
        lastSwiss.matches[lastSwiss.matches.length - 1].isFinal = true;
      }
    }

    const bracketType = stages.length === 1 ? stages[0].type : 'multi';
    const bracket = {
      type: bracketType,
      stages: allStages,
      ...(allStages._swissConfig ? { swissConfig: allStages._swissConfig } : {}),
    };

    // Если есть Swiss в многостадийном — переносим swissConfig в bracket
    for (let si = 0; si < stages.length; si++) {
      if (stages[si].type === 'swiss') {
        const sw = generateSwissStage({
          teamCount:    stages[si].teamCount,
          winsToAdvance:stages[si].winsToAdvance || 3,
          lossesToElim: stages[si].lossesToElim  || 3,
        });
        bracket.swissConfig = sw.swissConfig;
        break;
      }
    }

    const errors = validateGeneratedBracket(bracket);
    if (errors.length) throw new Error(`Ошибки сетки:\n${errors.join('\n')}`);

    const totalMatches = allStages.reduce((a, s) => a + (s.matches?.length || 0), 0);
    const plan         = formatBracketPlan(stages);

    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, tournamentId);
        if (!t) throw new Error(`Турнир "${tournamentId}" не найден`);
        t.bracket = bracket;
        return tournaments;
      },
      `bracket: ${tournamentId} — ${stages.map(s=>s.label).join(' → ')} (${totalMatches} матчей)`,
    );

    const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    try {
      await logAction({
        actorTelegramId: userId,
        actorRole: ctx.userRole || 'admin',
        action: 'bracket.created', targetType: 'tournament', targetId: tournamentId,
        details: { stages: stages.map(s=>s.type), totalMatches, commitSha },
      });
    } catch (_) {}

    await ctx.reply(
      `✅ <b>Сетка создана!</b>\n\n` +
      `<b>${plan}</b>\n\n` +
      `Матчей: ${totalMatches}\n\n` +
      `Назначить команды: <code>/seed ${tournamentId}</code>\n` +
      `Случайная жеребьёвка: <code>/randomseed ${tournamentId}</code>\n` +
      `Просмотр: <code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'createBracket: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/* ─── /seed (переработан) ──────────────────────────────────────── */

async function seedCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply('❌ Укажите id турнира.\n\n<code>/seed &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
  }

  await ctx.sendChatAction('typing');

  let tournament;
  try {
    tournament = await loadTournament(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const userId = ctx.from?.id;
  const access = canManageTournament(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(`❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`, { parse_mode: 'HTML' });
  }

  if (!tournament.bracket?.stages?.length) {
    return ctx.reply(
      `❌ У турнира нет сетки.\n\nСоздайте: <code>/createbracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const slots = getEmptySlots(tournament.bracket);

  if (!slots.length) {
    return ctx.reply(
      `✅ Все стартовые слоты заполнены.\n\nПросмотр: <code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const slotType = slots[0].type;
  let   header   = '';

  if (slotType === 'swiss') {
    header = `🔄 <b>Посев команд Swiss Stage</b>\n\nВведите название каждой команды по очереди.\n/skip — оставить текущее значение.\n\n`;
  } else if (slotType === 'group') {
    header = `🗂 <b>Посев команд в группы</b>\n\nВведите название каждой команды по очереди.\n/skip — оставить алиас (A1, B2 и т.д.).\n\n`;
  } else {
    header = `🎯 <b>Посев команд в плейофф</b>\n\nВведите название каждой команды по очереди.\n/skip — оставить TBD.\n\n`;
  }

  const preview = slots.slice(0, 5).map((s, i) => {
    if (s.type === 'swiss')  return `${i+1}. Swiss команда ${s.teamIndex + 1} (сейчас: ${s.current})`;
    if (s.type === 'group')  return `${i+1}. ${s.stageName}: слот ${s.slotName}`;
    return `${i+1}. ${s.stageName}: матч <code>${s.matchId}</code>[${s.slot}]`;
  }).join('\n');

  seedStates.set(userId, { tournamentId, slots, current: 0, startedAt: Date.now() });

  await ctx.reply(
    header +
    `Слотов всего: <b>${slots.length}</b>\n` +
    preview + (slots.length > 5 ? `\n<i>...и ещё ${slots.length - 5}</i>` : '') +
    `\n\n<b>Слот 1/${slots.length}:</b> ` + slotLabel(slots[0]),
    { parse_mode: 'HTML' }
  );
}

function slotLabel(slot) {
  if (slot.type === 'swiss')  return `Swiss команда ${slot.teamIndex + 1} (сейчас: <b>${slot.current}</b>)`;
  if (slot.type === 'group')  return `${slot.stageName}, позиция <b>${slot.slotName}</b>`;
  return `Матч <code>${slot.matchId}</code>, слот <b>${slot.slot}</b>`;
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
    // Пропускаем — оставляем текущее значение
    state.current++;
    if (state.current >= state.slots.length) {
      seedStates.delete(userId);
      await ctx.reply(`✅ Посев завершён.\n\nПросмотр: <code>/bracket ${state.tournamentId}</code>`, { parse_mode: 'HTML' });
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `⏭ Пропущено.\n\n<b>Слот ${state.current + 1}/${state.slots.length}:</b> ` + slotLabel(next),
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
        seedTeamInSlot(t.bracket, slot, text);
        return tournaments;
      },
      `seed: ${state.tournamentId} [${slot.type}] = "${text}"`,
    );

    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
    state.current++;

    if (state.current >= state.slots.length) {
      seedStates.delete(userId);

      try {
        await logAction({
          actorTelegramId: userId,
          actorRole: ctx.userRole || 'admin',
          action: 'bracket.seeded', targetType: 'tournament', targetId: state.tournamentId,
          details: { totalSlots: state.slots.length },
        });
      } catch (_) {}

      await ctx.reply(
        `✅ <b>Посев завершён!</b>\n\n` +
        `Просмотр: <code>/bracket ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      const next = state.slots[state.current];
      await ctx.reply(
        `✅ <b>${text}</b> записана.\n\n` +
        `<b>Слот ${state.current + 1}/${state.slots.length}:</b> ` + slotLabel(next),
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  return true;
}

/* ─── /randomseed ──────────────────────────────────────────────── */

async function randomSeedCommand(ctx) {
  const text  = (ctx.message?.text || '').trim();
  const parts = text.split(/\s+/);
  const tournamentId = parts[1];
  // Команды — всё после tournamentId, разделённые запятой
  const teamsRaw = text.replace(/^\/randomseed\s+\S+\s*/, '').trim();

  if (!tournamentId) {
    return ctx.reply(
      '❌ Укажите id турнира и список команд.\n\n' +
      'Формат:\n<code>/randomseed &lt;tournamentId&gt; Команда1, Команда2, ...</code>\n\n' +
      'Пример:\n<code>/randomseed SkewerEsports-Season-3 Alpha, Beta, Gamma, Delta</code>',
      { parse_mode: 'HTML' }
    );
  }

  if (!teamsRaw) {
    return ctx.reply(
      '❌ Укажите список команд через запятую.\n\n' +
      `Пример:\n<code>/randomseed ${tournamentId} Team A, Team B, Team C, Team D</code>`,
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

  const userId = ctx.from?.id;
  const access = canManageTournament(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(`❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`, { parse_mode: 'HTML' });
  }

  if (!tournament.bracket?.stages?.length) {
    return ctx.reply(
      `❌ У турнира нет сетки.\n\nСоздайте: <code>/createbracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const slots = getEmptySlots(tournament.bracket);
  if (!slots.length) {
    return ctx.reply('✅ Все слоты уже заполнены.', { parse_mode: 'HTML' });
  }

  const teams = teamsRaw.split(',').map(t => t.trim()).filter(Boolean);

  if (teams.length < slots.length) {
    return ctx.reply(
      `❌ Недостаточно команд.\n\nСлотов: <b>${slots.length}</b>, команд: <b>${teams.length}</b>\n\n` +
      `Добавьте ещё ${slots.length - teams.length} команд(ы).`,
      { parse_mode: 'HTML' }
    );
  }

  // Случайное перемешивание
  const shuffled = randomShuffleTeams(teams).slice(0, slots.length);

  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, tournamentId);
        if (!t?.bracket) throw new Error('Сетка не найдена');
        shuffled.forEach((teamName, i) => {
          if (slots[i]) seedTeamInSlot(t.bracket, slots[i], teamName);
        });
        return tournaments;
      },
      `randomseed: ${tournamentId} — жеребьёвка ${shuffled.length} команд`,
    );

    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    // Формируем читаемый результат жеребьёвки
    const resultLines = slots.map((s, i) => {
      const team = shuffled[i];
      if (s.type === 'swiss')  return `  ${i+1}. <b>${team}</b>`;
      if (s.type === 'group')  return `  ${s.stageName} [${s.slotName}] → <b>${team}</b>`;
      return `  ${s.matchId}[${s.slot}] → <b>${team}</b>`;
    });

    try {
      await logAction({
        actorTelegramId: userId,
        actorRole: ctx.userRole || 'admin',
        action: 'bracket.seeded', targetType: 'tournament', targetId: tournamentId,
        details: { method: 'random', teams: shuffled },
      });
    } catch (_) {}

    await ctx.reply(
      `🎲 <b>Жеребьёвка завершена!</b>\n\n` +
      resultLines.join('\n') +
      `\n\nПросмотр сетки: <code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'randomseed: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /swissnext — следующий раунд Swiss ────────────────────────── */

async function swissNextCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply('❌ Формат: <code>/swissnext &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
  }

  await ctx.sendChatAction('typing');

  let tournament;
  try {
    tournament = await loadTournament(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const userId = ctx.from?.id;
  const access = canManageTournament(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(`❌ Нет доступа: ${access.reason}`, { parse_mode: 'HTML' });
  }

  if (!tournament.bracket?.stages?.some(s => s.isSwiss)) {
    return ctx.reply('❌ У этого турнира нет Swiss Stage.', { parse_mode: 'HTML' });
  }

  try {
    let replyText = '';

    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, tournamentId);
        if (!t?.bracket) throw new Error('Сетка не найдена');

        // Пробуем сгенерировать следующий раунд
        const result = generateSwissNextRound(t.bracket);

        if (!result.ok) {
          // generateSwissNextRound отказал — пробуем заполнить плейофф.
          // fillPlayoffFromSwiss сам проверяет что ВСЕ команды финализированы
          // (advanced/eliminated) и откажет если кто-то ещё активен —
          // защита от преждевременного заполнения плейоффа.
          const fillResult = fillPlayoffFromSwiss(t.bracket);
          replyText = fillResult.filled > 0
            ? `🏆 Swiss завершён! ${fillResult.message}

Плейофф готов: <code>/bracket ${tournamentId}</code>`
            : `ℹ️ ${fillResult.message || result.message}`;
          return tournaments;
        }

        replyText = `✅ <b>${result.message}</b>`;
        return tournaments;
      },
      `swiss: ${tournamentId} — следующий раунд`,
    );

    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    // Перезагружаем для таблицы
    const updated  = await loadTournament(tournamentId);
    const standings = formatSwissStandings(updated.bracket);

    await ctx.reply(
      replyText + `\n\n<b>Таблица Swiss:</b>\n${standings}\n\n` +
      `<code>/bracket ${tournamentId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'swissnext: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /swissstatus ─────────────────────────────────────────────── */

async function swissStatusCommand(ctx) {
  const parts        = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply('❌ Формат: <code>/swissstatus &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
  }

  await ctx.sendChatAction('typing');

  let tournament;
  try {
    tournament = await loadTournament(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  if (!tournament.bracket?.stages?.some(s => s.isSwiss)) {
    return ctx.reply('❌ У этого турнира нет Swiss Stage.', { parse_mode: 'HTML' });
  }

  const standings    = formatSwissStandings(tournament.bracket);
  const { winsToAdvance, lossesToElim } = tournament.bracket.swissConfig || {};
  const roundsDone   = tournament.bracket.stages.filter(s => s.isSwiss).length;
  const isComplete   = isSwissRoundComplete(tournament.bracket);

  await ctx.reply(
    `🔄 <b>Swiss Stage — ${tournament.title}</b>\n\n` +
    `Раундов сыграно: ${roundsDone}\n` +
    `Выход: ${winsToAdvance}W | Выбывание: ${lossesToElim}L\n\n` +
    `<b>Таблица:</b>\n${standings}\n\n` +
    (isComplete
      ? `✅ Раунд завершён. Сгенерировать следующий: <code>/swissnext ${tournamentId}</code>`
      : `⏳ Раунд ещё не завершён.`),
    { parse_mode: 'HTML' }
  );
}

/* ─── Точка входа для wizard-обработчиков ──────────────────────── */

async function processBracketOrSeedText(ctx) {
  const bHandled = await processBracketWizardText(ctx);
  if (bHandled) return true;
  return processSeedText(ctx);
}

module.exports = {
  createBracketCommand,
  seedCommand,
  randomSeedCommand,
  swissNextCommand,
  swissStatusCommand,
  processBracketOrSeedText,
};
