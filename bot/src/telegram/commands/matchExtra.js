'use strict';

const { enqueueCommit } = require('../../github/commitQueue');
const { buildJsMutateFn, findTournamentById, parseJsDataFile } = require('../../data/jsDataFile');
const { getFile } = require('../../github/client');
const { loadBracketEngine } = require('../../data/bracketEngineBridge');
const { logAction } = require('../../activityLog/logger');
const { canManageTournament } = require('../middleware/tournamentAuth');
const REPO_PATHS = require('../../github/repoPaths');
const log = require('../../logger');

const DOTABUFF_RE = /^https?:\/\/(www\.)?dotabuff\.com\/matches\/\d+/;

async function loadTournament(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const t = findTournamentById(tournaments, tournamentId);
  if (!t) throw new Error(`Турнир "${tournamentId}" не найден`);
  return t;
}

/* ─── /matchdb <tId> <mId> <link> ──────────────────────────────── */

async function matchDbCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 4) {
    return ctx.reply(
      '❌ Формат: <code>/matchdb &lt;tournamentId&gt; &lt;matchId&gt; &lt;dotabuff_link&gt;</code>\n\n' +
      'Пример:\n<code>/matchdb LOST-S2-Division2 m15 https://www.dotabuff.com/matches/8321567412</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId, link] = parts;

  if (!DOTABUFF_RE.test(link)) {
    return ctx.reply(
      `❌ Некорректная ссылка Dotabuff.\n\nОжидается формат:\n<code>https://www.dotabuff.com/matches/НОМЕР</code>`,
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
    return ctx.reply(`❌ Нет доступа: ${access.reason}`, { parse_mode: 'HTML' });
  }

  try {
    const mutateFn = buildJsMutateFn(
      REPO_PATHS.DATA_JS,
      (tournaments) => {
        const t  = findTournamentById(tournaments, tournamentId);
        if (!t?.bracket) throw new Error('Сетка не найдена');

        const BE = loadBracketEngine();
        const found = BE.findMatchById(t.bracket, matchId);
        if (!found) throw new Error(`Матч "${matchId}" не найден`);

        // Поддержка серии игр: dotabuffGames[] (массив ссылок для Bo3/Bo5)
        if (!Array.isArray(found.match.dotabuffGames)) found.match.dotabuffGames = [];
        found.match.dotabuffGames.push(link);
        // Также сохраняем последнюю ссылку как основную (обратная совместимость)
        found.match.dotabuff = link;

        return tournaments;
      },
      `matchdb: ${tournamentId}/${matchId} ← ${link} (by tg:${userId})`,
    );

    const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

    try {
      await logAction({
        actorTelegramId: userId,
        actorRole: ctx.userRole || 'organizer',
        action: 'match.dotabuff_added', targetType: 'tournament', targetId: tournamentId,
        details: { matchId, link, commitSha },
      });
    } catch (_) {}

    await ctx.reply(
      `✅ Dotabuff-ссылка добавлена к матчу <code>${matchId}</code>\n\n` +
      `${link}\n\n` +
      `Список игр: <code>/matchgames ${tournamentId} ${matchId}</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'matchdb: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /matchgames <tId> <mId> ──────────────────────────────────── */

async function matchGamesCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Формат: <code>/matchgames &lt;tournamentId&gt; &lt;matchId&gt;</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  await ctx.sendChatAction('typing');

  try {
    const tournament = await loadTournament(tournamentId);
    if (!tournament.bracket) throw new Error('У турнира нет сетки');

    const BE = loadBracketEngine();
    const found = BE.findMatchById(tournament.bracket, matchId);
    if (!found) throw new Error(`Матч "${matchId}" не найден`);

    const match = found.match;
    const games = Array.isArray(match.dotabuffGames) ? match.dotabuffGames : (match.dotabuff ? [match.dotabuff] : []);

    // Определяем формат серии (Bo3/Bo5) по умолчанию из tournament.format,
    // иначе ограничиваем по факту имеющихся игр + 1 (следующая игра ожидается)
    const formatStr = (tournament.format || '').toLowerCase();
    let maxGames = 3; // default Bo3
    if (formatStr.includes('bo5') || formatStr.includes('best of 5')) maxGames = 5;
    else if (formatStr.includes('bo1') || formatStr.includes('best of 1')) maxGames = 1;
    else if (formatStr.includes('bo3') || formatStr.includes('best of 3')) maxGames = 3;

    if (!games.length) {
      return ctx.reply(
        `🎮 <b>${match.teamA} vs ${match.teamB}</b>\n\n` +
        `Игр пока не добавлено.\n\n` +
        `Добавить: <code>/matchdb ${tournamentId} ${matchId} &lt;ссылка&gt;</code>`,
        { parse_mode: 'HTML' }
      );
    }

    const lines = games.slice(0, maxGames).map((link, i) =>
      `<b>Игра ${i + 1}:</b> ${link}`
    );

    await ctx.reply(
      `🎮 <b>${match.teamA} vs ${match.teamB}</b>\n` +
      `Серия: Bo${maxGames}\n\n` +
      lines.join('\n') +
      (games.length > maxGames ? `\n\n⚠️ Добавлено игр больше чем ожидается для Bo${maxGames} (${games.length})` : ''),
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'matchgames: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

module.exports = { matchDbCommand, matchGamesCommand };
