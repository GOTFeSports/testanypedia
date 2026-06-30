'use strict';

const { submitDraftWorkflow } = require('../../workflows/submitDraftWorkflow');
const { getUserPermission }   = require('../middleware/auth');
const log = require('../../logger');

/**
 * Wizard создания турнира — полная карточка.
 * Обязательные поля: title, start, end, teams, format, organizer
 * Всё остальное — /skip
 */

const wizardStates = new Map();
const WIZARD_TTL_MS = 15 * 60 * 1000; // 15 минут

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const URL_RE  = /^https?:\/\/.+/;
const INT_RE  = /^\d+$/;

const STEPS = [
  {
    field: 'title',
    prompt:
      '📌 <b>Шаг 1/20 — Название турнира</b>\n\n' +
      '<i>Пример: «RAMPAGE PULIK #5», «Enrage Lowrank Cup»</i>',
    validate: v => v.length < 3 ? 'Минимум 3 символа' : null,
  },
  {
    field: 'organizer',
    prompt:
      '🏢 <b>Шаг 2/20 — Организатор</b>\n\n' +
      '<i>Точное название как на сайте: «RAMPAGE Tournaments», «Enrage»</i>',
    validate: v => v.length < 2 ? 'Слишком короткое' : null,
  },
  {
    field: 'start',
    prompt:
      '📅 <b>Шаг 3/20 — Дата начала</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n<i>Пример: <code>2026-08-02</code></i>',
    validate: v => DATE_RE.test(v) ? null : 'Формат: ГГГГ-ММ-ДД',
  },
  {
    field: 'end',
    prompt:
      '📅 <b>Шаг 4/20 — Дата окончания</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n<i>Если однодневный — та же дата что начало</i>',
    validate: (v, d) => {
      if (!DATE_RE.test(v)) return 'Формат: ГГГГ-ММ-ДД';
      if (d.start && v < d.start) return `Конец не может быть раньше начала (${d.start})`;
      return null;
    },
  },
  {
    field: 'teams',
    prompt:
      '👥 <b>Шаг 5/20 — Количество команд</b>\n\n' +
      '<i>Пример: 8, 16, 32</i>',
    validate: v => INT_RE.test(v) && parseInt(v) > 1 ? null : 'Введите число больше 1',
  },
  {
    field: 'format',
    prompt:
      '🎮 <b>Шаг 6/20 — Формат турнира</b>\n\n' +
      '<i>Примеры: «Single Elimination», «Double Elimination», «Swiss + Playoff»</i>',
    validate: null,
  },
  // Необязательные поля
  {
    field: 'startTime',
    optional: true,
    prompt:
      '🕐 <b>Шаг 7/20 — Время начала</b>\n\n' +
      'Формат: <code>ЧЧ:ММ</code> (по МСК)\n<i>Пример: <code>18:00</code></i>\n\n➡️ /skip',
    validate: v => TIME_RE.test(v) ? null : 'Формат: ЧЧ:ММ',
  },
  {
    field: 'registrationStart',
    optional: true,
    prompt:
      '📝 <b>Шаг 8/20 — Начало регистрации</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n\n➡️ /skip',
    validate: v => DATE_RE.test(v) ? null : 'Формат: ГГГГ-ММ-ДД',
  },
  {
    field: 'registrationEnd',
    optional: true,
    prompt:
      '📝 <b>Шаг 9/20 — Конец регистрации</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n\n➡️ /skip',
    validate: v => DATE_RE.test(v) ? null : 'Формат: ГГГГ-ММ-ДД',
  },
  {
    field: 'limit',
    optional: true,
    prompt:
      '📊 <b>Шаг 10/20 — Лимит MMR</b>\n\n' +
      '<i>Пример: «До 30 000 MMR на команду»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'prize',
    optional: true,
    prompt:
      '🏆 <b>Шаг 11/20 — Общий призовой фонд</b>\n\n' +
      '<i>Пример: «100 000₽»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'prize1',
    optional: true,
    prompt: '🥇 <b>Шаг 12/20 — Приз за 1 место</b>\n\n<i>Пример: «60 000₽»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'prize2',
    optional: true,
    prompt: '🥈 <b>Шаг 13/20 — Приз за 2 место</b>\n\n<i>Пример: «30 000₽»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'prize3',
    optional: true,
    prompt: '🥉 <b>Шаг 14/20 — Приз за 3 место</b>\n\n<i>Пример: «10 000₽»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'location',
    optional: true,
    prompt: '📍 <b>Шаг 15/20 — Локация</b>\n\n<i>Пример: «СНГ», «Россия», «Онлайн»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'gameFormat',
    optional: true,
    prompt:
      '🎯 <b>Шаг 16/20 — Игровой формат</b>\n\n' +
      '<i>Пример: «Captains Mode», «All Pick»</i>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'telegramLink',
    optional: true,
    prompt: '💬 <b>Шаг 17/23 — Telegram канал/группа</b>\n\n<i>https://t.me/...</i>\n\n➡️ /skip',
    validate: v => URL_RE.test(v) ? null : 'Нужна ссылка https://...',
  },
  {
    field: 'discordLink',
    optional: true,
    prompt: '🎮 <b>Шаг 18/23 — Discord</b>\n\n<i>https://discord.gg/...</i>\n\n➡️ /skip',
    validate: v => URL_RE.test(v) ? null : 'Нужна ссылка https://...',
  },
  {
    field: 'rulesLink',
    optional: true,
    prompt: '📜 <b>Шаг 19/23 — Ссылка на правила</b>\n\n<i>https://...</i>\n\n➡️ /skip',
    validate: v => URL_RE.test(v) ? null : 'Нужна ссылка https://...',
  },
  {
    field: 'dotabuffLink',
    optional: true,
    prompt: '📊 <b>Шаг 20/23 — Dotabuff турнира</b>\n\n<i>https://www.dotabuff.com/...</i>\n\n➡️ /skip',
    validate: v => URL_RE.test(v) ? null : 'Нужна ссылка https://...',
  },
  {
    field: 'bracketEmbed',
    optional: true,
    prompt:
      '🖼 <b>Шаг 21/23 — Embed-ссылка на внешнюю сетку</b>\n\n' +
      'Используется только если НЕ создаёте сетку через /createbracket.\n\n' +
      '<i>https://challonge.com/embed/...</i>\n\n➡️ /skip',
    validate: v => URL_RE.test(v) ? null : 'Нужна ссылка https://...',
  },
  {
    field: 'casters',
    optional: true,
    prompt:
      '🎙 <b>Шаг 22/23 — Кастеры</b>\n\n' +
      'Через запятую: <code>Имя1, Имя2</code>\n\n➡️ /skip',
    validate: null,
  },
  {
    field: 'description',
    optional: true,
    prompt: '📝 <b>Шаг 23/23 — Описание</b>\n\nДополнительная информация.\n\n➡️ /skip',
    validate: null,
  },
];

