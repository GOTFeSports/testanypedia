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

const STATUS_RU = {
  pending:       'Ожидает',
  approved:      'Одобрен',
  rejected:      'Отклонён',
  needs_changes: 'Нужны правки',
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
 * /drafts       — только pending
 * /drafts all   — все статусы
 */
async function draftsCommand(ctx) {
  const text    = (ctx.message?.text || '').trim();
  const showAll = text.includes('all');

  log.info({ telegramId: ctx.from?.id, showAll }, 'drafts: команда');
  await ctx.sendChatAction('typing');

  try {
    const data = await getDraftsData();
    let drafts = data.drafts;
    if (!showAll) drafts = drafts.filter(d => d.status === 'pending');

    drafts = [...drafts]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 15);

    if (drafts.length === 0) {
      return ctx.reply(
        showAll
          ? '📋 Черновиков нет.'
          : '📋 Нет ожидающих черновиков.\n\nВсе статусы: /drafts all',
        { parse_mode: 'HTML' }
      );
    }

    const lines = drafts.map((d, i) => {
      const emoji  = STATUS_EMOJI[d.status] || '❓';
      const status = STATUS_RU[d.status]    || d.status;
      const date   = formatDate(d.submittedAt);
      return (
        `${i + 1}. ${emoji} <b>${d.payload.title}</b>\n` +
        `   Статус: ${status} · ${date}\n` +
        `   Организатор: ${d.payload.organizer}\n` +
        `   ID: <code>${d.id}</code>`
      );
    });

    const header = showAll
      ? `📋 <b>Все черновики</b> (${drafts.length}):\n\n`
      : `📋 <b>Ожидают проверки</b> (${drafts.length}):\n\n`;

    const footer = '\n\n📌 Подробности: <code>/draftinfo &lt;id&gt;</code>' +
      (!showAll ? '\n📌 Все статусы: /drafts all' : '');

    await ctx.reply(header + lines.join('\n\n') + footer, { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ err: err.message }, 'drafts: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

/**
 * /draftinfo <id>
 * Поддерживает полный UUID и префикс (минимум 4 символа).
 */
async function draftInfoCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const query = parts[1];

  if (!query) {
    return ctx.reply(
      '❌ Укажите id черновика.\n\n' +
      'Использование: <code>/draftinfo &lt;id&gt;</code>\n' +
      'Список черновиков: /drafts',
      { parse_mode: 'HTML' }
    );
  }

  log.info({ telegramId: ctx.from?.id, query }, 'draftinfo: команда');
  await ctx.sendChatAction('typing');

  try {
    const data  = await getDraftsData();
    const draft = data.drafts.find(d => d.id === query || d.id.startsWith(query));

    if (!draft) {
      return ctx.reply(
        `❌ Черновик <code>${query}</code> не найден.\n\nСписок: /drafts`,
        { parse_mode: 'HTML' }
      );
    }

    const emoji  = STATUS_EMOJI[draft.status] || '❓';
    const status = STATUS_RU[draft.status]    || draft.status;
    const p      = draft.payload;

    const lines = [
      `${emoji} <b>${p.title}</b>`,
      `Статус: <b>${status}</b>`,
      `ID: <code>${draft.id}</code>`,
      `Подал: tg:${draft.submittedBy} · ${formatDate(draft.submittedAt)}`,
      '',
      `📅 Даты: ${p.start} — ${p.end}`,
      `🏢 Организатор: ${p.organizer}`,
      p.prize        ? `🏆 Призовой фонд: ${p.prize}`   : null,
      p.limit        ? `👥 Лимит: ${p.limit}`            : null,
      p.format       ? `🎮 Формат: ${p.format}`          : null,
      p.location     ? `📍 Локация: ${p.location}`       : null,
      p.telegramLink ? `💬 Telegram: ${p.telegramLink}`  : null,
      p.registrationLink ? `📝 Регистрация: ${p.registrationLink}` : null,
      p.description  ? `\nОписание: ${p.description}`   : null,
    ].filter(v => v !== null);

    if (draft.status === 'rejected' && draft.moderatorComment) {
      lines.push('', `🚫 Причина отклонения: ${draft.moderatorComment}`);
    }
    if (draft.status === 'approved' && draft.tournamentId) {
      lines.push('', `✅ Турнир на сайте: <code>${draft.tournamentId}</code>`);
    }
    if (draft.resolvedAt) {
      lines.push(`Решение: ${formatDate(draft.resolvedAt)} (tg:${draft.resolvedBy})`);
    }

    // Быстрые действия для admin
    if (ctx.userRole === 'admin' && draft.status === 'pending') {
      lines.push(
        '',
        '─────────────────────',
        `✅ Одобрить: <code>/approve ${draft.id}</code>`,
        `🚫 Отклонить: <code>/reject ${draft.id} [причина]</code>`,
      );
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

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
      return ctx.reply(
        '📋 У вас нет черновиков.\n\nПодать заявку: /draft',
        { parse_mode: 'HTML' }
      );
    }

    const lines = drafts.map((d, i) => {
      const emoji  = STATUS_EMOJI[d.status] || '❓';
      const status = STATUS_RU[d.status]    || d.status;
      const date   = formatDate(d.submittedAt);

      const parts = [
        `${i + 1}. ${emoji} <b>${d.payload.title}</b>`,
        `   Статус: <b>${status}</b> · ${date}`,
        `   ID: <code>${d.id}</code>`,
      ];

      if (d.status === 'rejected' && d.moderatorComment) {
        parts.push(`   Причина: ${d.moderatorComment}`);
      }
      if (d.status === 'approved' && d.tournamentId) {
        parts.push(`   Турнир: <code>${d.tournamentId}</code>`);
      }

      return parts.join('\n');
    });

    await ctx.reply(
      `📋 <b>Ваши заявки</b> (${drafts.length}):\n\n` +
      lines.join('\n\n') +
      '\n\n📌 Подробности: <code>/draftinfo &lt;id&gt;</code>',
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ telegramId, err: err.message }, 'mydrafts: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

module.exports = { draftsCommand, draftInfoCommand, myDraftsCommand };
