import { z } from 'zod';

export const CreateOrdonnanceSchema = z
  .object({
    consultationId: z.coerce.number().int().positive(),
    patientId: z.coerce.number().int().positive().optional(),
    medecinId: z.coerce.number().int().positive().optional(),
    contenu: z.string().min(1),
    medicaments: z
      .array(
        z.object({
          medicamentId: z.coerce.number().int().positive(),
          posologie: z.string().min(1),
          duree: z.string().min(1),
          quantite: z.coerce.number().int().positive().optional(),
        })
      )
      .optional(),
  })
  .passthrough();

export const UpdateOrdonnanceSchema = z
  .object({
    contenu: z.string().optional(),
  })
  .passthrough();
