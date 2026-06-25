'use strict';

const { z } = require('zod');

const DraftStatus = z.enum(['pending', 'approved', 'rejected', 'needs_changes']);

const DraftSchema = z.object({
  id:               z.string().min(1),
  status:           DraftStatus,
  submittedAt:      z.string().datetime(),
  submittedBy:      z.number().int().positive(),   // Telegram user ID
  organizerName:    z.string().min(1),
  payload: z.object({
    title:           z.string().min(1),
    start:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    prize:           z.string().optional().default(''),
    limit:           z.string().optional().default(''),
    location:        z.string().optional().default('СНГ'),
    format:          z.string().optional().default(''),
    gameFormat:      z.string().optional().default(''),
    organizer:       z.string().min(1),
    description:     z.string().optional().default(''),
    telegramLink:    z.string().url().optional().or(z.literal('')),
    registrationLink:z.string().url().optional().or(z.literal('')),
  }),
  moderatorComment: z.string().optional().nullable(),
  resolvedAt:       z.string().datetime().optional().nullable(),
  resolvedBy:       z.number().int().positive().optional().nullable(),
});

const DraftsFileSchema = z.object({
  schema:  z.literal('drafts.v1'),
  drafts:  z.array(DraftSchema),
});

const EMPTY_DRAFTS = { schema: 'drafts.v1', drafts: [] };

module.exports = { DraftSchema, DraftsFileSchema, DraftStatus, EMPTY_DRAFTS };
