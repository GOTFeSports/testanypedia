'use strict';
const { z } = require('zod');

const SubscriptionSchema = z.object({
  telegramUserId: z.number().int().positive(),
  teamId:         z.string().min(1),
  subscribedAt:   z.string().datetime(),
});

const SubscriptionsFileSchema = z.object({
  schema:        z.literal('subscriptions.v1'),
  subscriptions: z.array(SubscriptionSchema),
});

const EMPTY_SUBSCRIPTIONS = { schema: 'subscriptions.v1', subscriptions: [] };
module.exports = { SubscriptionSchema, SubscriptionsFileSchema, EMPTY_SUBSCRIPTIONS };