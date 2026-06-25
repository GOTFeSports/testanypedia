'use strict';

const { startMatchWorkflow, endMatchWorkflow, findMatchInTournament } = require('../../workflows/matchStatusWorkflow');
const { reportMatchWorkflow } = require('../../workflows/reportMatchWorkflow');
const { loadBracketEngine } = require('../../data/bracketEngineBridge');
const { getFile } = require('../../github/client');
const { parseJsDataFile, findTournamentById } = require('../../data/jsDataFile');
const REPO_PATHS = require('../../github/repoPaths');
const config = require('../../config');
const log = require('../../logger');

/* ─── вспомогательные функции ─────────────────────────────────── */

function isSuperAdmin(telegramId) {
  // Супер-админы = первый id из ADMIN_TELEGRAM_IDS (или можно расширить через config)
  return config.admins.includes(telegramId);
}

const STATUS_EMOJI = { scheduled: '🕐', live: '🔴', finished: '✅' };
const STATUS_RU    = { scheduled: 'Скоро', live: 'Идёт', finished: 'Завершён' };

function matchCard(match, showNext = null) {
  const status  = STATUS_EMOJI[match.status] || '❓';
  const statusR = STATUS_RU[match.status]    || match.status;
  const score   = `${match.scoreA ?? 0}:${match.scoreB ?? 0}`;

  let text =
    `${status} <b>${match.teamA ?? 'TBD'}</b> vs <b>${match.teamB ?? 'TBD'}</b>\n` +
    `Счёт: <b>${score}</b> · Статус: ${statusR}\n` +
    `ID матча: <code>${match.id}</code>`;

  if (match.winner)  text += `\n🏆 Победитель: <b>${match.winner}</b>`;
  if (match.isFinal) text += '\n🏁 Финальный матч';
  if (showNext)      text += `\n➡️ Следующий матч: <code>${showNext}</code>`;

  return text;
}

async function loadTournamentFromGitHub(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден в репозитории');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const tournament  = findTournamentById(tournaments, tournamentId);
  if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
  return tournament;
}

/* ─── /startmatch ─────────────────────────────────────────────── */

