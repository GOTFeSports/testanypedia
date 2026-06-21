'use strict';
const { z } = require('zod');

const UserRole = z.enum(['admin', 'organizer', 'captain']);

const PermissionSchema = z.object({
  telegramUserId:      z.number().int().positive(),
  role:                UserRole,
  organizerId:         z.string().nullable().optional(),
  teamId:              z.string().nullable().optional(),
  verifiedAt:          z.string().datetime(),
  verifiedByTelegramId:z.number().int().positive(),
});

const PermissionsFileSchema = z.object({
  schema:      z.literal('permissions.v1'),
  permissions: z.array(PermissionSchema),
});

const EMPTY_PERMISSIONS = { schema: 'permissions.v1', permissions: [] };
module.exports = { PermissionSchema, PermissionsFileSchema, UserRole, EMPTY_PERMISSIONS };