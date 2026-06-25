'use strict';

const { submitDraftWorkflow } = require('../../workflows/submitDraftWorkflow');
const { getUserPermission } = require('../middleware/auth');
const log = require('../../logger');

const wizardStates = new Map();
const WIZARD_TTL_MS = 10 * 60 * 1000;

const STEPS = [
  {
    field: 'title',
    prompt:
      '📌 <b>Шаг 1/9 — Название турнира</b>\n\n' +
      'Введите полное название турнира.\n\n' +
      '<i>Примеры: «RAMPAGE PULIK #5», «Enrage Lowrank Cup #12», «Турнир в честь Дня ВДВ»</i>',
    validate: v => v.length < 3 ? 'Название слишком короткое (минимум 3 символа)' : null,
  },
  {
    field: 'organizer',
    prompt:
      '🏢 <b>Шаг 2/9 — Организатор</b>\n\n' +
      'Введите название организатора точно так, как оно указано на сайте.\n\n' +
      '<i>Примеры: «RAMPAGE Tournaments», «Enrage», «ФКС России»</i>',
    validate: v => v.length < 2 ? 'Слишком короткое название' : null,
  },
  {
    field: 'start',
    prompt:
      '📅 <b>Шаг 3/9 — Дата начала</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n\n' +
      '<i>Пример: <code>2026-08-02</code></i>',
    validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Неверный формат. Нужно ГГГГ-ММ-ДД, например 2026-08-02',
  },
  {
    field: 'end',
    prompt:
      '📅 <b>Шаг 4/9 — Дата окончания</b>\n\n' +
      'Формат: <code>ГГГГ-ММ-ДД</code>\n\n' +
      '<i>Если турнир однодневный — укажите ту же дату что и начало</i>',
    validate: (v, data) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Неверный формат. Нужно ГГГГ-ММ-ДД, например 2026-08-02';
      if (data.start && v < data.start) return `Дата окончания (${v}) не может быть раньше начала (${data.start})`;
      return null;
    },
  },
  {
    field: 'prize',
    optional: true,
    prompt:
      '🏆 <b>Шаг 5/12 — Общий призовой фонд</b>\n\n' +
      'Укажите итоговую сумму призового фонда.\n\n' +
      '<i>Примеры: «12 000₽», «100 000₽»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'prize1',
    optional: true,
    prompt:
      '🥇 <b>Шаг 6/12 — Приз за 1 место</b>\n\n' +
      '<i>Пример: «60 000₽»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'prize2',
    optional: true,
    prompt:
      '🥈 <b>Шаг 7/12 — Приз за 2 место</b>\n\n' +
      '<i>Пример: «30 000₽»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'prize3',
    optional: true,
    prompt:
      '🥉 <b>Шаг 8/12 — Приз за 3 место</b>\n\n' +
      '<i>Пример: «10 000₽»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'limit',
    optional: true,
    prompt:
      '👥 <b>Шаг 9/12 — Лимит MMR / условия участия</b>\n\n' +
      'Укажите ограничения на участие.\n\n' +
      '<i>Примеры: «До 30 000 MMR на команду», «До 5 000 MMR на игрока», «Без лимита»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'format',
    optional: true,
    prompt:
      '🎮 <b>Шаг 10/12 — Формат турнира</b>\n\n' +
      'Система проведения.\n\n' +
      '<i>Примеры: «Single Elimination», «Double Elimination», «Round Robin», «Групповой этап + плейофф»</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
  {
    field: 'telegramLink',
    optional: true,
    prompt:
      '💬 <b>Шаг 11/12 — Ссылка на Telegram-канал или группу</b>\n\n' +
      'Где участники найдут актуальную информацию о турнире.\n\n' +
      '<i>Пример: <code>https://t.me/rampagetournaments</code></i>\n\n' +
      '➡️ /skip — пропустить',
    validate: v => /^https?:\/\/.+/.test(v) ? null : 'Должна быть ссылка вида https://t.me/...',
  },
  {
    field: 'description',
    optional: true,
    prompt:
      '📝 <b>Шаг 12/12 — Описание турнира</b>\n\n' +
      'Любая дополнительная информация: правила, особенности, требования к участникам.\n\n' +
      '<i>Можно написать несколько предложений</i>\n\n' +
      '➡️ /skip — пропустить',
    validate: null,
  },
];

function isExpired(state) {
  return Date.now() - state.startedAt > WIZARD_TTL_MS;
}

function cleanExpired() {
  const now = Date.now();
  for (const [id, state] of wizardStates.entries()) {
    if (now - state.startedAt > WIZARD_TTL_MS) wizardStates.delete(id);
  }
}

async function sendStep(ctx, stepIndex) {
  await ctx.reply(STEPS[stepIndex].prompt, { parse_mode: 'HTML' });
}

