'use strict';

const { getFile } = require('../../github/client');
const { parseAdminJson } = require('../../data/adminJsonFile');
const REPO_PATHS = require('../../github/repoPaths');
const log = require('../../logger');

const STATUS_EMOJI = {
  pending:       '⏳',
  approved:      '✅',
  rejected:      '🚫',
  needs_changes: '✏️',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function getDraftsData() {
  const file = await getFile(REPO_PATHS.ADMIN.DRAFTS);
  return parseAdminJson(file ? file.content : null, REPO_PATHS.ADMIN.DRAFTS);
}

/**
 * /drafts — список последних черновиков (только pending по умолчанию).
 * Флаги: /drafts all — все статусы
 */
async function draftsCommand(ctx) {
  const text  = (ctx.message?.text || '').trim();
  const showAll = text.includes('all');
  const telegramId = ctx.from?.id;

  log.info({ telegramId, showAll }, 'drafts: команда');
  await ctx.sendChatAction('typing');

  try {
    const data = await getDraftsData();
    let drafts = data.drafts;

    if (!showAll) drafts = drafts.filter(d => d.status === 'pending');

    // Сортируем от новых к старым
    drafts = [...drafts].sort((a, b) =>
      new Date(b.submittedAt) - new Date(a.submittedAt)
    ).slice(0, 20); // максимум 20 в одном сообщении

    if (drafts.length === 0) {
      return ctx.reply(
        showAll
          ? '📋 Черновиков нет.'
          : '📋 Нет ожидающих черновиков.\n\nПоказать все: /drafts all',
        { parse_mode: 'HTML' }
      );
    }

    const lines = drafts.map(d => {
      const emoji = STATUS_EMOJI[d.status] || '❓';
      const date  = formatDate(d.submittedAt);
      return `${emoji} <code>${d.id.slice(0, 8)}…</code> — <b>${d.payload.title}</b>\n` +
             `   ${d.payload.organizer} · ${date}`;
    });

    const header = showAll
      ? `📋 <b>Все черновики</b> (${drafts.length}):\n\n`
      : `📋 <b>Ожидают проверки</b> (${drafts.length}):\n\n`;

    await ctx.reply(
      header + lines.join('\n\n') +
      '\n\nПодробности: <code>/draftinfo &lt;draftId&gt;</code>' +
      (!showAll ? '\nВсе статусы: <code>/drafts all</code>' : ''),
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ err: err.message }, 'drafts: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/**
 * /draftinfo <draftId> — полная информация о черновике.
 * Поддерживает как полный UUID так и первые 8 символов.
 */
async function draftInfoCommand(ctx) {
  const parts   = (ctx.message?.text || '').trim().split(/\s+/);
  const query   = parts[1];
  const telegramId = ctx.from?.id;

  if (!query) {
    return ctx.reply(
      '❌ Укажите id черновика.\n\n' +
      'Использование: <code>/draftinfo &lt;draftId&gt;</code>\n' +
      'Список черновиков: /drafts',
      { parse_mode: 'HTML' }
    );
  }

  log.info({ telegramId, query }, 'draftinfo: команда');
  await ctx.sendChatAction('typing');

  try {
    const data   = await getDraftsData();
    // Ищем по полному id или по префиксу (первые 8 символов)
    const draft  = data.drafts.find(d => d.id === query || d.id.startsWith(query));

    if (!draft) {
      return ctx.reply(
        `❌ Черновик <code>${query}</code> не найден.\n\nСписок черновиков: /drafts`,
        { parse_mode: 'HTML' }
      );
    }

    const emoji = STATUS_EMOJI[draft.status] || '❓';
    const p     = draft.payload;

    let text =
      `${emoji} <b>${p.title}</b>\n` +
      `ID: <code>${draft.id}</code>\n` +
      `Статус: <b>${draft.status}</b>\n` +
      `Подал: tg:${draft.submittedBy} · ${formatDate(draft.submittedAt)}\n\n` +
      `📅 ${p.start} — ${p.end}\n` +
      `🏆 ${p.prize || '—'}\n` +
      `🎮 ${p.format || '—'} · ${p.gameFormat || '—'}\n` +
      `📍 ${p.location || '—'}\n` +
      `👥 ${p.limit || '—'}\n` +
      `🏢 Организатор: ${p.organizer}\n`;

    if (p.telegramLink)     text += `💬 ${p.telegramLink}\n`;
    if (p.registrationLink) text += `📝 ${p.registrationLink}\n`;
    if (p.description)      text += `\nОписание: ${p.description}\n`;

    if (draft.status === 'rejected' && draft.moderatorComment) {
      text += `\n🚫 Причина отклонения: ${draft.moderatorComment}\n`;
    }
    if (draft.status === 'approved' && draft.tournamentId) {
      text += `\n✅ Турнир на сайте: <code>${draft.tournamentId}</code>\n`;
    }
    if (draft.resolvedAt) {
      text += `Решение: ${formatDate(draft.resolvedAt)} (tg:${draft.resolvedBy})\n`;
    }

    // Кнопки действий для adminов
    const isAdmin = ctx.userRole === 'admin';
    if (isAdmin && draft.status === 'pending') {
      text += `\n<code>/approve ${draft.id}</code>\n` +
              `<code>/reject ${draft.id} [причина]</code>`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ query, err: err.message }, 'draftinfo: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/**
 * /mydrafts — черновики текущего пользователя.
 */
async function myDraftsCommand(ctx) {
  const telegramId = ctx.from?.id;
  log.info({ telegramId }, 'mydrafts: команда');
  await ctx.sendChatAction('typing');

  try {
    const data   = await getDraftsData();
    const drafts = data.drafts
      .filter(d => d.submittedBy === telegramId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    if (drafts.length === 0) {
      return ctx.reply('📋 У вас нет черновиков.\n\nПодать заявку: /draft', { parse_mode: 'HTML' });
    }

    const lines = drafts.map(d => {
      const emoji = STATUS_EMOJI[d.status] || '❓';
      let line = `${emoji} <b>${d.payload.title}</b> — ${d.status}\n` +
                 `   <code>${d.id.slice(0, 8)}…</code> · ${formatDate(d.submittedAt)}`;
      if (d.status === 'rejected' && d.moderatorComment) {
        line += `\n   Причина: ${d.moderatorComment}`;
      }
      if (d.status === 'approved' && d.tournamentId) {
        line += `\n   Турнир: <code>${d.tournamentId}</code>`;
      }
      return line;
    });

    await ctx.reply(
      `📋 <b>Ваши черновики</b> (${drafts.length}):\n\n` + lines.join('\n\n') +
      '\n\nПодробности: <code>/draftinfo &lt;id&gt;</code>',
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ telegramId, err: err.message }, 'mydrafts: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

module.exports = { draftsCommand, draftInfoCommand, myDraftsCommand };
