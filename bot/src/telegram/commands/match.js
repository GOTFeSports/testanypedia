'use strict';

const { reportMatchWorkflow } = require('../../workflows/reportMatchWorkflow');
const log = require('../../logger');

/**
 * /match <tournamentId> <matchId> <scoreA>:<scoreB>
 *
 * Примеры:
 *   /match SkewerEsports-Season-3 m1 2:1
 *   /match SkewerEsports-Season-3 m-final 3:0
 *
 * Только для admin и organizer (enforced middleware requireRole в bot.js).
 */
async function matchCommand(ctx) {
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);

  // parts[0] = '/match', parts[1] = tournamentId, parts[2] = matchId, parts[3] = 'scoreA:scoreB'
  if (parts.length < 4) {
    return ctx.reply(
      '❌ Неверный формат.\n\n' +
      'Использование:\n' +
      '<code>/match &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;</code>\n\n' +
      'Пример:\n' +
      '<code>/match SkewerEsports-Season-3 m1 2:1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const tournamentId = parts[1];
  const matchId      = parts[2];
  const scorePart    = parts[3];

  const scoreMatch = scorePart.match(/^(\d+):(\d+)$/);
  if (!scoreMatch) {
    return ctx.reply(
      `❌ Некорректный счёт: <code>${scorePart}</code>\n` +
      'Формат: <code>число:число</code>, например <code>2:1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const scoreA = parseInt(scoreMatch[1], 10);
  const scoreB = parseInt(scoreMatch[2], 10);

  const telegramId = ctx.from.id;
  const role = ctx.userRole;

  log.info({ telegramId, role, tournamentId, matchId, scoreA, scoreB }, 'match: команда получена');

  // Показываем "печатает..." пока выполняется workflow
  await ctx.sendChatAction('typing');

  try {
    const result = await reportMatchWorkflow({
      tournamentId,
      matchId,
      scoreA,
      scoreB,
      actorTelegramId: telegramId,
      actorRole: role,
    });

    let reply = `✅ Результат матча <code>${matchId}</code> обновлён\n`;
    reply += `Счёт: <b>${scoreA}:${scoreB}</b>\n`;

    if (result.winner) {
      reply += `Победитель: <b>${result.winner}</b>\n`;
    }

    if (result.advanced) {
      reply += `\n➡️ <b>${result.advanced.team}</b> продвинута в матч <code>${result.advanced.matchId}</code> (слот ${result.advanced.slot})`;
    }

    if (result.tournamentWinner) {
      reply += `\n\n🏆 <b>${result.tournamentWinner}</b> — победитель турнира!`;
    }

    if (result.prizesAutoFilled?.filled) {
      const places = result.prizesAutoFilled.places;
      const placesText = Object.entries(places)
        .map(([p, t]) => `${p} место — ${t}`)
        .join('\n');
      reply += `\n\n🎖 <b>Призёры определены автоматически:</b>\n${placesText}`;
    }

    if (result.warning) {
      reply += `\n\n⚠️ ${result.warning}`;
    }

    await ctx.reply(reply, { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ telegramId, tournamentId, matchId, err: err.message }, 'match: ошибка workflow');
    await ctx.reply(
      `❌ Ошибка при обновлении результата:\n<code>${err.message}</code>`,
      { parse_mode: 'HTML' }
    );
  }
}

module.exports = { matchCommand };
