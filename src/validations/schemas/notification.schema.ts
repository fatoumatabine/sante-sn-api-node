import { z } from 'zod';

export const CreateNotificationSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    titre: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();
