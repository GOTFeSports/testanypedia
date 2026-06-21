'use strict';

const { randomUUID } = require('crypto');
const { enqueueCommit } = require('../github/commitQueue');
const { buildJsonMutateFn } = require('../data/adminJsonFile');
const { DraftsFileSchema } = require('../data/schemas/drafts.schema');
const { logAction } = require('../activityLog/logger');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

async function submitDraftWorkflow({ submittedBy, actorRole, organizerName, payload }) {
  const draftId = randomUUID();
  const now = new Date().toISOString();

  const mutateFn = buildJsonMutateFn(
    REPO_PATHS.ADMIN.DRAFTS,
    (data) => {
      data.drafts.push({
        id: draftId, status: 'pending', submittedAt: now,
        submittedBy, organizerName, payload,
        moderatorComment: null, resolvedAt: null, resolvedBy: null,
      });
      return data;
    },
    `draft: "${payload.title}" от tg:${submittedBy}`,
    DraftsFileSchema,
  );

  log.info({ submittedBy, title: payload.title, draftId }, 'submitDraftWorkflow: коммит');
  const { commitSha } = await enqueueCommit(REPO_PATHS.ADMIN.DRAFTS, mutateFn);
  log.info({ draftId, commitSha }, 'submitDraftWorkflow: сохранено');

  try {
    await logAction({
      actorTelegramId: submittedBy, actorRole,
      action: 'draft.created', targetType: 'draft', targetId: draftId,
      details: { title: payload.title, organizer: payload.organizer },
    });
  } catch (logErr) {
    log.error({ draftId, logErr: logErr.message }, 'submitDraftWorkflow: ошибка activity-log');
  }

  return { draftId, commitSha };
}

module.exports = { submitDraftWorkflow };