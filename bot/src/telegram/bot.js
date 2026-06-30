'use strict';

const { Telegraf } = require('telegraf');
const config = require('../config');
const log    = require('../logger');

const { rateLimit }    = require('./middleware/rateLimiter');
const { requireRole, getUserRole } = require('./middleware/auth');

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
const { createBracketCommand, seedCommand, randomSeedCommand, swissNextCommand, swissStatusCommand, processBracketOrSeedText } = require('./commands/createBracket');
const { subscribeCommand, unsubscribeCommand }     = require('./commands/subscribe');
const { statusCommand }                            = require('./commands/status');
const { tournamentCommand, tournamentsCommand }    = require('./commands/tournamentInfo');
const { editTournamentCommand, editPrizeCommand, processEditTournamentText } = require('./commands/editTournament');
const { matchDbCommand, matchGamesCommand }        = require('./commands/matchExtra');

/* ─── Категории команд для /help (по ролям) ─────────────────────── */

const HELP_USER = [
  '<b>📊 Зрителям</b>',
  '/tournament &lt;id&gt; — карточка турнира',
  '/tournaments — список турниров',
  '/bracket &lt;tId&gt; — сетка турнира',
  '/matchinfo &lt;tId&gt; &lt;mId&gt; — инфо о матче',
  '/matchgames &lt;tId&gt; &lt;mId&gt; — игры серии (Dotabuff)',
  '/swissstatus &lt;tId&gt; — таблица Swiss',
].join('\n');

const HELP_ORGANIZER = [
  '\n<b>🏆 Организаторам</b>',
  '/draft — подать заявку на турнир',
  '/mydrafts — мои заявки',
  '/createbracket &lt;tId&gt; — создать сетку',
  '/seed &lt;tId&gt; — назначить команды',
  '/randomseed &lt;tId&gt; Ком1, Ком2... — случайная жеребьёвка',
  '/match &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt; — внести результат',
  '/startmatch &lt;tId&gt; &lt;mId&gt; — запустить матч',
  '/endmatch &lt;tId&gt; &lt;mId&gt; — завершить матч',
  '/swissnext &lt;tId&gt; — следующий Swiss-раунд',
  '/edittournament &lt;tId&gt; — редактировать турнир',
  '/editprize &lt;tId&gt; — редактировать призовые',
  '/matchdb &lt;tId&gt; &lt;mId&gt; &lt;link&gt; — добавить Dotabuff-ссылку',
  '<i>(только для своих турниров)</i>',
].join('\n');

const HELP_ADMIN = [
  '\n<b>🛡 Администрации</b>',
  '/drafts · /drafts all — список заявок',
  '/draftinfo &lt;id&gt; — подробности заявки',
  '/approve &lt;id&gt; — одобрить заявку',
  '/reject &lt;id&gt; [причина] — отклонить заявку',
  '/forcematch &lt;tId&gt; &lt;mId&gt; &lt;счёт&gt; — исправить результат',
  '/status — состояние бота',
].join('\n');

async function buildHelpText(userId) {
  const role = await getUserRole(userId).catch(() => null);

  let text = HELP_USER;
  if (role === 'organizer' || role === 'admin') text += '\n\n' + HELP_ORGANIZER;
  if (role === 'admin')                          text += '\n\n' + HELP_ADMIN;

  text += '\n\n<b>Прочее</b>\n/subscribe &lt;teamId&gt; · /unsubscribe &lt;teamId&gt;\n/cancel — отменить текущий wizard';

  return text;
}

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
    const text = await buildHelpText(ctx.from?.id);
    await ctx.reply(`👋 <b>Anypedia Bot</b>\n\n${text}`, { parse_mode: 'HTML' });
  });

  /* ── /help — показывает только доступные пользователю команды ── */
  bot.help(async (ctx) => {
    const text = await buildHelpText(ctx.from?.id);
    await ctx.reply(`<b>Справка</b>\n\n${text}`, { parse_mode: 'HTML' });
  });

  /* ═══════════ USER — открытые команды ═══════════ */
  bot.command('tournament',  tournamentCommand);
  bot.command('tournaments', tournamentsCommand);
  bot.command('bracket',     bracketCommand);
  bot.command('matchinfo',   matchInfoCommand);
  bot.command('matchgames',  matchGamesCommand);
  bot.command('swissstatus', swissStatusCommand);

  /* ═══════════ ORGANIZER — требует роль + владение турниром
     (canManageTournament проверяется внутри каждой команды единообразно) ═══════════ */
  bot.command('draft',  requireRole(['admin', 'organizer']), draftCommand);
  bot.command('mydrafts', requireRole(['admin', 'organizer']), myDraftsCommand);

  bot.command('createbracket',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 5, windowMs: 60_000, namespace: 'createbracket' }),
    createBracketCommand,
  );
  bot.command('seed', requireRole(['admin', 'organizer']), seedCommand);
  bot.command('randomseed',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 3, windowMs: 60_000, namespace: 'randomseed' }),
    randomSeedCommand,
  );

  bot.command('match',
    requireRole(['admin', 'organizer']),
    rateLimit({ maxRequests: 10, windowMs: 60_000, namespace: 'match' }),
    matchCommand,
  );
  bot.command('startmatch', requireRole(['admin', 'organizer']), startMatchCommand);
  bot.command('endmatch',   requireRole(['admin', 'organizer']), endMatchCommand);
  bot.command('swissnext',  requireRole(['admin', 'organizer']), swissNextCommand);

  bot.command('edittournament', requireRole(['admin', 'organizer']), editTournamentCommand);
  bot.command('editprize',      requireRole(['admin', 'organizer']), editPrizeCommand);
  bot.command('matchdb',        requireRole(['admin', 'organizer']), matchDbCommand);

  bot.command('draftinfo', requireRole(['admin', 'organizer']), draftInfoCommand);

  /* ═══════════ ADMIN — полный доступ ═══════════ */
  bot.command('forcematch', requireRole(['admin']), forceMatchCommand);
  bot.command('drafts',     requireRole(['admin']), draftsCommand);
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
  bot.command('status', requireRole(['admin']), statusCommand);

  /* ═══════════ Прочее ═══════════ */
  bot.command('cancel', cancelCommand);
  bot.command('skip', async (ctx) => {
    // /skip не имеет rate limit — это ответ на вопрос wizard-а
    const handled =
      await processWizardText(ctx) ||
      await processBracketOrSeedText(ctx) ||
      await processEditTournamentText(ctx);
    if (!handled) {
      await ctx.reply('Команда /skip доступна только внутри активного wizard-а.');
    }
  });

  bot.command('subscribe',   subscribeCommand);
  bot.command('unsubscribe', unsubscribeCommand);

  /* ── Текст → все wizard-обработчики (БЕЗ rate limit) ── */
  bot.on('text', async (ctx) => {
    if ((ctx.message?.text || '').startsWith('/')) return;
    const handled =
      await processWizardText(ctx) ||
      await processBracketOrSeedText(ctx) ||
      await processEditTournamentText(ctx);
    if (!handled) {
      await ctx.reply('Используйте /help для списка команд.');
    }
  });

  return bot;
}

module.exports = { createBot };