function isExpired(s) { return Date.now() - s.startedAt > WIZARD_TTL_MS; }

function cleanExpired() {
  const now = Date.now();
  for (const [id, s] of wizardStates.entries()) {
    if (now - s.startedAt > WIZARD_TTL_MS) wizardStates.delete(id);
  }
}

async function sendStep(ctx, stepIndex) {
  await ctx.reply(STEPS[stepIndex].prompt, { parse_mode: 'HTML' });
}

function buildSummary(data) {
  const lines = [
    '📋 <b>Проверьте заявку:</b>\n',
    `📌 <b>${data.title}</b>`,
    `🏢 ${data.organizer}`,
    `📅 ${data.start} — ${data.end}`,
    data.startTime         ? `🕐 Начало: ${data.startTime} МСК`          : null,
    data.registrationStart ? `📝 Рег.: ${data.registrationStart}` + (data.registrationEnd ? ` — ${data.registrationEnd}` : '') : null,
    `👥 Команд: ${data.teams}`,
    `🎮 Формат: ${data.format}`,
    data.limit             ? `📊 ${data.limit}`                           : null,
    data.location          ? `📍 ${data.location}`                        : null,
    data.gameFormat        ? `🎯 ${data.gameFormat}`                      : null,
    data.prize             ? `🏆 Приз: ${data.prize}`                     : null,
    data.prize1            ? `🥇 1 место: ${data.prize1}`                 : null,
    data.prize2            ? `🥈 2 место: ${data.prize2}`                 : null,
    data.prize3            ? `🥉 3 место: ${data.prize3}`                 : null,
    data.telegramLink      ? `💬 ${data.telegramLink}`                    : null,
    data.discordLink       ? `🎮 ${data.discordLink}`                     : null,
    data.casters           ? `🎙 Кастеры: ${data.casters}`                : null,
    data.description       ? `\n📝 ${data.description}`                   : null,
  ].filter(Boolean).join('\n');

  return lines + '\n\n✅ Отправить — <b>да</b>\n❌ Отменить — /cancel';
}

async function draftCommand(ctx) {
  const userId = ctx.from?.id;
  cleanExpired();

  const existing = wizardStates.get(userId);
  if (existing && !isExpired(existing)) {
    const si = typeof existing.step === 'number' ? existing.step : null;
    return ctx.reply(
      `⚠️ У вас уже есть незавершённая заявка${si !== null ? ` (шаг ${si + 1}/20)` : ''}.\n\n` +
      'Продолжите или введите /cancel для отмены.',
      { parse_mode: 'HTML' }
    );
  }

  wizardStates.set(userId, { step: 0, data: {}, startedAt: Date.now() });

  await ctx.reply(
    '📋 <b>Подача заявки на турнир</b>\n\n' +
    '20 шагов. Необязательные — /skip.\n' +
    'Отменить: /cancel\n\n──────────────────',
    { parse_mode: 'HTML' }
  );
  await sendStep(ctx, 0);
}

