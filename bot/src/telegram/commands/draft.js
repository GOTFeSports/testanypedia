'use strict';

const { submitDraftWorkflow } = require('../../workflows/submitDraftWorkflow');
const { getUserPermission } = require('../middleware/auth');
const log = require('../../logger');

/**
 * Хранилище состояний wizard в памяти процесса.
 * Map<telegramUserId, WizardState>
 *
 * Структура WizardState:
 * {
 *   step: number,          // текущий шаг (0..STEPS.length-1)
 *   data: object,          // накопленные поля
 *   messageId: number,     // id сообщения с инструкцией (для удаления при отмене)
 *   startedAt: number,     // timestamp старта (для TTL-очистки)
 * }
 */
const wizardStates = new Map();
const WIZARD_TTL_MS = 10 * 60 * 1000; // 10 минут — после этого wizard сбрасывается

/**
 * Шаги wizard. Каждый шаг:
 *   field    — ключ в объекте data
 *   prompt   — вопрос боту
 *   optional — можно пропустить командой /skip
 *   validate — функция валидации (возвращает строку ошибки или null)
 */
const STEPS = [
  {
    field: 'title',
    prompt: '📌 <b>Шаг 1/9 — Название турнира</b>\n\nВведите полное название:',
    validate: v => v.length < 3 ? 'Название слишком короткое (минимум 3 символа)' : null,
  },
  {
    field: 'organizer',
    prompt: '🏢 <b>Шаг 2/9 — Организатор</b>\n\nВведите название организатора:',
    validate: v => v.length < 2 ? 'Слишком короткое название' : null,
  },
  {
    field: 'start',
    prompt: '📅 <b>Шаг 3/9 — Дата начала</b>\n\nФормат: <code>YYYY-MM-DD</code>\nПример: <code>2026-08-02</code>',
    validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Неверный формат. Используйте YYYY-MM-DD',
  },
  {
    field: 'end',
    prompt: '📅 <b>Шаг 4/9 — Дата окончания</b>\n\nФормат: <code>YYYY-MM-DD</code>',
    validate: (v, data) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Неверный формат. Используйте YYYY-MM-DD';
      if (data.start && v < data.start) return `Дата окончания не может быть раньше начала (${data.start})`;
      return null;
    },
  },
  {
    field: 'prize',
    prompt: '🏆 <b>Шаг 5/9 — Призовой фонд</b>\n\nПример: <code>12000₽</code>\n\n/skip — пропустить',
    optional: true,
    validate: null,
  },
  {
    field: 'limit',
    prompt: '👥 <b>Шаг 6/9 — Лимит MMR</b>\n\nПример: <code>До 30.000 MMR на команду</code>\n\n/skip — пропустить',
    optional: true,
    validate: null,
  },
  {
    field: 'format',
    prompt: '🎮 <b>Шаг 7/9 — Формат турнира</b>\n\nПример: <code>Single Elimination</code>, <code>Double Elimination</code>\n\n/skip — пропустить',
    optional: true,
    validate: null,
  },
  {
    field: 'telegramLink',
    prompt: '💬 <b>Шаг 8/9 — Telegram-канал/группа</b>\n\nВведите ссылку вида <code>https://t.me/...</code>\n\n/skip — пропустить',
    optional: true,
    validate: v => /^https?:\/\/.+/.test(v) ? null : 'Должна быть ссылка вида https://...',
  },
  {
    field: 'description',
    prompt: '📝 <b>Шаг 9/9 — Описание</b>\n\nДополнительная информация о турнире.\n\n/skip — пропустить',
    optional: true,
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

async function sendStep(ctx, step, data) {
  const stepDef = STEPS[step];
  await ctx.reply(stepDef.prompt, { parse_mode: 'HTML' });
}

async function sendSummary(ctx, data) {
  const lines = [
    `📋 <b>Проверьте заявку:</b>\n`,
    `📌 Название: <b>${data.title}</b>`,
    `🏢 Организатор: ${data.organizer}`,
    `📅 Даты: ${data.start} — ${data.end}`,
    data.prize       ? `🏆 Приз: ${data.prize}`     : null,
    data.limit       ? `👥 Лимит: ${data.limit}`     : null,
    data.format      ? `🎮 Формат: ${data.format}`   : null,
    data.telegramLink? `💬 ${data.telegramLink}`      : null,
    data.description ? `📝 ${data.description}`      : null,
  ].filter(Boolean);

  await ctx.reply(
    lines.join('\n') +
    '\n\n✅ Отправить заявку — напишите <b>да</b>\n❌ Отменить — /cancel',
    { parse_mode: 'HTML' }
  );
}

/**
 * Обработчик команды /draft.
 * Если wizard не запущен — стартует его.
 * Если уже запущен — напоминает что нужно ответить или отменить.
 */
async function draftCommand(ctx) {
  const userId = ctx.from?.id;
  cleanExpired();

  const existing = wizardStates.get(userId);
  if (existing && !isExpired(existing)) {
    const step = STEPS[existing.step];
    return ctx.reply(
      `⚠️ У вас уже открыта заявка (шаг ${existing.step + 1}/9).\n\n` +
      `Ответьте на вопрос или введите /cancel для отмены.\n\n` +
      step.prompt,
      { parse_mode: 'HTML' }
    );
  }

  // Стартуем wizard
  wizardStates.set(userId, { step: 0, data: {}, startedAt: Date.now() });

  await ctx.reply(
    '📋 <b>Подача заявки на турнир</b>\n\n' +
    'Я задам 9 вопросов. На необязательные вопросы можно ответить <code>/skip</code>.\n' +
    'Отменить в любой момент: /cancel\n',
    { parse_mode: 'HTML' }
  );

  await sendStep(ctx, 0, {});
}

/**
 * Обработчик отмены wizard.
 */
async function cancelCommand(ctx) {
  const userId = ctx.from?.id;
  if (wizardStates.has(userId)) {
    wizardStates.delete(userId);
    return ctx.reply('❌ Заявка отменена.');
  }
  return ctx.reply('Нет активной заявки.');
}

/**
 * Обработчик текстовых сообщений — продвигает wizard вперёд.
 * Вызывается из bot.js на событии 'text' если у пользователя есть активный wizard.
 */
async function handleWizardMessage(ctx) {
  const userId = ctx.from?.id;
  const state  = wizardStates.get(userId);

  if (!state || isExpired(state)) {
    wizardStates.delete(userId);
    return false; // wizard не активен — не обрабатываем
  }

  const text    = (ctx.message?.text || '').trim();
  const stepDef = STEPS[state.step];
  const isSkip  = text === '/skip';

  // /cancel обрабатывается отдельной командой, но на всякий случай
  if (text === '/cancel') {
    wizardStates.delete(userId);
    await ctx.reply('❌ Заявка отменена.');
    return true;
  }

  // Пропуск необязательного шага
  if (isSkip) {
    if (!stepDef.optional) {
      await ctx.reply(`⚠️ Этот шаг обязателен — /skip недоступен.\n\n${stepDef.prompt}`, { parse_mode: 'HTML' });
      return true;
    }
    state.data[stepDef.field] = '';
  } else {
    // Валидация
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

  // Все шаги пройдены — показываем итог
  if (state.step >= STEPS.length) {
    await sendSummary(ctx, state.data);
    state.step = 'confirm'; // специальный "шаг" ожидания подтверждения
    return true;
  }

  // Следующий шаг
  await sendStep(ctx, state.step, state.data);
  return true;
}

/**
 * Обработчик подтверждения заявки ("да" / "yes").
 * Вызывается из handleWizardMessage когда шаг === 'confirm'.
 */
async function handleWizardConfirm(ctx, state, userId) {
  const text = (ctx.message?.text || '').trim().toLowerCase();

  if (text === 'да' || text === 'yes' || text === '+') {
    wizardStates.delete(userId);
    await ctx.sendChatAction('typing');

    try {
      const permission  = await getUserPermission(userId);
      const data        = state.data;

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
        `ID черновика: <code>${result.draftId}</code>\n` +
        `Турнир: <b>${data.title}</b>\n\n` +
        `Администратор проверит заявку и опубликует турнир на сайте.\n` +
        `Статус: /mydrafts`,
        { parse_mode: 'HTML' }
      );

    } catch (err) {
      log.error({ userId, err: err.message }, 'wizard confirm: ошибка');
      await ctx.reply(`❌ Ошибка при отправке: <code>${err.message}</code>`, { parse_mode: 'HTML' });
    }

  } else if (text === 'нет' || text === 'no' || text === '-') {
    wizardStates.delete(userId);
    await ctx.reply('❌ Заявка отменена. Можете начать заново: /draft');
  } else {
    await ctx.reply('Ответьте <b>да</b> для отправки или <b>нет</b> для отмены.\nОтменить: /cancel', { parse_mode: 'HTML' });
  }
}

/**
 * Главная точка входа для обработки текстовых сообщений в wizard.
 * Возвращает true если сообщение было обработано wizard'ом.
 */
async function processWizardText(ctx) {
  const userId = ctx.from?.id;
  const state  = wizardStates.get(userId);
  if (!state || isExpired(state)) return false;

  if (state.step === 'confirm') {
    await handleWizardConfirm(ctx, state, userId);
    return true;
  }

  return handleWizardMessage(ctx);
}

module.exports = { draftCommand, cancelCommand, processWizardText };
