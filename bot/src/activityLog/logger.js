'use strict';

const { randomUUID } = require('crypto');
const { enqueueCommit } = require('../github/commitQueue');
const { buildJsonMutateFn } = require('../data/adminJsonFile');
const { ActivityLogFileSchema } = require('../data/schemas/activityLog.schema');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

async function logAction({ actorTelegramId, actorRole, action, targetType, targetId, details }) {
  const entry = {
    id:              randomUUID(),
    timestamp:       new Date().toISOString(),
    actorTelegramId,
    actorRole,
    action,
    targetType,
    targetId:        String(targetId),
    details:         details || {},
  };

  const mutateFn = buildJsonMutateFn(
    REPO_PATHS.ADMIN.ACTIVITY_LOG,
    (data) => { data.entries.push(entry); return data; },
    `log: ${action} → ${targetType}/${targetId} (by ${actorTelegramId})`,
    ActivityLogFileSchema,
  );

  try {
    await enqueueCommit(REPO_PATHS.ADMIN.ACTIVITY_LOG, mutateFn);
    log.debug({ action, targetType, targetId }, 'activityLog: записано');
  } catch (err) {
    log.error({ action, err: err.message }, 'activityLog: ОШИБКА записи');
    throw err;
  }
}

module.exports = { logAction };