import { z } from 'zod';
import { AvatarUrlSchema, GmailEmailSchema } from './common.schema';

export const UpdatePatientProfileSchema = z
  .object({
    prenom: z.string().optional(),
    nom: z.string().optional(),
    telephone: z.string().optional(),
    email: GmailEmailSchema.optional(),
    avatarUrl: AvatarUrlSchema.nullish(),
  })
  .passthrough();

const TriageResponseValueSchema = z.union([
  z.string().trim().min(1, 'Réponse invalide'),
  z.array(z.string().trim().min(1, 'Réponse invalide')).min(1, 'Réponse invalide'),
]);

export const RunTriageEvaluationSchema = z.object({
  responses: z
    .record(TriageResponseValueSchema)
    .refine((value) => Object.keys(value).length > 0, 'Au moins une réponse est requise'),
  contexteLibre: z.string().trim().max(2000).optional(),
});

export const CreateTriageEvaluationSchema = RunTriageEvaluationSchema;

export const TriageHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
