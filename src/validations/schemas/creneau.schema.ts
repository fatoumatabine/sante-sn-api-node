import { z } from 'zod';

export const CreateCreneauSchema = z.object({
  medecinId: z.coerce.number().int().positive(),
  jour: z.coerce.number().int().min(0).max(6),
  heure: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  actif: z.boolean().optional(),
});

export const CreateMultipleCreneauxSchema = z.object({
  medecinId: z.coerce.number().int().positive(),
  creneaux: z
    .array(
      z.object({
        jour: z.coerce.number().int().min(0).max(6),
        heure: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        actif: z.boolean().optional(),
      })
    )
    .min(1),
});

export const UpdateCreneauSchema = z
  .object({
    jour: z.coerce.number().int().min(0).max(6).optional(),
    heure: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    actif: z.boolean().optional(),
  })
  .passthrough();
