'use strict';

const { reportMatchWorkflow } = require('../../workflows/reportMatchWorkflow');
const log = require('../../logger');

async function matchCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);

  if (parts.length < 4) {
    return ctx.reply(
      '❌ Формат:\n<code>/match &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;</code>\n\n' +
      'Пример:\n<code>/match SkewerEsports-Season-3 m1 2:1</code>',
      { parse_mode: 'HTML' }
    );
  }

  const tournamentId = parts[1];
  const matchId      = parts[2];
  const scoreMatch   = parts[3].match(/^(\d+):(\d+)$/);

  if (!scoreMatch) {
    return ctx.reply(
      `❌ Некорректный счёт: <code>${parts[3]}</code>\nФормат: <code>2:1</code>`,
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
    });

    let reply = `✅ Матч <code>${matchId}</code> обновлён\nСчёт: <b>${scoreA}:${scoreB}</b>\n`;
    if (result.winner)           reply += `Победитель: <b>${result.winner}</b>\n`;
    if (result.advanced)         reply += `\n➡️ <b>${result.advanced.team}</b> → матч <code>${result.advanced.matchId}</code> (слот ${result.advanced.slot})`;
    if (result.tournamentWinner) reply += `\n\n🏆 <b>${result.tournamentWinner}</b> — победитель турнира!`;
    if (result.warning)          reply += `\n\n⚠️ ${result.warning}`;

    await ctx.reply(reply, { parse_mode: 'HTML' });
  } catch (err) {
    log.error({ tournamentId, matchId, err: err.message }, 'match: ошибка');
    await ctx.reply(`❌ Ошибка:\n<code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

module.exports = { matchCommand };