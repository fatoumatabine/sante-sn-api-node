import { z } from 'zod';

export const CreateConsultationSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
    medecinId: z.coerce.number().int().positive(),
    date: z.union([z.string(), z.date()]),
    heure: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    type: z.string().min(1),
    rendezVousId: z.coerce.number().int().positive().optional(),
  })
  .passthrough();

export const UpdateConsultationSchema = z
  .object({
    date: z.union([z.string(), z.date()]).optional(),
    heure: z.string().optional(),
    type: z.string().optional(),
    statut: z.string().optional(),
    constantes: z.any().optional(),
    diagnostic: z.string().optional(),
    observations: z.string().optional(),
  })
  .passthrough();
