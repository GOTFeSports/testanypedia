'use strict';

const { enqueueCommit } = require('../../github/commitQueue');
const { buildJsMutateFn, findTournamentById, parseJsDataFile } = require('../../data/jsDataFile');
const { getFile } = require('../../github/client');
const { logAction } = require('../../activityLog/logger');
const { canManageTournament } = require('../middleware/tournamentAuth');
const REPO_PATHS = require('../../github/repoPaths');
const log = require('../../logger');

const WIZARD_TTL_MS = 10 * 60 * 1000;
const editStates  = new Map(); // userId → { tournamentId, field, step }
const prizeStates = new Map(); // userId → { tournamentId, place, step }

async function loadTournament(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const t = findTournamentById(tournaments, tournamentId);
  if (!t) throw new Error(`Турнир "${tournamentId}" не найден`);
  return t;
}

/* ─── /edittournament <id> ─────────────────────────────────────── */

const EDIT_FIELDS = {
  '1': { key: 'title',       label: 'Название',        prompt: 'Введите новое название:' },
  '2': { key: 'dates',       label: 'Даты',             prompt: 'Введите даты в формате start,end (YYYY-MM-DD,YYYY-MM-DD):' },
  '3': { key: 'description', label: 'Описание',         prompt: 'Введите новое описание:' },
  '4': { key: 'prize',       label: 'Призовой фонд',    prompt: 'Введите общий призовой фонд (например 100000₽):' },
  '5': { key: 'links',       label: 'Ссылки',           prompt: 'Введите telegram-ссылку (или /skip для пропуска этого поля):' },
  '6': { key: 'format',      label: 'Формат',           prompt: 'Введите формат (например Double Elimination):' },
  '7': { key: 'limit',       label: 'Лимит',            prompt: 'Введите лимит (например До 30 000 MMR):' },
  '8': { key: 'organizer',   label: 'Организатор',      prompt: 'Введите название организатора:' },
};

async function editTournamentCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply('❌ Укажите id турнира.\n\n<code>/edittournament &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
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

  editStates.set(userId, { tournamentId, step: 'choose_field', startedAt: Date.now() });

  await ctx.reply(
    `✏️ <b>Редактирование турнира</b> · <code>${tournamentId}</code>\n\n` +
    `Что изменить?\n\n` +
    Object.entries(EDIT_FIELDS).map(([n, f]) => `<b>${n}</b> — ${f.label}`).join('\n') +
    `\n\n/cancel — отменить`,
    { parse_mode: 'HTML' }
  );
}

