import { z } from 'zod';

export const ChatThreadIdParamSchema = z.object({
  threadId: z.coerce.number().int().positive(),
});

export const ChatDirectUserParamSchema = z.object({
  otherUserId: z.coerce.number().int().positive(),
});

export const ChatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  beforeMessageId: z.coerce.number().int().positive().optional(),
});

export const ChatSendMessageSchema = z
  .object({
    content: z.string().trim().min(1, 'Le message est requis').max(2000, 'Message trop long'),
  })
  .passthrough();
