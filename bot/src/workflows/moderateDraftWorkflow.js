'use strict';

async function moderateDraftWorkflow({ draftId, action }) {
  throw new Error(`moderateDraftWorkflow не реализован (Этап 5). action="${action}", draftId="${draftId}"`);
}

module.exports = { moderateDraftWorkflow };