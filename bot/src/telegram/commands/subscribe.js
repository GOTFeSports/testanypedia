'use strict';

async function subscribeCommand(ctx) {
  const teamId = (ctx.message?.text || '').trim().split(/\s+/)[1];
  if (!teamId) return ctx.reply('❌ Укажите id команды.\n<code>/subscribe &lt;teamId&gt;</code>', { parse_mode: 'HTML' });
  await ctx.reply(`⏳ Подписки будут доступны в Этапе 7.\n\nКоманда: <code>${teamId}</code>`, { parse_mode: 'HTML' });
}

async function unsubscribeCommand(ctx) {
  const teamId = (ctx.message?.text || '').trim().split(/\s+/)[1];
  if (!teamId) return ctx.reply('❌ Укажите id команды.\n<code>/unsubscribe &lt;teamId&gt;</code>', { parse_mode: 'HTML' });
  await ctx.reply(`⏳ Отписка будет доступна в Этапе 7.\n\nКоманда: <code>${teamId}</code>`, { parse_mode: 'HTML' });
}

module.exports = { subscribeCommand, unsubscribeCommand };