'use strict';

const PQueue = require('p-queue').default;
const { getFile, createOrUpdateFile } = require('./client');
const log = require('../logger');

const MAX_RETRIES = 3;
const queues = new Map();

function getQueue(filePath) {
  if (!queues.has(filePath)) queues.set(filePath, new PQueue({ concurrency: 1 }));
  return queues.get(filePath);
}

async function safeCommitCycle(filePath, mutateFn) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    log.debug({ filePath, attempt }, 'commitCycle: попытка');

    const existing = await getFile(filePath);
    const currentContent = existing ? existing.content : null;
    const currentSha     = existing ? existing.sha     : null;

    let newContent, commitMessage;
    try {
      const r = await mutateFn(currentContent);
      newContent    = r.newContent;
      commitMessage = r.commitMessage;
    } catch (mutateErr) {
      log.error({ filePath, err: mutateErr.message }, 'commitCycle: ошибка mutateFn');
      throw mutateErr;
    }

    try {
      const result = await createOrUpdateFile({ path: filePath, content: newContent, message: commitMessage, sha: currentSha });
      log.info({ filePath, attempt, commitSha: result.commitSha }, 'commitCycle: успех');
      return result;
    } catch (writeErr) {
      if (writeErr.status === 409 && attempt < MAX_RETRIES) {
        log.warn({ filePath, attempt }, 'commitCycle: конфликт SHA, повтор');
        continue;
      }
      log.error({ filePath, attempt, status: writeErr.status }, 'commitCycle: ошибка записи');
      throw writeErr;
    }
  }
  throw new Error(`commitQueue: не удалось закоммитить "${filePath}" после ${MAX_RETRIES} попыток`);
}

function enqueueCommit(filePath, mutateFn) {
  return getQueue(filePath).add(() => safeCommitCycle(filePath, mutateFn));
}

function getQueueStats() {
  const stats = {};
  for (const [path, q] of queues.entries()) stats[path] = { pending: q.pending, size: q.size };
  return stats;
}

module.exports = { enqueueCommit, getQueueStats };