'use strict';

const { enqueueCommit } = require('../github/commitQueue');
const { buildJsMutateFn, isTournamentIdTaken } = require('../data/jsDataFile');
const { buildJsonMutateFn } = require('../data/adminJsonFile');
const { DraftsFileSchema } = require('../data/schemas/drafts.schema');
const { logAction } = require('../activityLog/logger');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

/**
 * Генерирует id турнира из названия:
 * "RAMPAGE PULIK #4" → "rampage-pulik-4"
 * Убирает спецсимволы, заменяет пробелы на дефисы, ограничивает длину.
 */
function generateTournamentId(title, existingIds = []) {
  const base = title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

  // Если id свободен — используем как есть
  if (!existingIds.includes(base)) return base;

  // Иначе добавляем суффикс
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!existingIds.includes(candidate)) return candidate;
  }
  // Крайний случай — добавляем timestamp
  return `${base}-${Date.now()}`;
}

/**
 * Строит полный объект турнира из payload черновика.
 * Структура совместима с data.js (те же поля что у существующих турниров).
 */
function buildTournamentObject(draft, tournamentId) {
  const p = draft.payload;
  return {
    id:          tournamentId,
    title:       p.title,
    start:       p.start,
    end:         p.end,
    prize:       p.prize        || '',
    limit:       p.limit        || '',
    location:    p.location     || 'СНГ',
    format:      p.format       || '',
    gameFormat:  p.gameFormat   || '',
    organizer:   p.organizer,
    description: p.description  || '',
    links: {
      telegram:     p.telegramLink     || '',
      registration: p.registrationLink || '',
    },
    winner:       '',
    prizePool:    [],
    teamsList:    [],
    casters:      [],
    bracketEmbed: '',
  };
}

/**
 * Найти черновик по id в данных drafts.json.
 * Возвращает { draft, index } или null.
 */
function findDraft(data, draftId) {
  const index = data.drafts.findIndex(d => d.id === draftId);
  if (index === -1) return null;
  return { draft: data.drafts[index], index };
}

/**
 * APPROVE: перенести черновик в data.js и обновить его статус в drafts.json.
 *
 * Порядок операций:
 * 1. Читаем drafts.json — ищем черновик, проверяем статус
 * 2. Читаем data.js — генерируем уникальный tournamentId
 * 3. Добавляем турнир в data.js через commitQueue (с валидацией)
 * 4. Обновляем статус черновика в drafts.json через commitQueue
 * 5. Логируем в activity-log
 *
 * @returns {{ tournamentId: string, commitSha: string }}
 */