async function startMatchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Формат: <code>/startmatch &lt;tournamentId&gt; &lt;matchId&gt;</code>\n\n' +
      'Пример: <code>/startmatch SkewerEsports-Season-3 m1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  log.info({ tournamentId, matchId, actor: ctx.from?.id }, 'startmatch: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await startMatchWorkflow({
      tournamentId, matchId,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
    });

    await ctx.reply(
      `🔴 <b>Матч запущен!</b>\n\n` + matchCard(result.match),
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'startmatch: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /endmatch ───────────────────────────────────────────────── */

async function endMatchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Формат: <code>/endmatch &lt;tournamentId&gt; &lt;matchId&gt;</code>\n\n' +
      'Пример: <code>/endmatch SkewerEsports-Season-3 m1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  log.info({ tournamentId, matchId, actor: ctx.from?.id }, 'endmatch: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await endMatchWorkflow({
      tournamentId, matchId,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
    });

    await ctx.reply(
      `✅ <b>Матч завершён!</b>\n\n` + matchCard(result.match),
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'endmatch: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /forcematch ─────────────────────────────────────────────── */

async function forceMatchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 4) {
    return ctx.reply(
      '❌ Формат: <code>/forcematch &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;</code>\n\n' +
      'Пример: <code>/forcematch SkewerEsports-Season-3 m1 2:1</code>\n\n' +
      '⚠️ Используйте только для исправления ошибочно внесённых результатов.',
      { parse_mode: 'HTML' }
    );
  }

  // Только супер-админы
  if (!isSuperAdmin(ctx.from?.id)) {
    return ctx.reply('❌ Команда /forcematch доступна только супер-администраторам.', { parse_mode: 'HTML' });
  }

  const [, tournamentId, matchId, scorePart] = parts;
  const scoreMatch = scorePart?.match(/^(\d+):(\d+)$/);

  if (!scoreMatch) {
    return ctx.reply(
      `❌ Некорректный счёт: <code>${scorePart}</code>\nФормат: <code>2:1</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const scoreA = parseInt(scoreMatch[1], 10);
  const scoreB = parseInt(scoreMatch[2], 10);

  log.warn({ tournamentId, matchId, scoreA, scoreB, actor: ctx.from?.id }, 'forcematch: FORCE операция');
  await ctx.sendChatAction('typing');

  try {
    const result = await reportMatchWorkflow({
      tournamentId, matchId, scoreA, scoreB,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
      force: true,
    });

    let reply =
      `⚠️ <b>[FORCE] Результат перезаписан</b>\n\n` +
      `Матч: <code>${matchId}</code>\n` +
      `Новый счёт: <b>${scoreA}:${scoreB}</b>\n`;

    if (result.winner)           reply += `Победитель: <b>${result.winner}</b>\n`;
    if (result.advanced)         reply += `➡️ <b>${result.advanced.team}</b> → матч <code>${result.advanced.matchId}</code>\n`;
    if (result.tournamentWinner) reply += `\n🏆 <b>${result.tournamentWinner}</b> — победитель турнира!`;

    await ctx.reply(reply, { parse_mode: 'HTML' });
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'forcematch: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /bracket ────────────────────────────────────────────────── */

async function bracketCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 2) {
    return ctx.reply(
      '❌ Формат: <code>/bracket &lt;tournamentId&gt;</code>\n\n' +
      'Пример: <code>/bracket SkewerEsports-Season-3</code>',
      { parse_mode: 'HTML' }
    );
  }

  const tournamentId = parts[1];
  log.info({ tournamentId, actor: ctx.from?.id }, 'bracket: команда');
  await ctx.sendChatAction('typing');

  try {
    const tournament = await loadTournamentFromGitHub(tournamentId);

    if (!tournament.bracket?.stages?.length) {
      return ctx.reply(
        `📋 <b>${tournament.title}</b>\n\nСобственная сетка не создана.\n\n` +
        (tournament.bracketEmbed
          ? `Внешняя сетка: ${tournament.bracketEmbed}`
          : `Создать сетку: <code>/createbracket ${tournamentId}</code>`),
        { parse_mode: 'HTML' }
      );
    }

    const lines = [`🏆 <b>${tournament.title}</b>\n`];
    let totalMatches = 0, finishedMatches = 0;

    for (const stage of tournament.bracket.stages) {
      lines.push(`\n<b>═══ ${stage.name} ═══</b>`);

      const byRound = {};
      for (const m of (stage.matches || [])) {
        const r = m.round ?? 1;
        if (!byRound[r]) byRound[r] = [];
        byRound[r].push(m);
        totalMatches++;
        if (m.status === 'finished') finishedMatches++;
      }

      const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

      for (const r of rounds) {
        const roundMatches = byRound[r];
        if (rounds.length > 1) {
          lines.push(`  <i>Раунд ${r}:</i>`);
        }

        for (const m of roundMatches) {
          const s  = STATUS_EMOJI[m.status] || '❓';
          const tA = m.teamA || 'TBD';
          const tB = m.teamB || 'TBD';
          const sc = `${m.scoreA ?? 0}:${m.scoreB ?? 0}`;

          let line = `  ${s} `;

          if (m.status === 'finished' && m.winner) {
            // Подсвечиваем победителя жирным
            const aW = m.winner === m.teamA;
            line += aW
              ? `<b>${tA}</b> ${sc} ${tB}`
              : `${tA} ${sc} <b>${tB}</b>`;
            line += ` 🏆`;
          } else {
            line += `${tA} vs ${tB}`;
            if (m.status === 'live') line += `  [${sc}]`;
          }

          if (m.isFinal)     line += ' 🏁';
          line += `  <code>${m.id}</code>`;

          lines.push(line);
        }
      }
    }

    // Прогресс
    const pct = totalMatches > 0 ? Math.round(finishedMatches / totalMatches * 100) : 0;
    lines.push(`\n📊 Прогресс: ${finishedMatches}/${totalMatches} матчей (${pct}%)`);

    if (tournament.winner) {
      lines.push(`\n🏆 <b>Победитель турнира: ${tournament.winner}</b>`);
    }

    lines.push(`\nПодробности: <code>/matchinfo ${tournamentId} &lt;matchId&gt;</code>`);

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ tournamentId, err: err.message }, 'bracket: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}



/* ─── /matchinfo ──────────────────────────────────────────────── */

async function matchInfoCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Формат: <code>/matchinfo &lt;tournamentId&gt; &lt;matchId&gt;</code>\n\n' +
      'Пример: <code>/matchinfo SkewerEsports-Season-3 m1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  log.info({ tournamentId, matchId, actor: ctx.from?.id }, 'matchinfo: команда');
  await ctx.sendChatAction('typing');

  try {
    const tournament = await loadTournamentFromGitHub(tournamentId);

    if (!tournament.bracket) {
      return ctx.reply(`У турнира "${tournamentId}" нет сетки.`, { parse_mode: 'HTML' });
    }

    const BE    = loadBracketEngine();
    const found = BE.findMatchById(tournament.bracket, matchId);

    if (!found) {
      return ctx.reply(
        `❌ Матч <code>${matchId}</code> не найден в сетке турнира <b>${tournament.title}</b>.\n\n` +
        `Посмотреть сетку: <code>/bracket ${tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    }

    const match = found.match;
    const stage = found.stage;

    // Вычисляем следующий матч
    let nextMatchId = null;
    if (!match.isFinal && match.status !== 'finished') {
      const adv = BE.resolveAdvancement(tournament.bracket, matchId);
      nextMatchId = adv?.matchId ?? null;
    }

    const lines = [
      `🎮 <b>${tournament.title}</b>`,
      `Стадия: ${stage.name}`,
      '',
      matchCard(match, nextMatchId),
      '',
      `Турнир: <code>${tournamentId}</code>`,
    ];

    // Подсказки по действиям
    const isAdmin = ctx.userRole === 'admin' || ctx.userRole === 'organizer';
    if (isAdmin) {
      if (match.status === 'scheduled') {
        lines.push('', `▶️ Запустить: <code>/startmatch ${tournamentId} ${matchId}</code>`);
        lines.push(`📊 Внести счёт: <code>/match ${tournamentId} ${matchId} X:X</code>`);
      } else if (match.status === 'live') {
        lines.push('', `📊 Обновить счёт: <code>/match ${tournamentId} ${matchId} X:X</code>`);
        lines.push(`⏹ Завершить: <code>/endmatch ${tournamentId} ${matchId}</code>`);
      } else if (match.status === 'finished') {
        lines.push('', `⚠️ Исправить: <code>/forcematch ${tournamentId} ${matchId} X:X</code>`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'matchinfo: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /match (обновлённый обработчик) ────────────────────────── */

async function matchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 4) {
    return ctx.reply(
      '❌ Формат: <code>/match &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;</code>\n\n' +
      'Пример: <code>/match SkewerEsports-Season-3 m1 2:1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId, scorePart] = parts;
  const scoreMatch = scorePart.match(/^(\d+):(\d+)$/);

  if (!scoreMatch) {
    return ctx.reply(
      `❌ Некорректный счёт: <code>${scorePart}</code>\nФормат: <code>2:1</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const scoreA = parseInt(scoreMatch[1], 10);
  const scoreB = parseInt(scoreMatch[2], 10);

  log.info({ tournamentId, matchId, scoreA, scoreB }, 'match: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await reportMatchWorkflow({
      tournamentId, matchId, scoreA, scoreB,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
      force: false,
    });

    let reply =
      `✅ Матч <code>${matchId}</code> обновлён\n` +
      `Счёт: <b>${scoreA}:${scoreB}</b>\n`;

    if (result.winner)           reply += `Победитель: <b>${result.winner}</b>\n`;
    if (result.advanced)         reply += `\n➡️ <b>${result.advanced.team}</b> → матч <code>${result.advanced.matchId}</code> (слот ${result.advanced.slot})`;
    if (result.tournamentWinner) reply += `\n\n🏆 <b>${result.tournamentWinner}</b> — победитель турнира!`;
    if (result.warning)          reply += `\n\n⚠️ ${result.warning}`;

    await ctx.reply(reply, { parse_mode: 'HTML' });
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'match: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

module.exports = {
  matchCommand,
  startMatchCommand,
  endMatchCommand,
  forceMatchCommand,
  bracketCommand,
  matchInfoCommand,
};
