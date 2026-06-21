'use strict';
const { z } = require('zod');

const BotStateSchema = z.object({
  schema:         z.literal('bot-state.v1'),
  announceChatId: z.number().int().nullable().optional(),
  featureFlags:   z.object({
    moderationEnabled:    z.boolean().default(false),
    liveMatchesEnabled:   z.boolean().default(false),
    notificationsEnabled: z.boolean().default(false),
    captainRosterEditing: z.boolean().default(false),
  }).default({}),
  lastNotifiedHashes: z.record(z.string()).default({}),
});

const EMPTY_BOT_STATE = {
  schema: 'bot-state.v1',
  announceChatId: null,
  featureFlags: { moderationEnabled: false, liveMatchesEnabled: false, notificationsEnabled: false, captainRosterEditing: false },
  lastNotifiedHashes: {},
};
module.exports = { BotStateSchema, EMPTY_BOT_STATE };