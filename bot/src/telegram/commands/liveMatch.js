'use strict';

const { reportMatchWorkflow }           = require('../../workflows/reportMatchWorkflow');
const { startMatchWorkflow, endMatchWorkflow, findMatchInTournament } = require('../../workflows/matchStatusWorkflow');
const { loadBracketEngine }             = require('../../data/bracketEngineBridge');
const { getFile }                       = require('../../github/client');
const { parseJsDataFile, findTournamentById } = require('../../data/jsDataFile');
const { canManageTournament }           = require('../middleware/tournamentAuth');
const REPO_PATHS                        = require('../../github/repoPaths');
const config                            = require('../../config');
const log                               = require('../../logger');

/* ─── Константы ────────────────────────────────────────────────── */
const STATUS_EMOJI = { scheduled: '🕐', live: '🔴', finished: '✅' };
const STATUS_RU    = { scheduled: 'Скоро', live: 'Идёт', finished: 'Завершён' };

/* ─── Вспомогательные ──────────────────────────────────────────── */

async function loadTournamentFromGitHub(tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден в репозитории');
  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const tournament  = findTournamentById(tournaments, tournamentId);
  if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
  return tournament;
}

/** Карточка матча для matchinfo */
function matchCard(match, showNext) {
  const status  = STATUS_EMOJI[match.status] || '❓';
  const statusR = STATUS_RU[match.status]    || match.status;
  const sc      = `${match.scoreA ?? 0}:${match.scoreB ?? 0}`;
  let text =
    `${status} <b>${match.teamA ?? 'TBD'}</b> vs <b>${match.teamB ?? 'TBD'}</b>\n` +
    `Счёт: <b>${sc}</b> · Статус: ${statusR}\n` +
    `ID матча: <code>${match.id}</code>`;
  if (match.winner)  text += `\n🏆 Победитель: <b>${match.winner}</b>`;
  if (match.isFinal) text += '\n🏁 Финальный матч';
  if (showNext)      text += `\n➡️ Следующий: <code>${showNext}</code>`;
  return text;
}

/**
 * Проверка прав на управление турниром.
 * Возвращает { allowed, reason }.
 */
function checkAccess(userId, tournament) {
  return canManageTournament(userId, tournament);
}