async function sendSummary(ctx, data) {
  const lines = [
    '📋 <b>Проверьте заявку перед отправкой:</b>\n',
    `📌 Название: <b>${data.title}</b>`,
    `🏢 Организатор: ${data.organizer}`,
    `📅 Даты: ${data.start} — ${data.end}`,
    data.prize        ? `🏆 Призовой фонд: ${data.prize}`   : '🏆 Призовой фонд: не указан',
    data.prize1       ? `🥇 1 место: ${data.prize1}`             : null,
    data.prize2       ? `🥈 2 место: ${data.prize2}`             : null,
    data.prize3       ? `🥉 3 место: ${data.prize3}`             : null,
    data.limit        ? `👥 Лимит: ${data.limit}`           : '👥 Лимит: не указан',
    data.format       ? `🎮 Формат: ${data.format}`         : '🎮 Формат: не указан',
    data.telegramLink ? `💬 Telegram: ${data.telegramLink}` : '💬 Telegram: не указан',
    data.description  ? `📝 Описание: ${data.description}`  : null,
  ].filter(Boolean);

  await ctx.reply(
    lines.join('\n') +
    '\n\n✅ Всё верно? Напишите <b>да</b> для отправки\n' +
    '✏️ Хотите изменить — напишите <b>нет</b> и начните заново (/draft)\n' +
    '❌ Отменить — /cancel',
    { parse_mode: 'HTML' }
  );
}

async function draftCommand(ctx) {
  const userId = ctx.from?.id;
  cleanExpired();

  const existing = wizardStates.get(userId);
  if (existing && !isExpired(existing)) {
    const stepIdx = typeof existing.step === 'number' ? existing.step : null;
    return ctx.reply(
      `⚠️ У вас уже есть незавершённая заявка${stepIdx !== null ? ` (шаг ${stepIdx + 1}/9)` : ''}.\n\n` +
      'Продолжите заполнение или введите /cancel для отмены.',
      { parse_mode: 'HTML' }
    );
  }

  wizardStates.set(userId, { step: 0, data: {}, startedAt: Date.now() });

  await ctx.reply(
    '📋 <b>Подача заявки на турнир</b>\n\n' +
    'Отвечайте на вопросы по одному.\n' +
    'Необязательные шаги можно пропустить командой /skip.\n' +
    'Отменить в любой момент: /cancel\n\n' +
    '─────────────────────',
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

  if (!state || isExpired(state)) {
    wizardStates.delete(userId);
    return false;
  }

  // Шаг подтверждения
  if (state.step === 'confirm') {
    await handleConfirm(ctx, state, userId);
    return true;
  }

  const text    = (ctx.message?.text || '').trim();
  const stepDef = STEPS[state.step];
  const isSkip  = (text === '/skip');

  if (text === '/cancel') {
    wizardStates.delete(userId);
    await ctx.reply('❌ Заявка отменена. Начать заново: /draft');
    return true;
  }

  if (isSkip) {
    if (!stepDef.optional) {
      await ctx.reply(
        `⚠️ Этот шаг обязателен, /skip недоступен.\n\n${stepDef.prompt}`,
        { parse_mode: 'HTML' }
      );
      return true;
    }
    state.data[stepDef.field] = '';
  } else {
    if (stepDef.validate) {
      const error = stepDef.validate(text, state.data);
      if (error) {
        await ctx.reply(`❌ ${error}\n\nПопробуйте ещё раз:`, { parse_mode: 'HTML' });
        return true;
      }
    }
    state.data[stepDef.field] = text;
  }

  state.step++;

  if (state.step >= STEPS.length) {
    state.step = 'confirm';
    await sendSummary(ctx, state.data);
    return true;
  }

  await sendStep(ctx, state.step);
  return true;
}

async function handleConfirm(ctx, state, userId) {
  const text = (ctx.message?.text || '').trim().toLowerCase();

  if (['да', 'yes', '+', 'ок', 'ok'].includes(text)) {
    wizardStates.delete(userId);
    await ctx.sendChatAction('typing');

    try {
      const permission = await getUserPermission(userId);
      const data       = state.data;

      const result = await submitDraftWorkflow({
        submittedBy:   userId,
        actorRole:     ctx.userRole || 'organizer',
        organizerName: permission?.organizerId || data.organizer,
        payload: {
          title:            data.title,
          start:            data.start,
          end:              data.end,
          organizer:        data.organizer,
          prize:            data.prize        || '',
          prizePool: [
            ...(data.prize1 ? [{ place: 1, amount: data.prize1, team: '' }] : []),
            ...(data.prize2 ? [{ place: 2, amount: data.prize2, team: '' }] : []),
            ...(data.prize3 ? [{ place: 3, amount: data.prize3, team: '' }] : []),
          ],
          limit:            data.limit        || '',
          location:         'СНГ',
          format:           data.format       || '',
          gameFormat:       '',
          description:      data.description  || '',
          telegramLink:     data.telegramLink  || '',
          registrationLink: '',
        },
      });

      await ctx.reply(
        `✅ <b>Заявка отправлена!</b>\n\n` +
        `Турнир: <b>${data.title}</b>\n` +
        `ID черновика:\n<code>${result.draftId}</code>\n\n` +
        `Администратор проверит заявку и опубликует турнир на сайте.\n` +
        `Следить за статусом: /mydrafts`,
        { parse_mode: 'HTML' }
      );

    } catch (err) {
      log.error({ userId, err: err.message }, 'wizard confirm: ошибка');
      await ctx.reply(`❌ Ошибка при отправке: <code>${err.message}</code>`, { parse_mode: 'HTML' });
    }

  } else if (['нет', 'no', '-'].includes(text)) {
    wizardStates.delete(userId);
    await ctx.reply('❌ Заявка отменена.\n\nНачать заново: /draft');
  } else {
    await ctx.reply(
      'Напишите <b>да</b> чтобы отправить заявку, или <b>нет</b> чтобы отменить.',
      { parse_mode: 'HTML' }
    );
  }
}

module.exports = { draftCommand, cancelCommand, processWizardText };