async function processEditText(ctx) {
  const userId = ctx.from?.id;
  const state  = editStates.get(userId);
  if (!state || Date.now() - state.startedAt > WIZARD_TTL_MS) { editStates.delete(userId); return false; }

  const text = (ctx.message?.text || '').trim();

  if (text === '/cancel') {
    editStates.delete(userId);
    await ctx.reply('❌ Редактирование отменено.');
    return true;
  }

  if (state.step === 'choose_field') {
    const field = EDIT_FIELDS[text];
    if (!field) {
      await ctx.reply('❌ Введите номер от 1 до 8:', { parse_mode: 'HTML' });
      return true;
    }
    state.field = field;
    state.step  = 'enter_value';
    await ctx.reply(`📝 <b>${field.label}</b>\n\n${field.prompt}`, { parse_mode: 'HTML' });
    return true;
  }

  if (state.step === 'enter_value') {
    editStates.delete(userId);
    await ctx.sendChatAction('typing');

    try {
      const mutateFn = buildJsMutateFn(
        REPO_PATHS.DATA_JS,
        (tournaments) => {
          const t = findTournamentById(tournaments, state.tournamentId);
          if (!t) throw new Error(`Турнир "${state.tournamentId}" не найден`);

          applyEdit(t, state.field.key, text);
          return tournaments;
        },
        `edit: ${state.tournamentId} — ${state.field.label} (by tg:${userId})`,
      );

      const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

      try {
        await logAction({
          actorTelegramId: userId,
          actorRole: ctx.userRole || 'organizer',
          action: 'tournament.edited', targetType: 'tournament', targetId: state.tournamentId,
          details: { field: state.field.key, value: text, commitSha },
        });
      } catch (_) {}

      await ctx.reply(
        `✅ <b>${state.field.label}</b> обновлено!\n\nПросмотр: <code>/tournament ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      log.error({ err: err.message }, 'edittournament: ошибка');
      await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
    }
    return true;
  }

  return false;
}

function applyEdit(tournament, fieldKey, value) {
  switch (fieldKey) {
    case 'title':
      tournament.title = value;
      break;
    case 'dates': {
      const [start, end] = value.split(',').map(s => s.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        throw new Error('Неверный формат дат. Используйте: start,end (YYYY-MM-DD,YYYY-MM-DD)');
      }
      tournament.start = start;
      tournament.end   = end;
      break;
    }
    case 'description':
      tournament.description = value;
      break;
    case 'prize':
      tournament.prize = value;
      break;
    case 'links':
      if (!tournament.links) tournament.links = {};
      tournament.links.telegram = value;
      tournament.telegramLink = value;
      break;
    case 'format':
      tournament.format = value;
      break;
    case 'limit':
      tournament.limit = value;
      break;
    case 'organizer':
      tournament.organizer = value;
      break;
    default:
      throw new Error(`Неизвестное поле: ${fieldKey}`);
  }
}

/* ─── /editprize <id> ──────────────────────────────────────────── */

async function editPrizeCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const tournamentId = parts[1];

  if (!tournamentId) {
    return ctx.reply('❌ Укажите id турнира.\n\n<code>/editprize &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
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

  const current = (tournament.prizePool || [])
    .sort((a,b)=>(a.place||99)-(b.place||99))
    .map(p => `  ${p.place} место: ${p.amount || '—'}${p.team ? ` (${p.team})` : ''}`)
    .join('\n') || '  (не заданы)';

  prizeStates.set(userId, { tournamentId, step: 'choose_place', startedAt: Date.now() });

  await ctx.reply(
    `🏆 <b>Редактирование призовых</b> · <code>${tournamentId}</code>\n\n` +
    `Текущие:\n${current}\n\n` +
    `Какое место изменить?\n<b>1</b> · <b>2</b> · <b>3</b>\n\n/cancel — отменить`,
    { parse_mode: 'HTML' }
  );
}

async function processPrizeText(ctx) {
  const userId = ctx.from?.id;
  const state  = prizeStates.get(userId);
  if (!state || Date.now() - state.startedAt > WIZARD_TTL_MS) { prizeStates.delete(userId); return false; }

  const text = (ctx.message?.text || '').trim();

  if (text === '/cancel') {
    prizeStates.delete(userId);
    await ctx.reply('❌ Редактирование призовых отменено.');
    return true;
  }

  if (state.step === 'choose_place') {
    if (!['1','2','3'].includes(text)) {
      await ctx.reply('❌ Введите 1, 2 или 3:', { parse_mode: 'HTML' });
      return true;
    }
    state.place = parseInt(text, 10);
    state.step  = 'enter_amount';
    await ctx.reply(`Введите сумму приза за ${state.place} место (например «60 000₽»):`, { parse_mode: 'HTML' });
    return true;
  }

  if (state.step === 'enter_amount') {
    state.amount = text;
    state.step   = 'enter_team';
    await ctx.reply('Введите название команды-победителя (или /skip оставить пустым):', { parse_mode: 'HTML' });
    return true;
  }

  if (state.step === 'enter_team') {
    const team = text === '/skip' ? '' : text;
    prizeStates.delete(userId);
    await ctx.sendChatAction('typing');

    try {
      const mutateFn = buildJsMutateFn(
        REPO_PATHS.DATA_JS,
        (tournaments) => {
          const t = findTournamentById(tournaments, state.tournamentId);
          if (!t) throw new Error(`Турнир "${state.tournamentId}" не найден`);
          if (!Array.isArray(t.prizePool)) t.prizePool = [];

          const existing = t.prizePool.find(p => p.place === state.place);
          if (existing) {
            existing.amount = state.amount;
            if (team) existing.team = team;
          } else {
            t.prizePool.push({ place: state.place, amount: state.amount, team });
          }
          return tournaments;
        },
        `editprize: ${state.tournamentId} — место ${state.place} (by tg:${userId})`,
      );

      const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

      try {
        await logAction({
          actorTelegramId: userId,
          actorRole: ctx.userRole || 'organizer',
          action: 'tournament.prize_edited', targetType: 'tournament', targetId: state.tournamentId,
          details: { place: state.place, amount: state.amount, team, commitSha },
        });
      } catch (_) {}

      await ctx.reply(
        `✅ <b>${state.place} место</b> обновлено: ${state.amount}${team ? ` — ${team}` : ''}\n\n` +
        `Просмотр: <code>/tournament ${state.tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      log.error({ err: err.message }, 'editprize: ошибка');
      await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
    }
    return true;
  }

  return false;
}

/* ─── Точка входа ──────────────────────────────────────────────── */

async function processEditTournamentText(ctx) {
  const h1 = await processEditText(ctx);
  if (h1) return true;
  return processPrizeText(ctx);
}

module.exports = { editTournamentCommand, editPrizeCommand, processEditTournamentText };
