'use strict';

const log = require('../logger');
const { EMPTY_DRAFTS }        = require('./schemas/drafts.schema');
const { EMPTY_PERMISSIONS }   = require('./schemas/permissions.schema');
const { EMPTY_SUBSCRIPTIONS } = require('./schemas/subscriptions.schema');
const { EMPTY_BOT_STATE }     = require('./schemas/botState.schema');
const { EMPTY_ACTIVITY_LOG }  = require('./schemas/activityLog.schema');
const REPO_PATHS = require('../github/repoPaths');

const EMPTY_DEFAULTS = {
  [REPO_PATHS.ADMIN.DRAFTS]:        EMPTY_DRAFTS,
  [REPO_PATHS.ADMIN.PERMISSIONS]:   EMPTY_PERMISSIONS,
  [REPO_PATHS.ADMIN.SUBSCRIPTIONS]: EMPTY_SUBSCRIPTIONS,
  [REPO_PATHS.ADMIN.BOT_STATE]:     EMPTY_BOT_STATE,
  [REPO_PATHS.ADMIN.ACTIVITY_LOG]:  EMPTY_ACTIVITY_LOG,
};

function parseAdminJson(currentContent, filePath) {
  if (currentContent === null) {
    const empty = EMPTY_DEFAULTS[filePath];
    if (!empty) throw new Error(`adminJsonFile: нет дефолтной структуры для "${filePath}"`);
    log.info({ filePath }, 'adminJsonFile: инициализируем пустой структурой');
    return JSON.parse(JSON.stringify(empty));
  }
  try {
    return JSON.parse(currentContent);
  } catch (err) {
    throw new Error(`adminJsonFile: ошибка парсинга JSON "${filePath}": ${err.message}`);
  }
}

function buildJsonMutateFn(filePath, mutateFn, commitMessage, zodSchema) {
  return async (currentContent) => {
    const data = parseAdminJson(currentContent, filePath);
    const newData = await mutateFn(data);
    if (typeof newData !== 'object' || newData === null)
      throw new Error(`adminJsonFile: mutateFn должна вернуть объект`);
    if (zodSchema) {
      const result = zodSchema.safeParse(newData);
      if (!result.success) {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`adminJsonFile: валидация "${filePath}" провалена: ${issues}`);
      }
    }
    return { newContent: JSON.stringify(newData, null, 2) + '\n', commitMessage };
  };
}

module.exports = { parseAdminJson, buildJsonMutateFn };