/* ─── /match ───────────────────────────────────────────────────── */

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
  const userId = ctx.from?.id;

  // Проверяем права
  let tournament;
  try {
    tournament = await loadTournamentFromGitHub(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const access = checkAccess(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(
      `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`,
      { parse_mode: 'HTML' }
    );
  }

  log.info({ tournamentId, matchId, scoreA, scoreB }, 'match: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await reportMatchWorkflow({
      tournamentId, matchId, scoreA, scoreB,
      actorTelegramId: userId,
      actorRole: ctx.userRole,
      force: false,
    });

    let reply =
      `✅ Матч <code>${matchId}</code> обновлён\n` +
      `Счёт: <b>${scoreA}:${scoreB}</b>\n`;
    if (result.winner)           reply += `Победитель: <b>${result.winner}</b>\n`;
    if (result.advanced)         reply += `\n➡️ <b>${result.advanced.team}</b> → матч <code>${result.advanced.matchId}</code> (слот ${result.advanced.slot})`;
    if (result.tournamentWinner) reply += `\n\n🏆 <b>${result.tournamentWinner}</b> — победитель турнира!`;
    if (result.prizesAutoFilled?.filled) {
      const pl = Object.entries(result.prizesAutoFilled.places).map(([p,t])=>`${p} место — ${t}`).join('\n');
      reply += `\n\n🎖 <b>Призёры определены:</b>\n${pl}`;
    }
    if (result.warning)          reply += `\n\n⚠️ ${result.warning}`;

    await ctx.reply(reply, { parse_mode: 'HTML' });
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'match: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /startmatch ─────────────────────────────────────────────── */

async function startMatchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Формат: <code>/startmatch &lt;tournamentId&gt; &lt;matchId&gt;</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  const userId = ctx.from?.id;

  let tournament;
  try {
    tournament = await loadTournamentFromGitHub(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const access = checkAccess(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(
      `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`,
      { parse_mode: 'HTML' }
    );
  }

  log.info({ tournamentId, matchId, actor: userId }, 'startmatch: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await startMatchWorkflow({
      tournamentId, matchId,
      actorTelegramId: userId,
      actorRole: ctx.userRole,
    });
    await ctx.reply(`🔴 <b>Матч запущен!</b>\n\n${matchCard(result.match)}`, { parse_mode: 'HTML' });
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
      '❌ Формат: <code>/endmatch &lt;tournamentId&gt; &lt;matchId&gt;</code>',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId] = parts;
  const userId = ctx.from?.id;

  let tournament;
  try {
    tournament = await loadTournamentFromGitHub(tournamentId);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }

  const access = checkAccess(userId, tournament);
  if (!access.allowed) {
    return ctx.reply(
      `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${access.reason}`,
      { parse_mode: 'HTML' }
    );
  }

  log.info({ tournamentId, matchId, actor: userId }, 'endmatch: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await endMatchWorkflow({
      tournamentId, matchId,
      actorTelegramId: userId,
      actorRole: ctx.userRole,
    });
    await ctx.reply(`✅ <b>Матч завершён!</b>\n\n${matchCard(result.match)}`, { parse_mode: 'HTML' });
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
      '⚠️ Только для исправления ошибочных результатов.',
      { parse_mode: 'HTML' }
    );
  }

  const [, tournamentId, matchId, scorePart] = parts;
  const scoreMatch = scorePart?.match(/^(\d+):(\d+)$/);
  if (!scoreMatch) {
    return ctx.reply(
      `❌ Некорректный счёт: <code>${scorePart}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  const userId = ctx.from?.id;

  // forcematch — только глобальные администраторы
  if (!config.admins.includes(userId)) {
    return ctx.reply('❌ /forcematch доступен только администраторам.', { parse_mode: 'HTML' });
  }

  const scoreA = parseInt(scoreMatch[1], 10);
  const scoreB = parseInt(scoreMatch[2], 10);

  log.warn({ tournamentId, matchId, scoreA, scoreB, actor: userId }, 'forcematch: FORCE операция');
  await ctx.sendChatAction('typing');

  try {
    const result = await reportMatchWorkflow({
      tournamentId, matchId, scoreA, scoreB,
      actorTelegramId: userId,
      actorRole: ctx.userRole,
      force: true,
    });

    let reply =
      `⚠️ <b>[FORCE] Результат перезаписан</b>\n\n` +
      `Матч: <code>${matchId}</code>\n` +
      `Счёт: <b>${scoreA}:${scoreB}</b>\n`;
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

/**
 * Генерирует читаемое имя раунда по его номеру и общему кол-ву раундов.
 * Например: последний раунд = "Финал", предпоследний = "Полуфиналы" и т.д.
 */
function roundName(round, totalRounds) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return 'Полуфиналы';
  if (fromEnd === 2) return 'Четвертьфиналы';
  return `Раунд ${round}`;
}

async function bracketCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 2) {
    return ctx.reply('❌ Формат: <code>/bracket &lt;tournamentId&gt;</code>', { parse_mode: 'HTML' });
  }

  const tournamentId = parts[1];
  log.info({ tournamentId, actor: ctx.from?.id }, 'bracket: команда');
  await ctx.sendChatAction('typing');

  try {
    const tournament = await loadTournamentFromGitHub(tournamentId);

    if (!tournament.bracket?.stages?.length) {
      return ctx.reply(
        `📋 <b>${tournament.title}</b>\n\nСетка не создана.\n\n` +
        (tournament.bracketEmbed
          ? `Внешняя сетка: ${tournament.bracketEmbed}`
          : `Создать: <code>/createbracket ${tournamentId}</code>`),
        { parse_mode: 'HTML' }
      );
    }

    const lines        = [`🏆 <b>${tournament.title}</b>\n`];
    let totalMatches   = 0;
    let finishedMatches= 0;

    // Дедупликация стадий по имени — не показываем дубли
    const seenStageNames = new Set();

    for (const stage of tournament.bracket.stages) {
      // Пропускаем дубликаты стадий (возникают при объединении генераторов)
      if (seenStageNames.has(stage.name)) continue;
      seenStageNames.add(stage.name);

      const stageMatches = stage.matches || [];
      if (!stageMatches.length) continue;

      // Заголовок стадии
      if (stage.isSwiss) {
        lines.push(`\n<b>══ 🔄 ${stage.name} ══</b>`);
      } else if (stage.isGroup) {
        lines.push(`\n<b>══ 🗂 ${stage.name} ══</b>`);
      } else {
        lines.push(`\n<b>══ 🏆 ${stage.name} ══</b>`);
      }

      // Группируем по раунду
      const byRound = {};
      for (const m of stageMatches) {
        const r = m.round ?? 1;
        if (!byRound[r]) byRound[r] = [];
        byRound[r].push(m);
        totalMatches++;
        if (m.status === 'finished') finishedMatches++;
      }

      const rounds      = Object.keys(byRound).map(Number).sort((a, b) => a - b);
      const totalRounds = rounds.length;

      for (const r of rounds) {
        const rName = totalRounds > 1
          ? (stage.isSwiss || stage.isGroup ? `Тур ${r}` : roundName(r, totalRounds))
          : null;
        if (rName) lines.push(`  <i>${rName}:</i>`);

        for (const m of byRound[r]) {
          const tA = m.teamA || 'TBD';
          const tB = m.teamB || 'TBD';
          let line;

          if (m.status === 'finished' && m.winner) {
            const aWon = m.winner === m.teamA;
            line = aWon
              ? `✅ <b>${tA}</b> ${m.scoreA}:${m.scoreB} ${tB}`
              : `✅ ${tA} ${m.scoreA}:${m.scoreB} <b>${tB}</b>`;
          } else if (m.status === 'live') {
            line = `🔴 ${tA} ${m.scoreA ?? 0}:${m.scoreB ?? 0} ${tB}`;
          } else {
            line = `🕐 ${tA} vs ${tB}`;
          }

          if (m.isFinal && m.status !== 'finished') line += ' 🏁';
          // ID матча рядом — для использования в /match и /matchinfo
          line += `  <code>${m.id}</code>`;
          lines.push(`  ${line}`);
        }
      }
    }

    // Swiss таблица если есть
    const hasSwiss = tournament.bracket.stages.some(s => s.isSwiss);
    if (hasSwiss && tournament.bracket.swissConfig) {
      const { computeSwissStandings } = require('../../workflows/bracketGenerator');
      const standings = computeSwissStandings(tournament.bracket);
      if (standings.size) {
        lines.push('\n<b>📊 Swiss таблица:</b>');
        const { winsToAdvance, lossesToElim } = tournament.bracket.swissConfig;
        [...standings.values()]
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
          .forEach(s => {
            const icon = s.advanced ? '✅' : s.eliminated ? '❌' : '⏳';
            lines.push(`  ${icon} ${s.name}: ${s.wins}W–${s.losses}L`);
          });
      }
    }

    // Прогресс
    const pct = totalMatches > 0 ? Math.round(finishedMatches / totalMatches * 100) : 0;
    lines.push(`\n📊 <b>Прогресс:</b> ${finishedMatches}/${totalMatches} (${pct}%)`);

    if (tournament.winner) {
      lines.push(`🏆 <b>Победитель: ${tournament.winner}</b>`);
    }

    lines.push(`\n<code>/matchinfo ${tournamentId} &lt;matchId&gt;</code>`);

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
      '❌ Формат: <code>/matchinfo &lt;tournamentId&gt; &lt;matchId&gt;</code>',
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
        `❌ Матч <code>${matchId}</code> не найден.\n\n` +
        `Посмотреть сетку: <code>/bracket ${tournamentId}</code>`,
        { parse_mode: 'HTML' }
      );
    }

    const match = found.match;
    const stage = found.stage;

    let nextMatchId = null;
    if (!match.isFinal && match.status !== 'finished') {
      const adv = BE.resolveAdvancement(tournament.bracket, matchId);
      nextMatchId = adv?.matchId ?? null;
    }

    const userId  = ctx.from?.id;
    const access  = canManageTournament(userId, tournament);
    const lines   = [
      `🎮 <b>${tournament.title}</b>`,
      `Стадия: ${stage.name}`,
      '',
      matchCard(match, nextMatchId),
      '',
      `Турнир: <code>${tournamentId}</code>`,
    ];

    if (access.allowed) {
      if (match.status === 'scheduled') {
        lines.push('', `▶️ <code>/startmatch ${tournamentId} ${matchId}</code>`);
        lines.push(`📊 <code>/match ${tournamentId} ${matchId} X:X</code>`);
      } else if (match.status === 'live') {
        lines.push('', `📊 <code>/match ${tournamentId} ${matchId} X:X</code>`);
        lines.push(`⏹ <code>/endmatch ${tournamentId} ${matchId}</code>`);
      } else if (match.status === 'finished' && config.admins.includes(userId)) {
        lines.push('', `⚠️ <code>/forcematch ${tournamentId} ${matchId} X:X</code>`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'matchinfo: ошибка');
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
