'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config');
const log    = require('../logger');

const { requireRole }                              = require('./middleware/auth');
const { rateLimit }                                = require('./middleware/rateLimiter');
const { matchCommand }                             = require('./commands/match');
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
      '<b>Команды для организаторов:</b>\n' +
      '/draft — подать заявку на турнир\n' +
      '/mydrafts — мои заявки\n\n' +
      '<b>Команды для администраторов:</b>\n' +
      '/drafts — список заявок\n' +
      '/approve — одобрить заявку\n' +
      '/reject — отклонить заявку\n\n' +
      '<b>Общие:</b>\n' +
      '/match — обновить результат матча\n' +
      '/subscribe — подписаться на команду\n' +
      '/status — состояние бота (admin)\n' +
      '/help — справка',
      { parse_mode: 'HTML' }
    );
  });

  /* ── /help ── */
  bot.help(async (ctx) => {
    await ctx.reply(
      '<b>Справка по командам</b>\n\n' +
      '<b>/draft</b> — подать заявку на турнир (пошаговый wizard)\n' +
      '<b>/mydrafts</b> — ваши черновики и их статус\n' +
      '<b>/cancel</b> — отменить заполнение заявки\n\n' +
      '<b>/drafts</b> — все ожидающие заявки (admin)\n' +
      '<b>/drafts all</b> — заявки всех статусов (admin)\n' +
      '<b>/draftinfo &lt;id&gt;</b> — подробности заявки\n' +
      '<b>/approve &lt;id&gt;</b> — одобрить заявку → турнир появится на сайте (admin)\n' +
      '<b>/reject &lt;id&gt; [причина]</b> — отклонить заявку (admin)\n\n' +
      '<b>/match</b> &lt;tournamentId&gt; &lt;matchId&gt; &lt;счёт&gt;\n' +
      'Пример: <code>/match SkewerEsports-Season-3 m1 2:1</code>\n\n' +
      '<b>/subscribe</b> &lt;teamId&gt; · <b>/unsubscribe</b> &lt;teamId&gt;\n' +
      '<b>/status</b> — состояние бота (admin)',
      { parse_mode: 'HTML' }
    );
  });

  /* ── Wizard команды (доступны всем у кого есть роль) ── */
  bot.command('draft',   requireRole(['admin', 'organizer']), draftCommand);
  bot.command('cancel',  cancelCommand);

  /* ── Просмотр черновиков ── */
  // /mydrafts — открыт для organizer и admin
  bot.command('mydrafts',  requireRole(['admin', 'organizer']), myDraftsCommand);
  // /drafts и /draftinfo — только admin
  bot.command('drafts',    requireRole(['admin']), draftsCommand);
  bot.command('draftinfo', requireRole(['admin', 'organizer']), draftInfoCommand);

  /* ── Модерация (только admin) ── */
  bot.command('approve', requireRole(['admin']), approveCommand);
  bot.command('reject',  requireRole(['admin']), rejectCommand);

  /* ── Матчи ── */
  bot.command('match',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 5, windowMs: 60_000, message: 'Слишком много обновлений матчей подряд.' }),
    matchCommand,
  );

  /* ── Admin ── */
  bot.command('status', requireRole(['admin']), statusCommand);

  /* ── Открытые ── */
  bot.command('subscribe',   subscribeCommand);
  bot.command('unsubscribe', unsubscribeCommand);

  /* ── Обработка текстовых сообщений: wizard перехватывает первым ── */
  bot.on('text', async (ctx, next) => {
    const text = ctx.message?.text || '';
    // Команды (начинаются с /) обрабатываются выше — пропускаем
    if (text.startsWith('/')) return next();

    // Проверяем wizard
    const handled = await processWizardText(ctx);
    if (!handled) {
      await ctx.reply('Используйте /help для списка команд.');
    }
  });

  return bot;
}

module.exports = { createBot };
