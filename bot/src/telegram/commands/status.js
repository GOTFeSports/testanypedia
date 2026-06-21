'use strict';

const { getQueueStats } = require('../../github/commitQueue');
const config = require('../../config');
const log = require('../../logger');

function formatUptime(s) {
  return `${Math.floor(s/3600)}ч ${Math.floor((s%3600)/60)}м ${s%60}с`;
}

async function statusCommand(ctx) {
  log.info({ telegramId: ctx.from?.id }, 'status: команда');
  const stats = getQueueStats();
  const queueLines = Object.entries(stats).length
    ? Object.entries(stats).map(([p, s]) => `  <code>${p}</code>: pending=${s.pending}, queued=${s.size}`).join('\n')
    : '  (очереди пусты)';

  await ctx.reply(
    `🤖 <b>Anypedia Bot</b>\n\n` +
    `⏱ Uptime: ${formatUptime(Math.floor(process.uptime()))}\n` +
    `🌿 Ветка: <code>${config.github.branch}</code>\n` +
    `📦 Репо: <code>${config.github.owner}/${config.github.repo}</code>\n\n` +
    `📋 <b>Очереди:</b>\n${queueLines}`,
    { parse_mode: 'HTML' }
  );
}

module.exports = { statusCommand };