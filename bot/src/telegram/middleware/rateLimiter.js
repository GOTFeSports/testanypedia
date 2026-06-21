'use strict';

const userWindows = new Map();

function rateLimit({ maxRequests = 5, windowMs = 60_000, message } = {}) {
  return (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    const now = Date.now();
    const entry = userWindows.get(userId);
    if (!entry || now - entry.windowStart > windowMs) {
      userWindows.set(userId, { count: 1, windowStart: now });
      return next();
    }
    if (entry.count >= maxRequests) {
      const remaining = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return ctx.reply(message || `Слишком много запросов. Подождите ${remaining} сек.`);
    }
    entry.count++;
    return next();
  };
}

module.exports = { rateLimit };