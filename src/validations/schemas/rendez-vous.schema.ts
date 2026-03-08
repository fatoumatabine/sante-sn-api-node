import { z } from 'zod';
import { ReasonBodySchema } from './common.schema';

// Helper pour convertir string en nombre
const transformToNumber = z.union([z.number(), z.string()]).transform((val) => {
  if (typeof val === 'string') {
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) return val;
    return num;
  }
  return val;
});

export const CreateRendezVousSchema = z
  .object({
    medecin_id: transformToNumber.pipe(z.number().int().positive('ID médecin invalide')),
    date: z
      .union([z.string(), z.date()])
      .transform((val) => {
        if (val instanceof Date) return val;
        return new Date(val as string);
      })
      .refine((date: Date) => !Number.isNaN(date.getTime()), {
        message: 'Date invalide',
      }),
    heure: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Format heure invalide (HH:mm requis)',
    }),
    motif: z.string().max(500).optional(),
    type: z.enum(['en_ligne', 'presentiel', 'prestation'], {
      errorMap: () => ({ message: 'Type de rendez-vous invalide' }),
    }),
    urgent_ia: z.boolean().optional(),
    specialite: z.string().optional(),
    prestation_type: z.string().optional(),
  })
  .refine(
    (data: any) => {
      if (data.type === 'prestation' && !data.prestation_type) {
        return false;
      }
      return true;
    },
    {
      message: 'Le type de prestation est requis pour un rendez-vous de type prestation',
      path: ['prestation_type'],
    }
  );

export const UpdateRendezVousSchema = z.object({
  medecin_id: transformToNumber.pipe(z.number().int().positive()).optional(),
  date: z.string().optional(),
  heure: z.string().optional(),
  motif: z.string().max(500).optional(),
  type: z.enum(['en_ligne', 'presentiel', 'prestation']).optional(),
  prestation_type: z.string().optional(),
});

export const FilterRendezVousSchema = z.object({
  statut: z.string().optional(),
  patient_id: z.string().optional(),
  medecin_id: z.string().optional(),
  date: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const CreneauxDisponiblesQuerySchema = z.object({
  medecinId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
});

export const AnnulerRendezVousBodySchema = ReasonBodySchema;

export type CreateRendezVousDto = z.infer<typeof CreateRendezVousSchema>;
export type UpdateRendezVousDto = z.infer<typeof UpdateRendezVousSchema>;
export type FilterRendezVousDto = z.infer<typeof FilterRendezVousSchema>;
