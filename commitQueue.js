'use strict';

const PQueue = require('p-queue').default;
const { getFile, createOrUpdateFile } = require('./client');
const log = require('../logger');

const MAX_RETRIES = 3;

/**
 * Отдельная очередь (concurrency: 1) на каждый путь файла в репо.
 * Это первый уровень защиты от SHA-конфликтов: все операции записи
 * в один файл гарантированно идут последовательно внутри процесса бота.
 *
 * Map<filePath: string, PQueue>
 */
const queues = new Map();

function getQueue(filePath) {
  if (!queues.has(filePath)) {
    queues.set(filePath, new PQueue({ concurrency: 1 }));
  }
  return queues.get(filePath);
}

/**
 * Безопасный цикл read → mutate → validate → write с retry-on-409.
 *
 * @param {string}   filePath
 * @param {Function} mutateFn  — (currentContent: string|null) => { newContent: string, commitMessage: string }
 *                               Получает текущее содержимое файла в utf-8 (null если файл ещё не существует).
 *                               Должна быть чистой функцией: не делать сетевых запросов, не иметь побочных
 *                               эффектов — её могут вызвать несколько раз при retry.
 * @returns {Promise<{ commitSha: string, fileSha: string }>}
 */
async function safeCommitCycle(filePath, mutateFn) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    log.debug({ filePath, attempt }, 'commitCycle: начало попытки');

    // 1. Читаем текущее состояние файла
    const existing = await getFile(filePath);
    const currentContent = existing ? existing.content : null;
    const currentSha     = existing ? existing.sha     : null;

    // 2. Применяем мутацию (функция строит новый контент + сообщение коммита)
    let newContent, commitMessage;
    try {
      const result = await mutateFn(currentContent);
      newContent    = result.newContent;
      commitMessage = result.commitMessage;
    } catch (mutateErr) {
      // mutateFn явно кинула ошибку (например, валидация не прошла) — это не 409, не ретраим
      log.error({ filePath, err: mutateErr.message }, 'commitCycle: mutateFn кинула ошибку, ретрай не нужен');
      throw mutateErr;
    }

    // 3. Записываем
    try {
      const result = await createOrUpdateFile({
        path:    filePath,
        content: newContent,
        message: commitMessage,
        sha:     currentSha,
      });

      log.info({ filePath, attempt, commitSha: result.commitSha }, 'commitCycle: коммит успешен');
      return result;

    } catch (writeErr) {
      if (writeErr.status === 409 && attempt < MAX_RETRIES) {
        // SHA устарел — кто-то закоммитил между нашим GET и PUT.
        // Повторяем весь цикл заново на свежих данных.
        log.warn({ filePath, attempt }, 'commitCycle: конфликт SHA (409), повторяем цикл');
        continue;
      }

      // Либо исчерпали попытки, либо другая ошибка — пробрасываем наверх
      log.error({ filePath, attempt, status: writeErr.status, err: writeErr.message }, 'commitCycle: финальная ошибка записи');
      throw writeErr;
    }
  }

  // Сюда дойдём только если все MAX_RETRIES попытки дали 409
  throw new Error(`commitQueue: не удалось закоммитить "${filePath}" после ${MAX_RETRIES} попыток (постоянный конфликт SHA)`);
}

/**
 * Поставить операцию записи в очередь для указанного файла.
 * Операции для разных файлов выполняются параллельно.
 * Операции для одного файла — строго последовательно.
 *
 * @param {string}   filePath
 * @param {Function} mutateFn — см. safeCommitCycle
 * @returns {Promise<{ commitSha: string, fileSha: string }>}
 */
function enqueueCommit(filePath, mutateFn) {
  const queue = getQueue(filePath);
  return queue.add(() => safeCommitCycle(filePath, mutateFn));
}

/**
 * Диагностика: текущее состояние очередей (для /status команды бота).
 */
function getQueueStats() {
  const stats = {};
  for (const [path, queue] of queues.entries()) {
    stats[path] = { pending: queue.pending, size: queue.size };
  }
  return stats;
}

module.exports = { enqueueCommit, getQueueStats };
