'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config');
const log    = require('../logger');

const { requireRole }                              = require('./middleware/auth');
const { rateLimit }                                = require('./middleware/rateLimiter');

const {
  matchCommand,
  startMatchCommand,
  endMatchCommand,
  forceMatchCommand,
  bracketCommand,
  matchInfoCommand,
}                                                  = require('./commands/liveMatch');

const { draftCommand, cancelCommand, processWizardText } = require('./commands/draft');
const { approveCommand, rejectCommand }            = require('./commands/moderate');
const { draftsCommand, draftInfoCommand, myDraftsCommand } = require('./commands/drafts');
const { subscribeCommand, unsubscribeCommand }     = require('./commands/subscribe');
const { statusCommand }                            = require('./commands/status');

function createBot() {
  const bot = new Telegraf(config.bot.token);

  bot.catch((err, ctx) => {
    log.error({ update: ctx.updateType, from: ctx.from?.id, err: err.message }, 'bot: необработанная ошибка');
    ctx.reply('⚙️ Внутренняя ошибка.').catch(() => {});
  });

  bot.use(rateLimit({ maxRequests: 10, windowMs: 60_000 }));

  /* ── /start ── */
  bot.start(async (ctx) => {
    await ctx.reply(
      '👋 <b>Anypedia Bot</b>\n\n' +
      '<b>Матчи и сетка:</b>\n' +
      '/match — внести счёт матча\n' +
      '/startmatch — запустить матч (→ live)\n' +
      '/endmatch — завершить матч\n' +
      '/bracket — посмотреть сетку турнира\n' +
      '/matchinfo — информация о матче\n\n' +
      '<b>Турниры:</b>\n' +
      '/draft — подать заявку на турнир\n' +
      '/mydrafts — мои заявки\n\n' +
      '<b>Администраторам:</b>\n' +
      '/drafts — список заявок\n' +
      '/approve · /reject — модерация\n' +
      '/forcematch — исправить результат\n' +
      '/status — состояние бота\n\n' +
      '/help — полная справка',
      { parse_mode: 'HTML' }
    );
  });

  /* ── /help ── */
  bot.help(async (ctx) => {
    await ctx.reply(
      '<b>Все команды</b>\n\n' +

      '<b>📊 Матчи</b>\n' +
      '/match &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt; — внести результат\n' +
      '/startmatch &lt;tId&gt; &lt;mId&gt; — запустить матч\n' +
      '/endmatch &lt;tId&gt; &lt;mId&gt; — завершить матч\n' +
      '/bracket &lt;tId&gt; — сетка турнира\n' +
      '/matchinfo &lt;tId&gt; &lt;mId&gt; — инфо о матче\n' +
      '/forcematch &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt; — исправить результат (admin)\n\n' +

      '<b>📋 Заявки</b>\n' +
      '/draft — подать заявку (wizard)\n' +
      '/mydrafts — мои заявки\n' +
      '/cancel — отменить wizard\n\n' +

      '<b>🛡 Модерация (admin)</b>\n' +
      '/drafts — список ожидающих\n' +
      '/drafts all — все заявки\n' +
      '/draftinfo &lt;id&gt; — подробности заявки\n' +
      '/approve &lt;id&gt; — одобрить\n' +
      '/reject &lt;id&gt; [причина] — отклонить\n\n' +

      '<b>🔔 Подписки</b>\n' +
      '/subscribe &lt;teamId&gt;\n' +
      '/unsubscribe &lt;teamId&gt;\n\n' +

      '/status — состояние бота (admin)',
      { parse_mode: 'HTML' }
    );
  });

  /* ── Матчи ── */
  bot.command('match',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 5, windowMs: 60_000 }),
    matchCommand,
  );
  bot.command('startmatch',  requireRole(['admin', 'organizer']), startMatchCommand);
  bot.command('endmatch',    requireRole(['admin', 'organizer']), endMatchCommand);
  bot.command('forcematch',  requireRole(['admin']),              forceMatchCommand);
  bot.command('bracket',     bracketCommand);   // открытая команда — смотреть могут все
  bot.command('matchinfo',   matchInfoCommand); // открытая

  /* ── Wizard ── */
  bot.command('draft',   requireRole(['admin', 'organizer']), draftCommand);
  bot.command('cancel',  cancelCommand);
  bot.command('skip', async (ctx) => {
    const handled = await processWizardText(ctx);
    if (!handled) await ctx.reply('Команда /skip доступна только внутри заполнения заявки (/draft).');
  });

  /* ── Черновики ── */
  bot.command('mydrafts',  requireRole(['admin', 'organizer']), myDraftsCommand);
  bot.command('drafts',    requireRole(['admin']), draftsCommand);
  bot.command('draftinfo', requireRole(['admin', 'organizer']), draftInfoCommand);

  /* ── Модерация ── */
  bot.command('approve', requireRole(['admin']), approveCommand);
  bot.command('reject',  requireRole(['admin']), rejectCommand);

  /* ── Admin ── */
  bot.command('status', requireRole(['admin']), statusCommand);

  /* ── Открытые ── */
  bot.command('subscribe',   subscribeCommand);
  bot.command('unsubscribe', unsubscribeCommand);

  /* ── Текст → wizard ── */
  bot.on('text', async (ctx) => {
    if ((ctx.message?.text || '').startsWith('/')) return;
    const handled = await processWizardText(ctx);
    if (!handled) await ctx.reply('Используйте /help для списка команд.');
  });

  return bot;
}

module.exports = { createBot };
