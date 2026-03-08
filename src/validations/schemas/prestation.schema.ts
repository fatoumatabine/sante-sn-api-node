import { z } from 'zod';

export const CreatePrestationSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
    consultationId: z.coerce.number().int().positive().optional(),
    type: z.string().min(1),
    resultat: z.string().optional(),
    date_realisation: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();

export const UpdatePrestationSchema = z
  .object({
    type: z.string().optional(),
    statut: z.string().optional(),
    resultat: z.string().optional(),
    date_realisation: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();
