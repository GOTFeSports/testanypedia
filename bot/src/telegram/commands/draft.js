'use strict';

const { submitDraftWorkflow } = require('../../workflows/submitDraftWorkflow');
const { getUserPermission } = require('../middleware/auth');
const log = require('../../logger');

const REQUIRED = ['title', 'start', 'end', 'organizer'];
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE   = /^https?:\/\/.+/;

function parseBody(text) {
  const fields = {};
  text.trim().split('\n').slice(1).forEach(line => {
    const i = line.indexOf(':');
    if (i === -1) return;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key && val) fields[key] = val;
  });
  return fields;
}

function validate(f) {
  const errors = [];
  REQUIRED.forEach(r => { if (!f[r]) errors.push(`Обязательное поле: ${r}`); });
  if (f.start && !DATE_RE.test(f.start)) errors.push(`start должен быть YYYY-MM-DD`);
  if (f.end   && !DATE_RE.test(f.end))   errors.push(`end должен быть YYYY-MM-DD`);
  if (f.start && f.end && f.start > f.end) errors.push(`start не может быть позже end`);
  if (f.telegram     && !URL_RE.test(f.telegram))     errors.push(`telegram должен быть URL`);
  if (f.registration && !URL_RE.test(f.registration)) errors.push(`registration должен быть URL`);
  return errors;
}

async function draftCommand(ctx) {
  const text = ctx.message?.text || '';

  if (text.trim() === '/draft') {
    return ctx.reply(
      '📋 <b>Подача заявки</b>\n\n<code>/draft\ntitle: Название\nstart: 2026-07-10\nend: 2026-07-11\norganizer: Название\nprize: 12000₽\nlimit: До 30.000 MMR\nformat: Double Elimination\ngameformat: Captains Mode\nlocation: СНГ\ntelegram: https://t.me/...\nregistration: https://forms.gle/...\ndescription: Описание</code>\n\n• Обязательные: <code>title, start, end, organizer</code>',
      { parse_mode: 'HTML' }
    );
  }

  const fields = parseBody(text);
  const errors  = validate(fields);
  if (errors.length) return ctx.reply(`❌ Ошибки:\n• ${errors.join('\n• ')}`, { parse_mode: 'HTML' });

  const perm = await getUserPermission(ctx.from?.id);
  await ctx.sendChatAction('typing');

  try {
    const result = await submitDraftWorkflow({
      submittedBy:   ctx.from.id,
      actorRole:     ctx.userRole,
      organizerName: perm?.organizerId || fields.organizer,
      payload: {
        title:            fields.title,
        start:            fields.start,
        end:              fields.end,
        organizer:        fields.organizer,
        prize:            fields.prize            || '',
        limit:            fields.limit            || '',
        location:         fields.location         || 'СНГ',
        format:           fields.format           || '',
        gameFormat:       fields.gameformat        || '',
        description:      fields.description      || '',
        telegramLink:     fields.telegram         || '',
        registrationLink: fields.registration     || '',
      },
    });

    await ctx.reply(
      `✅ Заявка принята!\n\nID: <code>${result.draftId}</code>\nТурнир: <b>${fields.title}</b>\n\nОжидайте проверки администратором.`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    log.error({ err: err.message }, 'draft: ошибка');
    await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
  }
}

module.exports = { draftCommand };