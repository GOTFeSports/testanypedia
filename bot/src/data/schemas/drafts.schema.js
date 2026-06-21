'use strict';
const { z } = require('zod');

const DraftStatus = z.enum(['pending', 'approved', 'rejected', 'needs_changes']);

const DraftSchema = z.object({
  id:            z.string().min(1),
  status:        DraftStatus,
  submittedAt:   z.string().datetime(),
  submittedBy:   z.number().int().positive(),
  organizerName: z.string().min(1),
  payload: z.object({
    title:            z.string().min(1),
    start:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    prize:            z.string().default(''),
    limit:            z.string().default(''),
    location:         z.string().default('СНГ'),
    format:           z.string().default(''),
    gameFormat:       z.string().default(''),
    organizer:        z.string().min(1),
    description:      z.string().default(''),
    telegramLink:     z.string().url().or(z.literal('')).default(''),
    registrationLink: z.string().url().or(z.literal('')).default(''),
  }),
  moderatorComment: z.string().nullable().optional(),
  resolvedAt:       z.string().datetime().nullable().optional(),
  resolvedBy:       z.number().int().positive().nullable().optional(),
});

const DraftsFileSchema = z.object({
  schema: z.literal('drafts.v1'),
  drafts: z.array(DraftSchema),
});

const EMPTY_DRAFTS = { schema: 'drafts.v1', drafts: [] };
module.exports = { DraftSchema, DraftsFileSchema, DraftStatus, EMPTY_DRAFTS };