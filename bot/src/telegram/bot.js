'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config');
const log    = require('../logger');

const { rateLimit }    = require('./middleware/rateLimiter');
const { requireRole }  = require('./middleware/auth');

const {
  matchCommand,
  startMatchCommand,
  endMatchCommand,
  forceMatchCommand,
  bracketCommand,
  matchInfoCommand,
} = require('./commands/liveMatch');

const { draftCommand, cancelCommand, processWizardText } = require('./commands/draft');
const { approveCommand, rejectCommand }            = require('./commands/moderate');
const { draftsCommand, draftInfoCommand, myDraftsCommand } = require('./commands/drafts');
const { createBracketCommand, seedCommand, processBracketOrSeedText } = require('./commands/createBracket');
const { subscribeCommand, unsubscribeCommand }     = require('./commands/subscribe');
const { statusCommand }                            = require('./commands/status');

function createBot() {
  const bot = new Telegraf(config.bot.token);

  // Глобального bot.use(rateLimit) намеренно нет:
  // wizard-ответы не должны попадать под ограничение частоты.
  // Rate limit применяется точечно только к командам с IO-нагрузкой.

  bot.catch((err, ctx) => {
    log.error({ update: ctx.updateType, from: ctx.from?.id, err: err.message }, 'bot: ошибка');
    ctx.reply('⚙️ Внутренняя ошибка.').catch(() => {});
  });

  /* ── /start ── */
  bot.start(async (ctx) => {
    await ctx.reply(
      '👋 <b>Anypedia Bot</b>\n\n' +
      '<b>📊 Матчи и сетка:</b>\n' +
      '/match — внести счёт\n' +
      '/startmatch — запустить матч\n' +
      '/endmatch — завершить матч\n' +
      '/bracket — просмотр сетки\n' +
      '/matchinfo — информация о матче\n\n' +
      '<b>🏗 Управление сетками:</b>\n' +
      '/createbracket — создать сетку\n' +
      '/seed — назначить команды\n\n' +
      '<b>📋 Заявки:</b>\n' +
      '/draft — подать заявку\n' +
      '/mydrafts — мои заявки\n\n' +
      '<b>🛡 Администраторам:</b>\n' +
      '/drafts — список заявок\n' +
      '/approve · /reject — модерация\n' +
      '/forcematch — исправить результат\n' +
      '/status — состояние бота\n\n' +
      '/help — справка',
      { parse_mode: 'HTML' }
    );
  });

  /* ── /help ── */
  bot.help(async (ctx) => {
    await ctx.reply(
      '<b>Все команды</b>\n\n' +
      '<b>📊 Матчи</b>\n' +
      '/match &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt;\n' +
      '/startmatch &lt;tId&gt; &lt;mId&gt;\n' +
      '/endmatch &lt;tId&gt; &lt;mId&gt;\n' +
      '/bracket &lt;tId&gt;\n' +
      '/matchinfo &lt;tId&gt; &lt;mId&gt;\n' +
      '/forcematch &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt; (admin)\n\n' +
      '<b>🏗 Сетки</b>\n' +
      '/createbracket &lt;tId&gt;\n' +
      '/seed &lt;tId&gt;\n\n' +
      '<b>📋 Заявки</b>\n' +
      '/draft — подать заявку (wizard)\n' +
      '/mydrafts — мои заявки\n' +
      '/cancel — отменить wizard\n\n' +
      '<b>🛡 Модерация (admin)</b>\n' +
      '/drafts · /drafts all\n' +
      '/draftinfo &lt;id&gt;\n' +
      '/approve &lt;id&gt;\n' +
      '/reject &lt;id&gt; [причина]\n\n' +
      '/status (admin)',
      { parse_mode: 'HTML' }
    );
  });

  /* ── Матчи ──
     requireRole(['admin','organizer']) — первый барьер (роль в permissions.json).
     canManageTournament внутри команды — второй барьер (владелец турнира).
     Это позволяет организатору работать только со своими турнирами. */
  bot.command('match',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 10, windowMs: 60_000, namespace: 'match' }),
    matchCommand,
  );
  bot.command('startmatch', requireRole(['admin', 'organizer']), startMatchCommand);
  bot.command('endmatch',   requireRole(['admin', 'organizer']), endMatchCommand);
  bot.command('forcematch', requireRole(['admin']),              forceMatchCommand);
  bot.command('bracket',    bracketCommand);   // открытая — смотреть могут все
  bot.command('matchinfo',  matchInfoCommand); // открытая

  /* ── Сетки ── */
  bot.command('createbracket',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 5, windowMs: 60_000, namespace: 'createbracket' }),
    createBracketCommand,
  );
  bot.command('seed', requireRole(['admin', 'organizer']), seedCommand);

  /* ── Wizard /draft ── */
  bot.command('draft',  requireRole(['admin', 'organizer']), draftCommand);
  bot.command('cancel', cancelCommand);
  bot.command('skip', async (ctx) => {
    // /skip не имеет rate limit — это ответ на вопрос wizard-а
    const handled =
      await processWizardText(ctx) ||
      await processBracketOrSeedText(ctx);
    if (!handled) {
      await ctx.reply('Команда /skip доступна только внутри заполнения заявки или посева команд.');
    }
  });

  /* ── Черновики ── */
  bot.command('mydrafts',  requireRole(['admin', 'organizer']), myDraftsCommand);
  bot.command('drafts',    requireRole(['admin']), draftsCommand);
  bot.command('draftinfo', requireRole(['admin', 'organizer']), draftInfoCommand);

  /* ── Модерация ── */
  bot.command('approve',
    requireRole(['admin']),
    rateLimit({ maxRequests: 10, windowMs: 60_000, namespace: 'moderate' }),
    approveCommand,
  );
  bot.command('reject',
    requireRole(['admin']),
    rateLimit({ maxRequests: 10, windowMs: 60_000, namespace: 'moderate' }),
    rejectCommand,
  );

  /* ── Admin ── */
  bot.command('status', requireRole(['admin']), statusCommand);

  /* ── Открытые ── */
  bot.command('subscribe',   subscribeCommand);
  bot.command('unsubscribe', unsubscribeCommand);

  /* ── Текст → wizard (БЕЗ rate limit) ── */
  bot.on('text', async (ctx) => {
    if ((ctx.message?.text || '').startsWith('/')) return;
    const handled =
      await processWizardText(ctx) ||
      await processBracketOrSeedText(ctx);
    if (!handled) {
      await ctx.reply('Используйте /help для списка команд.');
    }
  });

  return bot;
}

module.exports = { createBot };
