'use strict';
const { z } = require('zod');

const ActivityEntrySchema = z.object({
  id:              z.string().min(1),
  timestamp:       z.string().datetime(),
  actorTelegramId: z.number().int().positive(),
  actorRole:       z.string().min(1),
  action:          z.string().regex(/^[a-z_]+\.[a-z_]+$/),
  targetType:      z.string().min(1),
  targetId:        z.string().min(1),
  details:         z.record(z.unknown()).default({}),
});

const ActivityLogFileSchema = z.object({
  schema:  z.literal('activity-log.v1'),
  entries: z.array(ActivityEntrySchema),
});

const EMPTY_ACTIVITY_LOG = { schema: 'activity-log.v1', entries: [] };
module.exports = { ActivityEntrySchema, ActivityLogFileSchema, EMPTY_ACTIVITY_LOG };