async function cancelCommand(ctx) {
  const userId = ctx.from?.id;
  if (wizardStates.has(userId)) {
    wizardStates.delete(userId);
    return ctx.reply('❌ Заявка отменена. Начать заново: /draft');
  }
  return ctx.reply('Нет активной заявки.');
}

async function processWizardText(ctx) {
  const userId = ctx.from?.id;
  const state  = wizardStates.get(userId);
  if (!state || isExpired(state)) { wizardStates.delete(userId); return false; }

  if (state.step === 'confirm') { await handleConfirm(ctx, state, userId); return true; }

  const text    = (ctx.message?.text || '').trim();
  const stepDef = STEPS[state.step];
  const isSkip  = text === '/skip';

  if (text === '/cancel') {
    wizardStates.delete(userId);
    await ctx.reply('❌ Заявка отменена. Начать заново: /draft');
    return true;
  }

  if (isSkip) {
    if (!stepDef.optional) {
      await ctx.reply(`⚠️ Этот шаг обязателен.\n\n${stepDef.prompt}`, { parse_mode: 'HTML' });
      return true;
    }
    state.data[stepDef.field] = '';
  } else {
    if (stepDef.validate) {
      const err = stepDef.validate(text, state.data);
      if (err) { await ctx.reply(`❌ ${err}\n\nПовторите:`, { parse_mode: 'HTML' }); return true; }
    }
    state.data[stepDef.field] = text;
  }

  state.step++;

  if (state.step >= STEPS.length) {
    state.step = 'confirm';
    await ctx.reply(buildSummary(state.data), { parse_mode: 'HTML' });
    return true;
  }

  await sendStep(ctx, state.step);
  return true;
}

async function handleConfirm(ctx, state, userId) {
  const text = (ctx.message?.text || '').trim().toLowerCase();

  if (['да','yes','+','ок','ok'].includes(text)) {
    wizardStates.delete(userId);
    await ctx.sendChatAction('typing');

    try {
      const perm = await getUserPermission(userId);
      const d    = state.data;

      // Собираем prizePool
      const prizePool = [];
      if (d.prize1) prizePool.push({ place: 1, amount: d.prize1, team: '' });
      if (d.prize2) prizePool.push({ place: 2, amount: d.prize2, team: '' });
      if (d.prize3) prizePool.push({ place: 3, amount: d.prize3, team: '' });

      // Кастеры
      const casters = d.casters
        ? d.casters.split(',').map(s => ({ name: s.trim(), link: '' })).filter(c => c.name)
        : [];

      const result = await submitDraftWorkflow({
        submittedBy:   userId,
        actorRole:     ctx.userRole || 'organizer',
        organizerName: perm?.organizerId || d.organizer,
        payload: {
          title:             d.title,
          start:             d.start,
          end:               d.end,
          startTime:         d.startTime         || '',
          registrationStart: d.registrationStart || '',
          registrationEnd:   d.registrationEnd   || '',
          teams:             d.teams             || '',
          organizer:         d.organizer,
          format:            d.format            || '',
          gameFormat:        d.gameFormat        || '',
          limit:             d.limit             || '',
          prize:             d.prize             || '',
          location:          d.location          || 'СНГ',
          description:       d.description       || '',
          telegramLink:      d.telegramLink      || '',
          discordLink:       d.discordLink       || '',
          rulesLink:         d.rulesLink         || '',
          dotabuffLink:      d.dotabuffLink      || '',
          bracketEmbed:      d.bracketEmbed      || '',
          registrationLink:  '',
          prizePool,
          casters,
        },
      });

      await ctx.reply(
        `✅ <b>Заявка отправлена!</b>\n\n` +
        `Турнир: <b>${d.title}</b>\n` +
        `ID черновика:\n<code>${result.draftId}</code>\n\n` +
        `Администратор проверит и опубликует на сайте.\n` +
        `Статус: /mydrafts`,
        { parse_mode: 'HTML' }
      );

    } catch (err) {
      log.error({ userId, err: err.message }, 'draft confirm: ошибка');
      await ctx.reply(`❌ Ошибка: <code>${err.message}</code>`, { parse_mode: 'HTML' });
    }

  } else if (['нет','no','-'].includes(text)) {
    wizardStates.delete(userId);
    await ctx.reply('❌ Отменено. Начать заново: /draft');
  } else {
    await ctx.reply('Напишите <b>да</b> или <b>нет</b>.', { parse_mode: 'HTML' });
  }
}

module.exports = { draftCommand, cancelCommand, processWizardText };