async function approveDraft({ draftId, actorTelegramId, actorRole }) {
  log.info({ draftId, actorTelegramId }, 'approveDraft: начало');

  // ── Шаг 1: читаем drafts.json через getFile напрямую (не через commitQueue —
  // мы только читаем, писать будем отдельным шагом)
  const { getFile } = require('../github/client');
  const { parseAdminJson } = require('../data/adminJsonFile');

  const draftsFile = await getFile(REPO_PATHS.ADMIN.DRAFTS);
  const draftsData = parseAdminJson(draftsFile ? draftsFile.content : null, REPO_PATHS.ADMIN.DRAFTS);

  const found = findDraft(draftsData, draftId);
  if (!found) throw new Error(`Черновик с id "${draftId}" не найден`);

  const { draft } = found;

  // Проверка допустимых переходов статуса
  if (draft.status === 'approved') throw new Error(`Черновик "${draftId}" уже одобрен`);
  if (draft.status === 'rejected') throw new Error(`Нельзя одобрить отклонённый черновик "${draftId}". Создайте новый.`);

  // ── Шаг 2: читаем data.js для генерации уникального id
  const dataFile = await getFile(REPO_PATHS.DATA_JS);
  if (!dataFile) throw new Error('data.js не найден в репозитории');

  const { parseJsDataFile } = require('../data/jsDataFile');
  const tournaments = parseJsDataFile(dataFile.content, 'tournaments');
  const existingIds = tournaments.map(t => t.id);
  const tournamentId = generateTournamentId(draft.payload.title, existingIds);

  log.info({ draftId, tournamentId }, 'approveDraft: сгенерирован tournamentId');

  // ── Шаг 3: добавляем турнир в data.js
  const newTournament = buildTournamentObject(draft, tournamentId);

  const dataMutateFn = buildJsMutateFn(
    REPO_PATHS.DATA_JS,
    (arr) => {
      if (isTournamentIdTaken(arr, tournamentId)) {
        throw new Error(`id "${tournamentId}" уже занят — конфликт при параллельном approve`);
      }
      return [...arr, newTournament];
    },
    `approve: добавлен турнир "${draft.payload.title}" (${tournamentId}) из черновика ${draftId}`,
  );

  const { commitSha: dataSha } = await enqueueCommit(REPO_PATHS.DATA_JS, dataMutateFn);
  log.info({ tournamentId, dataSha }, 'approveDraft: турнир добавлен в data.js');

  // ── Шаг 4: обновляем статус черновика в drafts.json
  const draftsMutateFn = buildJsonMutateFn(
    REPO_PATHS.ADMIN.DRAFTS,
    (data) => {
      const f = findDraft(data, draftId);
      if (!f) throw new Error(`Черновик ${draftId} исчез из drafts.json между шагами — критическая ошибка`);
      f.draft.status     = 'approved';
      f.draft.resolvedAt = new Date().toISOString();
      f.draft.resolvedBy = actorTelegramId;
      f.draft.tournamentId = tournamentId; // сохраняем ссылку на созданный турнир
      return data;
    },
    `approve: статус черновика ${draftId} → approved (турнир: ${tournamentId})`,
    DraftsFileSchema,
  );

  const { commitSha } = await enqueueCommit(REPO_PATHS.ADMIN.DRAFTS, draftsMutateFn);
  log.info({ draftId, commitSha }, 'approveDraft: статус черновика обновлён');

  // ── Шаг 5: логируем
  try {
    await logAction({
      actorTelegramId, actorRole,
      action: 'draft.approved', targetType: 'draft', targetId: draftId,
      details: { tournamentId, title: draft.payload.title, dataSha, commitSha },
    });
  } catch (logErr) {
    log.error({ draftId, logErr: logErr.message }, 'approveDraft: ошибка activity-log');
  }

  return { tournamentId, commitSha, draft };
}

/**
 * REJECT: пометить черновик как отклонённый, сохранить причину.
 * data.js не трогается.
 *
 * @returns {{ commitSha: string }}
 */
async function rejectDraft({ draftId, reason, actorTelegramId, actorRole }) {
  log.info({ draftId, actorTelegramId }, 'rejectDraft: начало');

  const mutateFn = buildJsonMutateFn(
    REPO_PATHS.ADMIN.DRAFTS,
    (data) => {
      const found = findDraft(data, draftId);
      if (!found) throw new Error(`Черновик с id "${draftId}" не найден`);

      const { draft } = found;
      if (draft.status === 'approved') throw new Error(`Нельзя отклонить уже одобренный черновик "${draftId}"`);
      if (draft.status === 'rejected') throw new Error(`Черновик "${draftId}" уже отклонён`);

      draft.status           = 'rejected';
      draft.moderatorComment = reason || null;
      draft.resolvedAt       = new Date().toISOString();
      draft.resolvedBy       = actorTelegramId;
      return data;
    },
    `reject: черновик ${draftId}${reason ? ` — ${reason.slice(0, 60)}` : ''}`,
    DraftsFileSchema,
  );

  const { commitSha } = await enqueueCommit(REPO_PATHS.ADMIN.DRAFTS, mutateFn);
  log.info({ draftId, commitSha }, 'rejectDraft: черновик отклонён');

  try {
    await logAction({
      actorTelegramId, actorRole,
      action: 'draft.rejected', targetType: 'draft', targetId: draftId,
      details: { reason: reason || null },
    });
  } catch (logErr) {
    log.error({ draftId, logErr: logErr.message }, 'rejectDraft: ошибка activity-log');
  }

  return { commitSha };
}

module.exports = { approveDraft, rejectDraft, generateTournamentId, buildTournamentObject };
