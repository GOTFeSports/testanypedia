'use strict';

/**
 * tournamentManager.js — единый /manage wizard для организаторов.
 *
 * Заменяет необходимость помнить десятки команд.
 * Организатор выбирает турнир → видит меню действий → выполняет всё через диалог.
 *
 * Структура wizard-состояния:
 * {
 *   step:         string,      // текущий шаг
 *   tournamentId: string|null,
 *   data:         object,      // накопленные данные текущего действия
 *   startedAt:    number,
 * }
 */

const { getFile }            = require('../../github/client');
const { parseJsDataFile, findTournamentById, buildJsMutateFn } = require('../../data/jsDataFile');
const { enqueueCommit }      = require('../../github/commitQueue');
const { loadBracketEngine }  = require('../../data/bracketEngineBridge');
const { canManageTournament } = require('../middleware/tournamentAuth');
const { reportMatchWorkflow } = require('../../workflows/reportMatchWorkflow');
const { startMatchWorkflow, endMatchWorkflow } = require('../../workflows/matchStatusWorkflow');
const { generateSwissNextRound, computeSwissStandings, isSwissRoundComplete, fillPlayoffFromSwiss, formatSwissStandings } = require('../../workflows/bracketGenerator');
const { initSeries, addGame, addDotabuffToGame, formatSeriesStatus, formatGamesList, canAddMoreGames } = require('../../workflows/boSeries');
const { autoFillPrizes, isTournamentComplete } = require('../../workflows/prizeAutoFill');
const { logAction }          = require('../../activityLog/logger');
const REPO_PATHS             = require('../../github/repoPaths');
const config                 = require('../../config');
const log                    = require('../../logger');

const WIZARD_TTL_MS = 15 * 60 * 1000;
const manageStates  = new Map();

function isExpired(s) { return Date.now() - s.startedAt > WIZARD_TTL_MS; }

/* ─── Загрузка ──────────────────────────────────────────────────── */

async function loadAll() {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  return parseJsDataFile(file.content, 'tournaments');
}

async function loadOne(id) {
  const all = await loadAll();
  const t   = findTournamentById(all, id);
  if (!t) throw new Error(`Турнир "${id}" не найден`);
  return t;
}

/* ─── Читаемые имена раундов ─────────────────────────────────────── */

function roundName(matchId, bracket) {
  if (!bracket || !matchId) return matchId;
  // По id пытаемся угадать раунд
  if (/final$/i.test(matchId) && !/semi|sf/i.test(matchId)) return 'Финал';
  if (/sf\d*$/i.test(matchId) || /semi/i.test(matchId))      return 'Полуфинал';
  if (/qf\d*$/i.test(matchId) || /quarter/i.test(matchId))   return 'Четвертьфинал';
  if (/gf$/i.test(matchId))  return 'Гранд-финал';
  if (/ub-final/i.test(matchId)) return 'Финал верхней сетки';
  if (/lb-final/i.test(matchId)) return 'Финал нижней сетки';
  const swM = matchId.match(/sw-r(\d+)-m(\d+)/);
  if (swM) return `Swiss, Раунд ${swM[1]}, матч ${swM[2]}`;
  return matchId; // fallback
}

function matchLabel(m) {
  const tA = m.teamA && m.teamA !== 'TBD' ? m.teamA : '?';
  const tB = m.teamB && m.teamB !== 'TBD' ? m.teamB : '?';
  const score = m.status === 'finished' ? ` (${m.scoreA}:${m.scoreB})` : '';
  return `${tA} vs ${tB}${score}`;
}

/* ─── /manage точка входа ────────────────────────────────────────── */

