'use strict';

const { getFile }    = require('../github/client');
const { parseJsDataFile, findTournamentById } = require('../data/jsDataFile');
const REPO_PATHS     = require('../github/repoPaths');
const config         = require('../config');
const log            = require('../logger');

/**
 * Централизованная проверка прав на управление конкретным турниром.
 *
 * Правила:
 *   - Глобальный админ (в ADMIN_TELEGRAM_IDS) → может управлять любым турниром
 *   - Владелец турнира (tournament.ownerTelegramId === userId) → только свой турнир
 *   - Все остальные → нет доступа
 *
 * @param {number} userId           — Telegram ID пользователя
 * @param {object} tournament       — объект турнира из data.js
 * @returns {{ allowed: boolean, reason: string }}
 */
function canManageTournament(userId, tournament) {
  if (!userId || !tournament) {
    return { allowed: false, reason: 'Не передан userId или tournament' };
  }

  // Глобальный админ — доступ ко всему
  if (config.admins.includes(userId)) {
    return { allowed: true, reason: 'admin' };
  }

  // Владелец турнира — только свой
  if (tournament.ownerTelegramId && tournament.ownerTelegramId === userId) {
    return { allowed: true, reason: 'owner' };
  }

  return {
    allowed: false,
    reason: tournament.ownerTelegramId
      ? `Турнир принадлежит другому пользователю (tg:${tournament.ownerTelegramId})`
      : 'Турнир не имеет владельца. Обратитесь к администратору.',
  };
}

/**
 * Загружает турнир из GitHub и проверяет права текущего пользователя.
 * Возвращает { tournament, allowed, reason } или бросает ошибку если
 * турнир не найден.
 *
 * @param {number} userId
 * @param {string} tournamentId
 */
async function loadAndCheckTournament(userId, tournamentId) {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден в репозитории');

  const tournaments = parseJsDataFile(file.content, 'tournaments');
  const tournament  = findTournamentById(tournaments, tournamentId);
  if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);

  const check = canManageTournament(userId, tournament);
  return { tournament, tournaments, ...check };
}

/**
 * Middleware-фабрика для команд с tournamentId в аргументах.
 * Проверяет что пользователь имеет право управлять турниром,
 * указанным как второй аргумент команды.
 *
 * Использование в bot.js:
 *   bot.command('startmatch', requireTournamentAccess(), startMatchCommand)
 *
 * Команда должна иметь tournamentId как parts[1].
 */
function requireTournamentAccess() {
  return async (ctx, next) => {
    const parts        = (ctx.message?.text || '').trim().split(/\s+/);
    const tournamentId = parts[1];
    const userId       = ctx.from?.id;

    if (!tournamentId) return next(); // нет tournamentId — пусть сама команда обработает

    // Глобальный админ проходит без запроса в GitHub (оптимизация)
    if (config.admins.includes(userId)) {
      ctx.tournamentAccess = { allowed: true, reason: 'admin' };
      return next();
    }

    try {
      const result = await loadAndCheckTournament(userId, tournamentId);
      if (!result.allowed) {
        log.warn({ userId, tournamentId, reason: result.reason }, 'tournamentAuth: доступ запрещён');
        return ctx.reply(
          `❌ Нет доступа к турниру <code>${tournamentId}</code>\n\n${result.reason}`,
          { parse_mode: 'HTML' }
        );
      }
      ctx.tournamentAccess = { allowed: true, reason: result.reason, tournament: result.tournament };
      return next();
    } catch (err) {
      log.error({ userId, tournamentId, err: err.message }, 'tournamentAuth: ошибка загрузки');
      return ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
    }
  };
}

module.exports = { canManageTournament, loadAndCheckTournament, requireTournamentAccess };
