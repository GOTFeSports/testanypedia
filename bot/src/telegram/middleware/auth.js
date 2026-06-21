'use strict';

const { getFile } = require('../../github/client');
const { parseAdminJson } = require('../../data/adminJsonFile');
const REPO_PATHS = require('../../github/repoPaths');
const config = require('../../config');
const log = require('../../logger');

let permissionsCache = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getPermissions() {
  if (permissionsCache && Date.now() < cacheExpiresAt) return permissionsCache;
  const file = await getFile(REPO_PATHS.ADMIN.PERMISSIONS);
  const data = parseAdminJson(file ? file.content : null, REPO_PATHS.ADMIN.PERMISSIONS);
  permissionsCache = data.permissions || [];
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return permissionsCache;
}

async function getUserRole(telegramId) {
  if (config.admins.includes(telegramId)) return 'admin';
  const permissions = await getPermissions();
  const entry = permissions.find(p => p.telegramUserId === telegramId);
  return entry ? entry.role : null;
}

async function getUserPermission(telegramId) {
  if (config.admins.includes(telegramId))
    return { telegramUserId: telegramId, role: 'admin', organizerId: null, teamId: null };
  const permissions = await getPermissions();
  return permissions.find(p => p.telegramUserId === telegramId) || null;
}

function invalidatePermissionsCache() {
  permissionsCache = null;
  cacheExpiresAt = 0;
}

function requireRole(allowedRoles) {
  return async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return ctx.reply('Не удалось определить пользователя.');
    let role;
    try {
      role = await getUserRole(telegramId);
    } catch (err) {
      log.error({ telegramId, err: err.message }, 'auth: ошибка проверки прав');
      return ctx.reply('Ошибка проверки прав. Попробуйте позже.');
    }
    if (!role || !allowedRoles.includes(role)) {
      log.warn({ telegramId, role, allowedRoles }, 'auth: доступ запрещён');
      return ctx.reply('У вас нет прав для этой команды.');
    }
    ctx.userRole = role;
    return next();
  };
}

module.exports = { requireRole, getUserRole, getUserPermission, invalidatePermissionsCache };