async function manageCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const userId = ctx.from?.id;
  const directId = parts[1]; // /manage <tournamentId> — быстрый вход

  await ctx.sendChatAction('typing');

  try {
    const all = await loadAll();

    // Фильтруем турниры доступные текущему пользователю
    const accessible = all.filter(t => canManageTournament(userId, t).allowed);

    if (!accessible.length) {
      return ctx.reply(
        '❌ У вас нет турниров для управления.\n\n' +
        'Подайте заявку на создание: /draft',
        { parse_mode: 'HTML' }
      );
    }

    // Если указан прямой id — сразу переходим к меню
    if (directId) {
      const t = accessible.find(x => x.id === directId);
      if (!t) return ctx.reply(`❌ Турнир <code>${directId}</code> не найден или недоступен.`, { parse_mode: 'HTML' });
      manageStates.set(userId, { step: 'main_menu', tournamentId: directId, data: {}, startedAt: Date.now() });
      return showMainMenu(ctx, t);
    }

    // Иначе показываем список турниров для выбора
    if (accessible.length === 1) {
      // Один турнир — сразу открываем
      const t = accessible[0];
      manageStates.set(userId, { step: 'main_menu', tournamentId: t.id, data: {}, startedAt: Date.now() });
      return showMainMenu(ctx, t);
    }

    manageStates.set(userId, { step: 'choose_tournament', tournamentId: null, data: {}, startedAt: Date.now(), list: accessible });

    const lines = accessible.map((t, i) => `<b>${i + 1}.</b> ${t.title} <code>${t.id}</code>`);
    await ctx.reply(
      `🏆 <b>Выберите турнир для управления:</b>\n\n${lines.join('\n')}\n\nВведите номер или id турнира:`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ err: err.message }, 'manage: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── Главное меню турнира ───────────────────────────────────────── */

async function showMainMenu(ctx, tournament) {
  const t  = tournament;
  const hasB = t.bracket?.stages?.length > 0;
  const hasSwiss = hasB && t.bracket.stages.some(s => s.isSwiss);
  const isComplete = hasB && isTournamentComplete(t.bracket);

  const lines = [
    `🏆 <b>${t.title}</b>`,
    `${t.start} — ${t.end}`,
    '',
    '<b>Что хотите сделать?</b>',
    '',
    hasB ? '📊 <b>1</b> — Посмотреть сетку' : '🏗 <b>1</b> — Создать сетку',
    hasB ? '⚽ <b>2</b> — Ввести результат матча' : null,
    hasB ? '▶️ <b>3</b> — Запустить матч (→ live)' : null,
    hasB ? '⏹ <b>4</b> — Завершить матч' : null,
    hasSwiss ? '🔄 <b>5</b> — Следующий Swiss-раунд' : null,
    '✏️ <b>6</b> — Редактировать турнир',
    '🏅 <b>7</b> — Призовые места',
    isComplete ? '🎖 <b>8</b> — Определить призёров' : null,
    '',
    '/cancel — выйти из режима управления',
  ].filter(v => v !== null);

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
}

/* ─── Обработка текстовых сообщений ─────────────────────────────── */

async function processManageText(ctx) {
  const userId = ctx.from?.id;
  const state  = manageStates.get(userId);
  if (!state || isExpired(state)) { manageStates.delete(userId); return false; }

  const text = (ctx.message?.text || '').trim();

  if (text === '/cancel' || text === 'отмена') {
    manageStates.delete(userId);
    await ctx.reply('👋 Режим управления закрыт.');
    return true;
  }

  switch (state.step) {
    case 'choose_tournament': return handleChooseTournament(ctx, state, userId, text);
    case 'main_menu':         return handleMainMenu(ctx, state, userId, text);

    // Ввод результата матча
    case 'match_choose':      return handleMatchChoose(ctx, state, userId, text);
    case 'match_score':       return handleMatchScore(ctx, state, userId, text);

    // Запуск матча
    case 'startmatch_choose': return handleStartMatchChoose(ctx, state, userId, text);

    // Завершение матча
    case 'endmatch_choose':   return handleEndMatchChoose(ctx, state, userId, text);

    // Редактирование турнира
    case 'edit_choose_field': return handleEditChooseField(ctx, state, userId, text);
    case 'edit_value':        return handleEditValue(ctx, state, userId, text);

    // Призовые
    case 'prize_choose_place':return handlePrizeChoosePlace(ctx, state, userId, text);
    case 'prize_amount':      return handlePrizeAmount(ctx, state, userId, text);
    case 'prize_team':        return handlePrizeTeam(ctx, state, userId, text);

    default:
      manageStates.delete(userId);
      return false;
  }
}

/* ─── Выбор турнира ──────────────────────────────────────────────── */

async function handleChooseTournament(ctx, state, userId, text) {
  const list = state.list || [];
  let t;

  const num = parseInt(text, 10);
  if (!isNaN(num) && num >= 1 && num <= list.length) {
    t = list[num - 1];
  } else {
    t = list.find(x => x.id === text || x.title.toLowerCase().includes(text.toLowerCase()));
  }

  if (!t) {
    await ctx.reply(`❌ Турнир не найден. Введите номер (1-${list.length}) или часть названия:`, { parse_mode: 'HTML' });
    return true;
  }

  state.tournamentId = t.id;
  state.step         = 'main_menu';
  await showMainMenu(ctx, t);
  return true;
}

/* ─── Главное меню — обработка выбора ───────────────────────────── */

async function handleMainMenu(ctx, state, userId, text) {
  let t;
  try { t = await loadOne(state.tournamentId); } catch (e) {
    manageStates.delete(userId);
    await ctx.reply(`❌ ${e.message}`);
    return true;
  }

  const hasB     = t.bracket?.stages?.length > 0;
  const hasSwiss = hasB && t.bracket.stages.some(s => s.isSwiss);
  const isComplete = hasB && isTournamentComplete(t.bracket);

  switch (text) {
    case '1':
      if (!hasB) {
        await ctx.reply(
          '🏗 Сетка ещё не создана.\n\n' +
          `Используйте: <code>/createbracket ${state.tournamentId}</code>`,
          { parse_mode: 'HTML' }
        );
      } else {
        await showBracketReadable(ctx, t);
      }
      await showMainMenu(ctx, t);
      return true;

    case '2':
      if (!hasB) { await ctx.reply('❌ Сначала создайте сетку (пункт 1).', { parse_mode: 'HTML' }); await showMainMenu(ctx, t); return true; }
      return await startMatchChooseFlow(ctx, state, userId, t, 'match');

    case '3':
      if (!hasB) { await ctx.reply('❌ Сначала создайте сетку.', { parse_mode: 'HTML' }); await showMainMenu(ctx, t); return true; }
      return await startMatchChooseFlow(ctx, state, userId, t, 'startmatch');

    case '4':
      if (!hasB) { await ctx.reply('❌ Сначала создайте сетку.', { parse_mode: 'HTML' }); await showMainMenu(ctx, t); return true; }
      return await startMatchChooseFlow(ctx, state, userId, t, 'endmatch');

    case '5':
      if (!hasSwiss) { await ctx.reply('❌ У турнира нет Swiss Stage.', { parse_mode: 'HTML' }); await showMainMenu(ctx, t); return true; }
      await doSwissNext(ctx, state, userId, t);
      await showMainMenu(ctx, t);
      return true;

    case '6':
      return startEditFlow(ctx, state, userId);

    case '7':
      return startPrizeFlow(ctx, state, userId, t);

    case '8':
      if (!isComplete) { await ctx.reply('❌ Турнир ещё не завершён.', { parse_mode: 'HTML' }); await showMainMenu(ctx, t); return true; }
      await doAutoFillPrizes(ctx, state, userId, t);
      await showMainMenu(ctx, t);
      return true;

    default:
      await ctx.reply('Введите номер действия (1-8):', { parse_mode: 'HTML' });
      return true;
  }
}

/* ─── Просмотр сетки без технических ID ─────────────────────────── */

async function showBracketReadable(ctx, tournament) {
  const bracket = tournament.bracket;
  const lines   = [`🏆 <b>${tournament.title}</b> — сетка\n`];
  const seen    = new Set();

  for (const stage of (bracket.stages || [])) {
    if (seen.has(stage.name)) continue;
    seen.add(stage.name);
    const matches = stage.matches || [];
    if (!matches.length) continue;

    if (stage.isSwiss) {
      lines.push(`\n<b>🔄 ${stage.name}:</b>`);
      const standings = formatSwissStandings(bracket);
      lines.push(standings);
      for (const m of matches) {
        const icon = m.status === 'finished' ? '✅' : m.status === 'live' ? '🔴' : '🕐';
        const score = m.status !== 'scheduled' ? ` ${m.scoreA}:${m.scoreB}` : '';
        lines.push(`  ${icon} ${m.teamA} vs ${m.teamB}${score}`);
      }
      continue;
    }

    if (stage.isGroup) {
      lines.push(`\n<b>🗂 ${stage.name}:</b>`);
      for (const m of matches) {
        const icon = m.status === 'finished' ? '✅' : m.status === 'live' ? '🔴' : '🕐';
        const score = m.status !== 'scheduled' ? ` ${m.scoreA}:${m.scoreB}` : '';
        lines.push(`  ${icon} ${m.teamA} vs ${m.teamB}${score}`);
      }
      continue;
    }

    // Playoff — группируем по раунду с читаемыми именами
    lines.push(`\n<b>🏆 ${stage.name}:</b>`);
    const byRound   = {};
    for (const m of matches) {
      const r = m.round ?? 1;
      if (!byRound[r]) byRound[r] = [];
      byRound[r].push(m);
    }
    const rounds      = Object.keys(byRound).map(Number).sort((a,b)=>a-b);
    const totalRounds = rounds.length;

    for (const r of rounds) {
      const rname = totalRounds > 1 ? (() => {
        const fromEnd = totalRounds - r;
        if (fromEnd === 0) return 'Финал';
        if (fromEnd === 1) return 'Полуфиналы';
        if (fromEnd === 2) return 'Четвертьфиналы';
        return `Раунд ${r}`;
      })() : null;

      if (rname) lines.push(`  <i>${rname}:</i>`);

      for (const m of byRound[r]) {
        const tA   = m.teamA && m.teamA !== 'TBD' ? m.teamA : '—';
        const tB   = m.teamB && m.teamB !== 'TBD' ? m.teamB : '—';
        let   line;

        if (m.status === 'finished' && m.winner) {
          const aW = m.winner === m.teamA;
          line = aW
            ? `✅ <b>${tA}</b> ${m.scoreA}:${m.scoreB} ${tB}`
            : `✅ ${tA} ${m.scoreA}:${m.scoreB} <b>${tB}</b>`;
        } else if (m.status === 'live') {
          line = `🔴 ${tA} ${m.scoreA ?? 0}:${m.scoreB ?? 0} ${tB}`;
        } else {
          line = `🕐 ${tA} vs ${tB}`;
        }

        if (m.series) {
          const ss = formatSeriesStatus(m);
          if (ss) line += `\n     ${ss}`;
        }

        // ID только в скобках после — для использования в командах, не в центре внимания
        line += `  <i>(${m.id})</i>`;
        lines.push(`  ${line}`);
      }
    }
  }

  let total = 0, done = 0;
  for (const s of (bracket.stages||[])) {
    for (const m of (s.matches||[])) { total++; if (m.status==='finished') done++; }
  }
  lines.push(`\n📊 ${done}/${total} матчей завершено`);
  if (tournament.winner) lines.push(`🏆 <b>Победитель: ${tournament.winner}</b>`);

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
}

/* ─── Выбор матча (общий flow для match/startmatch/endmatch) ─────── */

async function startMatchChooseFlow(ctx, state, userId, tournament, action) {
  const bracket = tournament.bracket;
  const matches = [];

  for (const stage of (bracket?.stages || [])) {
    for (const m of (stage.matches || [])) {
      if (action === 'match' && (m.status === 'scheduled' || m.status === 'live') && m.teamA !== 'TBD' && m.teamB !== 'TBD') {
        matches.push({ m, stageName: stage.name });
      } else if (action === 'startmatch' && m.status === 'scheduled' && m.teamA !== 'TBD' && m.teamB !== 'TBD') {
        matches.push({ m, stageName: stage.name });
      } else if (action === 'endmatch' && m.status === 'live') {
        matches.push({ m, stageName: stage.name });
      }
    }
  }

  if (!matches.length) {
    const msg = action === 'match'      ? 'Нет матчей доступных для ввода результата (все завершены или TBD).'
              : action === 'startmatch' ? 'Нет матчей готовых к запуску (все запущены, завершены или TBD).'
              :                           'Нет запущенных матчей для завершения.';
    await ctx.reply(`ℹ️ ${msg}`, { parse_mode: 'HTML' });
    await showMainMenu(ctx, tournament);
    return true;
  }

  const lines = matches.slice(0, 20).map((x, i) => {
    const rn = roundName(x.m.id, bracket);
    return `<b>${i + 1}.</b> ${rn} — ${matchLabel(x.m)}`;
  });

  const prompt = action === 'match'      ? 'Выберите матч для ввода результата:'
               : action === 'startmatch' ? 'Выберите матч для запуска:'
               :                           'Выберите матч для завершения:';

  state.step      = action === 'match' ? 'match_choose' : action === 'startmatch' ? 'startmatch_choose' : 'endmatch_choose';
  state.data      = { action, matchList: matches };

  await ctx.reply(`${prompt}\n\n${lines.join('\n')}\n\n/back — назад`, { parse_mode: 'HTML' });
  return true;
}

async function handleMatchChoose(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'main_menu'; state.data = {}; const t = await loadOne(state.tournamentId); await showMainMenu(ctx, t); return true; }
  const num = parseInt(text, 10);
  const list = state.data.matchList || [];
  if (isNaN(num) || num < 1 || num > list.length) {
    await ctx.reply(`❌ Введите номер от 1 до ${list.length}:`, { parse_mode: 'HTML' });
    return true;
  }
  const chosen = list[num - 1];
  state.data.chosenMatch  = chosen.m;
  state.data.chosenMatchId = chosen.m.id;
  state.step = 'match_score';

  const hasSeries = !!chosen.m.series;
  const seriesHint = hasSeries ? `\nСерия: ${formatSeriesStatus(chosen.m) || 'начата'}` : '';

  await ctx.reply(
    `📊 <b>${matchLabel(chosen.m)}</b>${seriesHint}\n\n` +
    `Введите счёт в формате <code>2:1</code>\n(победы:победы, не очки карты)\n\n/back — назад`,
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handleMatchScore(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'match_choose'; await showMatchList(ctx, state); return true; }

  const m = state.data.chosenMatch || {};
  const scoreMatch = text.match(/^(\d+):(\d+)$/);
  if (!scoreMatch) {
    await ctx.reply('❌ Формат счёта: <code>2:1</code>', { parse_mode: 'HTML' });
    return true;
  }

  const scoreA = parseInt(scoreMatch[1], 10);
  const scoreB = parseInt(scoreMatch[2], 10);

  await ctx.sendChatAction('typing');
  try {
    const result = await reportMatchWorkflow({
      tournamentId:    state.tournamentId,
      matchId:         state.data.chosenMatchId,
      scoreA, scoreB,
      actorTelegramId: userId,
      actorRole:       ctx.userRole || 'organizer',
    });

    const tA = m.teamA || 'A';
    const tB = m.teamB || 'B';
    let reply = `✅ <b>${tA} ${scoreA}:${scoreB} ${tB}</b>\n`;
    if (result.winner) reply += `🏆 Победитель: <b>${result.winner}</b>\n`;
    if (result.advanced) reply += `➡️ <b>${result.advanced.team}</b> — в следующий матч\n`;
    if (result.tournamentWinner) reply += `\n🎊 <b>Победитель турнира: ${result.tournamentWinner}</b>`;
    if (result.prizesAutoFilled?.filled) {
      const pl = Object.entries(result.prizesAutoFilled.places).map(([p,t])=>`${p} место — ${t}`).join(', ');
      reply += `\n🎖 ${pl}`;
    }

    await ctx.reply(reply, { parse_mode: 'HTML' });

    // Проверяем Swiss-авто
    const updatedT = await loadOne(state.tournamentId);
    await maybeAutoSwiss(ctx, updatedT, userId);

  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  state.step = 'main_menu';
  const t = await loadOne(state.tournamentId);
  await showMainMenu(ctx, t);
  return true;
}

async function showMatchList(ctx, state) {
  const t = await loadOne(state.tournamentId);
  await startMatchChooseFlow(ctx, state, 0, t, state.data.action || 'match');
}

/* ─── Запуск матча ───────────────────────────────────────────────── */

async function handleStartMatchChoose(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'main_menu'; state.data = {}; const t = await loadOne(state.tournamentId); await showMainMenu(ctx, t); return true; }
  const list = state.data.matchList || [];
  const num  = parseInt(text, 10);
  if (isNaN(num) || num < 1 || num > list.length) {
    await ctx.reply(`❌ Введите номер от 1 до ${list.length}:`, { parse_mode: 'HTML' });
    return true;
  }
  const chosen = list[num - 1];
  await ctx.sendChatAction('typing');
  try {
    await startMatchWorkflow({ tournamentId: state.tournamentId, matchId: chosen.m.id, actorTelegramId: userId, actorRole: ctx.userRole || 'organizer' });
    await ctx.reply(`🔴 Матч запущен: <b>${matchLabel(chosen.m)}</b>`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
  state.step = 'main_menu';
  const t = await loadOne(state.tournamentId);
  await showMainMenu(ctx, t);
  return true;
}

/* ─── Завершение матча ────────────────────────────────────────────── */

async function handleEndMatchChoose(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'main_menu'; state.data = {}; const t = await loadOne(state.tournamentId); await showMainMenu(ctx, t); return true; }
  const list = state.data.matchList || [];
  const num  = parseInt(text, 10);
  if (isNaN(num) || num < 1 || num > list.length) {
    await ctx.reply(`❌ Введите номер от 1 до ${list.length}:`, { parse_mode: 'HTML' });
    return true;
  }
  const chosen = list[num - 1];
  await ctx.sendChatAction('typing');
  try {
    await endMatchWorkflow({ tournamentId: state.tournamentId, matchId: chosen.m.id, actorTelegramId: userId, actorRole: ctx.userRole || 'organizer' });
    await ctx.reply(`✅ Матч завершён: <b>${matchLabel(chosen.m)}</b>`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
  state.step = 'main_menu';
  const t = await loadOne(state.tournamentId);
  await showMainMenu(ctx, t);
  return true;
}

/* ─── Swiss авто-следующий раунд ─────────────────────────────────── */

async function doSwissNext(ctx, state, userId, tournament) {
  await ctx.sendChatAction('typing');
  try {
    let message = '';
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, state.tournamentId);
        if (!t?.bracket) throw new Error('Сетка не найдена');
        const result = generateSwissNextRound(t.bracket);
        if (!result.ok) {
          const fill = fillPlayoffFromSwiss(t.bracket);
          message = fill.filled > 0
            ? `🏆 Swiss завершён! ${fill.message}`
            : `ℹ️ ${fill.message || result.message}`;
        } else {
          message = `✅ ${result.message}`;
        }
        return tournaments;
      },
      `swiss: ${state.tournamentId} — авто-следующий раунд`,
    );
    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
    const updated = await loadOne(state.tournamentId);
    const table   = formatSwissStandings(updated.bracket);
    await ctx.reply(`${message}\n\n<b>Таблица:</b>\n${table}`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/**
 * Автоматически предлагает следующий Swiss-раунд если текущий завершён.
 * Вызывается после каждого /match через manage.
 */
async function maybeAutoSwiss(ctx, tournament, userId) {
  if (!tournament.bracket?.stages?.some(s => s.isSwiss)) return;
  if (!isSwissRoundComplete(tournament.bracket)) return;

  // Проверяем — есть ли ещё активные команды?
  const standings  = computeSwissStandings(tournament.bracket);
  const stillActive = [...standings.values()].filter(s => s.active);

  if (stillActive.length === 0) {
    // Swiss закончен — заполняем плейофф
    await ctx.reply('🔄 <b>Swiss-раунд завершён!</b>\nВсе команды определены. Формирую плейофф...', { parse_mode: 'HTML' });
    try {
      const mutateFn = buildJsMutateFn(
        REPO_PATHS.DATA_JS,
        (tournaments) => {
          const t = findTournamentById(tournaments, tournament.id);
          fillPlayoffFromSwiss(t.bracket);
          return tournaments;
        },
        `swiss: ${tournament.id} — авто-заполнение плейоффа`,
      );
      await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
      await ctx.reply('✅ Плейофф сформирован! Посмотрите сетку через пункт 1 меню.', { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`⚠️ ${e.message}`, { parse_mode: 'HTML' });
    }
  } else {
    // Предлагаем следующий раунд
    await ctx.reply(
      `🔄 <b>Swiss-раунд завершён!</b>\n\n` +
      `Активных команд: ${stillActive.length}\n\n` +
      `Нажмите <b>5</b> в меню чтобы сгенерировать следующий раунд.`,
      { parse_mode: 'HTML' }
    );
  }
}

/* ─── Редактирование турнира ──────────────────────────────────────── */

const EDIT_FIELDS = [
  { key: 'title',       label: 'Название',         prompt: 'Введите новое название:' },
  { key: 'dates',       label: 'Даты (start,end)',  prompt: 'Формат: 2026-08-01,2026-08-02' },
  { key: 'description', label: 'Описание',          prompt: 'Введите описание:' },
  { key: 'prize',       label: 'Общий приз',        prompt: 'Например: 100 000₽' },
  { key: 'format',      label: 'Формат',            prompt: 'Например: Double Elimination' },
  { key: 'limit',       label: 'Лимит MMR',         prompt: 'Например: До 30 000 MMR' },
  { key: 'organizer',   label: 'Организатор',       prompt: 'Название организатора:' },
  { key: 'telegramLink',label: 'Telegram ссылка',   prompt: 'https://t.me/...' },
];

function startEditFlow(ctx, state, userId) {
  state.step = 'edit_choose_field';
  const lines = EDIT_FIELDS.map((f, i) => `<b>${i + 1}.</b> ${f.label}`);
  ctx.reply(`✏️ <b>Редактирование турнира</b>\n\nЧто изменить?\n\n${lines.join('\n')}\n\n/back — назад`, { parse_mode: 'HTML' });
  return true;
}

async function handleEditChooseField(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'main_menu'; state.data = {}; const t = await loadOne(state.tournamentId); await showMainMenu(ctx, t); return true; }
  const num   = parseInt(text, 10);
  const field = EDIT_FIELDS[num - 1];
  if (!field) {
    await ctx.reply(`❌ Введите номер от 1 до ${EDIT_FIELDS.length}:`, { parse_mode: 'HTML' });
    return true;
  }
  state.data.editField = field;
  state.step           = 'edit_value';
  await ctx.reply(`📝 <b>${field.label}</b>\n\n${field.prompt}\n\n/back — назад`, { parse_mode: 'HTML' });
  return true;
}

async function handleEditValue(ctx, state, userId, text) {
  if (text === '/back') { return startEditFlow(ctx, state, userId); }
  const field = state.data.editField;
  await ctx.sendChatAction('typing');
  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, state.tournamentId);
        if (!t) throw new Error('Турнир не найден');
        applyTournamentEdit(t, field.key, text);
        return tournaments;
      },
      `edit: ${state.tournamentId} — ${field.label} (by tg:${userId})`,
    );
    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
    await ctx.reply(`✅ <b>${field.label}</b> обновлено!`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
  state.step = 'main_menu';
  const t = await loadOne(state.tournamentId);
  await showMainMenu(ctx, t);
  return true;
}

function applyTournamentEdit(t, key, value) {
  if (key === 'dates') {
    const [start, end] = value.split(',').map(s => s.trim());
    if (!start || !end) throw new Error('Формат: 2026-08-01,2026-08-02');
    t.start = start; t.end = end;
  } else if (key === 'telegramLink') {
    if (!t.links) t.links = {};
    t.links.telegram = value;
    t.telegramLink   = value;
  } else {
    t[key] = value;
  }
}

/* ─── Призовые места ─────────────────────────────────────────────── */

async function startPrizeFlow(ctx, state, userId, tournament) {
  const pp = (tournament.prizePool || []).sort((a,b)=>(a.place||99)-(b.place||99));
  const current = pp.length
    ? pp.map(p => `  ${p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : p.place+'.'} ${p.amount || '—'}${p.team ? ` — ${p.team}` : ''}`).join('\n')
    : '  (не заданы)';

  state.step      = 'prize_choose_place';
  state.data      = {};
  await ctx.reply(
    `🏅 <b>Призовые места</b>\n\nТекущие:\n${current}\n\nКакое место изменить?\n<b>1</b> · <b>2</b> · <b>3</b>\n\n/back — назад`,
    { parse_mode: 'HTML' }
  );
  return true;
}

async function handlePrizeChoosePlace(ctx, state, userId, text) {
  if (text === '/back') { state.step = 'main_menu'; state.data = {}; const t = await loadOne(state.tournamentId); await showMainMenu(ctx, t); return true; }
  if (!['1','2','3'].includes(text)) { await ctx.reply('Введите 1, 2 или 3:'); return true; }
  state.data.place = parseInt(text, 10);
  state.step       = 'prize_amount';
  await ctx.reply(`Сумма приза за ${text} место (например «60 000₽» или /skip):`);
  return true;
}

async function handlePrizeAmount(ctx, state, userId, text) {
  state.data.amount = text === '/skip' ? null : text;
  state.step        = 'prize_team';
  await ctx.reply(`Команда-призёр за ${state.data.place} место (название или /skip):`);
  return true;
}

async function handlePrizeTeam(ctx, state, userId, text) {
  const team   = text === '/skip' ? '' : text;
  const place  = state.data.place;
  const amount = state.data.amount;

  await ctx.sendChatAction('typing');
  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, state.tournamentId);
        if (!t) throw new Error('Турнир не найден');
        if (!Array.isArray(t.prizePool)) t.prizePool = [];
        const ex = t.prizePool.find(p => p.place === place);
        if (ex) {
          if (amount !== null) ex.amount = amount;
          if (team) ex.team = team;
        } else {
          t.prizePool.push({ place, amount: amount || '', team });
        }
        return tournaments;
      },
      `editprize: ${state.tournamentId} — место ${place}`,
    );
    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
    await ctx.reply(`✅ Место ${place} обновлено!`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
  state.step = 'main_menu';
  const t = await loadOne(state.tournamentId);
  await showMainMenu(ctx, t);
  return true;
}

/* ─── Автозаполнение призёров из сетки ──────────────────────────── */

async function doAutoFillPrizes(ctx, state, userId, tournament) {
  await ctx.sendChatAction('typing');
  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t = findTournamentById(tournaments, state.tournamentId);
        if (!t) throw new Error('Турнир не найден');
        const result = autoFillPrizes(t);
        if (!result.filled) throw new Error(result.message || 'Не удалось определить призёров');
        return tournaments;
      },
      `prizes: ${state.tournamentId} — автоопределение`,
    );
    await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
    const updated = await loadOne(state.tournamentId);
    const pp = (updated.prizePool || []).sort((a,b)=>a.place-b.place)
      .map(p => `${p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'} ${p.team || '—'}: ${p.amount || '—'}`)
      .join('\n');
    await ctx.reply(`🎖 <b>Призёры определены:</b>\n${pp}`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply(`⚠️ ${err.message}`, { parse_mode: 'HTML' });
  }
}

module.exports = { manageCommand, processManageText };
