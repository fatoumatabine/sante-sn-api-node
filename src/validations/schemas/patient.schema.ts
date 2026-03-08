import { z } from 'zod';
import { GmailEmailSchema } from './common.schema';

export const UpdatePatientProfileSchema = z
  .object({
    prenom: z.string().optional(),
    nom: z.string().optional(),
    telephone: z.string().optional(),
    email: GmailEmailSchema.optional(),
  })
  .passthrough();

export const CreateTriageEvaluationSchema = z.object({
  responses: z.record(z.union([z.string(), z.array(z.string())])),
  niveau: z.enum(['faible', 'modere', 'eleve']),
  urgent: z.boolean().optional(),
  specialiteConseillee: z.string().optional(),
  recommandations: z.array(z.string()).min(1, 'Recommandations invalides'),
});

export const TriageHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
