'use strict';

async function approveCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const draftId = parts[1];
  if (!draftId) return ctx.reply('❌ Укажите id черновика.\n<code>/approve &lt;draftId&gt;</code>', { parse_mode: 'HTML' });
  await ctx.reply(`⏳ Модерация будет доступна в Этапе 5.\n\nЧерновик: <code>${draftId}</code>`, { parse_mode: 'HTML' });
}

async function rejectCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const draftId = parts[1];
  const reason  = parts.slice(2).join(' ') || null;
  if (!draftId) return ctx.reply('❌ Укажите id черновика.\n<code>/reject &lt;draftId&gt; [причина]</code>', { parse_mode: 'HTML' });
  await ctx.reply(
    `⏳ Отклонение будет доступно в Этапе 5.\n\nЧерновик: <code>${draftId}</code>${reason ? `\nПричина: ${reason}` : ''}`,
    { parse_mode: 'HTML' }
  );
}

module.exports = { approveCommand, rejectCommand };