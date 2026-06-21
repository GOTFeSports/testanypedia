'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config');
const log    = require('../logger');

const { requireRole }                   = require('./middleware/auth');
const { rateLimit }                     = require('./middleware/rateLimiter');
const { matchCommand }                  = require('./commands/match');
const { draftCommand }                  = require('./commands/draft');
const { approveCommand, rejectCommand } = require('./commands/moderate');
const { subscribeCommand, unsubscribeCommand } = require('./commands/subscribe');
const { statusCommand }                 = require('./commands/status');

function createBot() {
  const bot = new Telegraf(config.bot.token);

  bot.catch((err, ctx) => {
    log.error({ update: ctx.updateType, from: ctx.from?.id, err: err.message }, 'bot: необработанная ошибка');
    ctx.reply('⚙️ Внутренняя ошибка.').catch(() => {});
  });

  bot.use(rateLimit({ maxRequests: 10, windowMs: 60_000 }));

  bot.start(async (ctx) => {
    await ctx.reply(
      '👋 <b>Anypedia Bot</b>\n\n/draft — подать заявку на турнир\n/match — обновить результат матча\n/subscribe — подписаться на команду\n/status — состояние бота (admin)',
      { parse_mode: 'HTML' }
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      '<b>Команды:</b>\n\n' +
      '<b>/draft</b> — подать заявку на турнир\n' +
      '<b>/match</b> &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;\n' +
      'Пример: <code>/match SkewerEsports-Season-3 m1 2:1</code>\n\n' +
      '<b>/approve</b> &lt;draftId&gt; — одобрить (admin)\n' +
      '<b>/reject</b> &lt;draftId&gt; — отклонить (admin)\n' +
      '<b>/subscribe</b> &lt;teamId&gt;\n' +
      '<b>/status</b> — состояние (admin)',
      { parse_mode: 'HTML' }
    );
  });

  bot.command('draft',       requireRole(['admin', 'organizer']), draftCommand);
  bot.command('match',       requireRole(['admin', 'organizer']), rateLimit({ maxRequests: 5, windowMs: 60_000 }), matchCommand);
  bot.command('approve',     requireRole(['admin']), approveCommand);
  bot.command('reject',      requireRole(['admin']), rejectCommand);
  bot.command('status',      requireRole(['admin']), statusCommand);
  bot.command('subscribe',   subscribeCommand);
  bot.command('unsubscribe', unsubscribeCommand);

  bot.on('message', async (ctx) => {
    if (!(ctx.message?.text || '').startsWith('/'))
      await ctx.reply('Используйте /help для списка команд.');
  });

  return bot;
}

module.exports = { createBot };