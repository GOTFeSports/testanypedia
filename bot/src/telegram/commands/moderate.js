'use strict';

const { approveDraft, rejectDraft } = require('../../workflows/moderateDraftWorkflow');
const log = require('../../logger');

/**
 * /approve <draftId>
 * Одобрить черновик: добавить турнир в data.js, пометить черновик approved.
 * Только для admin.
 */
async function approveCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const draftId = parts[1];

  if (!draftId) {
    return ctx.reply(
      '❌ Укажите id черновика.\n\n' +
      'Использование: <code>/approve &lt;draftId&gt;</code>\n\n' +
      'Посмотреть список черновиков: /drafts',
      { parse_mode: 'HTML' }
    );
  }

  log.info({ draftId, actorTelegramId: ctx.from?.id }, 'approve: команда');
  await ctx.sendChatAction('typing');

  try {
    const result = await approveDraft({
      draftId,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
    });

    await ctx.reply(
      `✅ <b>Черновик одобрен!</b>\n\n` +
      `Черновик: <code>${draftId}</code>\n` +
      `Турнир: <b>${result.draft.payload.title}</b>\n` +
      `ID на сайте: <code>${result.tournamentId}</code>\n\n` +
      `Турнир добавлен в <code>data.js</code> и уже доступен на сайте.`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    log.error({ draftId, err: err.message }, 'approve: ошибка');
    await ctx.reply(
      `❌ Ошибка при одобрении:\n<code>${err.message}</code>`,
      { parse_mode: 'HTML' }
    );
  }
}

/**
 * /reject <draftId> [причина]
 * Отклонить черновик. data.js не трогается.
 * Только для admin.
 */
async function rejectCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const draftId = parts[1];
  const reason  = parts.slice(2).join(' ') || null;

  if (!draftId) {
    return ctx.reply(
      '❌ Укажите id черновика.\n\n' +
      'Использование: <code>/reject &lt;draftId&gt; [причина]</code>\n\n' +
      'Пример: <code>/reject abc-123 Неверный формат дат</code>',
      { parse_mode: 'HTML' }
    );
  }

  log.info({ draftId, reason, actorTelegramId: ctx.from?.id }, 'reject: команда');
  await ctx.sendChatAction('typing');

  try {
    await rejectDraft({
      draftId,
      reason,
      actorTelegramId: ctx.from.id,
      actorRole: ctx.userRole,
    });

    await ctx.reply(
      `🚫 <b>Черновик отклонён</b>\n\n` +
      `Черновик: <code>${draftId}</code>\n` +
      (reason ? `Причина: ${reason}` : 'Причина не указана.'),
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    log.error({ draftId, err: err.message }, 'reject: ошибка');
    await ctx.reply(
      `❌ Ошибка при отклонении:\n<code>${err.message}</code>`,
      { parse_mode: 'HTML' }
    );
  }
}

module.exports = { approveCommand, rejectCommand };
