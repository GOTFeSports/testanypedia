'use strict';

/**
 * In-memory rate limiter на пользователя.
 * Map<userId, { count: number, windowStart: number }>
 *
 * ВАЖНО: wizard-сообщения (ответы на вопросы в /draft) не должны
 * считаться в лимит команд. Иначе пользователь, быстро отвечающий
 * на 9 шагов wizard, получает "Слишком много запросов".
 *
 * Решение: отдельный счётчик для команд vs. текстовых сообщений.
 * Wizard-ответы — это текстовые сообщения, они идут через bot.on('text'),
 * а не через bot.command(). Глобальный rate limiter должен применяться
 * только к командам (bot.use), но НЕ к текстовым wizard-ответам.
 *
 * В bot.js глобальный bot.use(rateLimit) заменяется на точечное
 * применение к конкретным "тяжёлым" командам (/match, /approve и т.д.),
 * а bot.on('text') не получает rate limit вообще.
 */

const commandWindows = new Map();  // для команд (/match, /draft и т.д.)

/**
 * Rate limiter для команд.
 * Применяется точечно к конкретным командам, не глобально.
 *
 * @param {object} opts
 * @param {number} opts.maxRequests  — максимум в окне (default: 5)
 * @param {number} opts.windowMs     — окно в мс (default: 60_000)
 * @param {string} [opts.message]    — сообщение при превышении
 * @param {string} [opts.namespace]  — пространство имён (чтобы разные команды имели разные счётчики)
 */
function rateLimit({ maxRequests = 5, windowMs = 60_000, message, namespace = 'default' } = {}) {
  return (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const key   = `${namespace}:${userId}`;
    const now   = Date.now();
    const entry = commandWindows.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      commandWindows.set(key, { count: 1, windowStart: now });
      return next();
    }

    if (entry.count >= maxRequests) {
      const remaining = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return ctx.reply(
        message || `Слишком много запросов. Подождите ${remaining} сек.`
      );
    }

    entry.count++;
    return next();
  };
}

/**
 * Сброс счётчика для конкретного пользователя и namespace.
 * Используется в тестах.
 */
function resetRateLimit(userId, namespace = 'default') {
  commandWindows.delete(`${namespace}:${userId}`);
}

/**
 * Диагностика — текущее состояние всех счётчиков.
 */
function getRateLimitStats() {
  const stats = {};
  for (const [key, entry] of commandWindows.entries()) {
    stats[key] = { count: entry.count, windowStart: entry.windowStart };
  }
  return stats;
}

module.exports = { rateLimit, resetRateLimit, getRateLimitStats };
