import { z } from 'zod';

export const PositiveIntSchema = z.coerce.number().int().positive();

export const AnyObjectSchema = z.object({}).passthrough();

export const GmailEmailMessage = 'Email invalide. Utilisez uniquement le format votrenom@gmail.com';

export const GmailEmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/i;

export const GmailEmailSchema = z
  .string()
  .trim()
  .regex(GmailEmailRegex, GmailEmailMessage)
  .transform((value) => value.toLowerCase());

const AvatarDataUrlRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

export const AvatarUrlSchema = z
  .string()
  .trim()
  .max(2_000_000, 'Image trop volumineuse')
  .refine((value) => {
    if (AvatarDataUrlRegex.test(value)) {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Photo invalide. Utilisez une URL HTTP(S) ou importez une image PNG, JPG, WEBP ou GIF.');

export const IdParamSchema = z.object({
  id: PositiveIntSchema,
});

export const PatientIdParamSchema = z.object({
  patientId: PositiveIntSchema,
});

export const MedecinIdParamSchema = z.object({
  medecinId: PositiveIntSchema,
});

export const ConsultationIdParamSchema = z.object({
  consultationId: PositiveIntSchema,
});

export const RendezVousIdParamSchema = z.object({
  rendezVousId: PositiveIntSchema,
});

export const SpecialiteParamSchema = z.object({
  specialite: z.string().min(1, 'Spécialité requise'),
});

export const MedecinJourParamSchema = z.object({
  medecinId: PositiveIntSchema,
  jour: z.coerce.number().int().min(0).max(6),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const ReasonBodySchema = z
  .object({
    raison: z.string().trim().min(1).max(500).optional(),
    raison_refus: z.string().trim().min(1).max(500).optional(),
  })
  .passthrough();
