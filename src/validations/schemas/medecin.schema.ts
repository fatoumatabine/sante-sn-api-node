import { z } from 'zod';
import { AvatarUrlSchema, GmailEmailSchema, PaginationQuerySchema } from './common.schema';

export const CreateMedecinSchema = z.object({
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  specialite: z.string().min(2, 'La spécialite est requise'),
  telephone: z.string().min(8, 'Le numéro de téléphone est requis'),
  adresse: z.string().optional(),
  tarif_consultation: z.number().optional(),
});

export const UpdateMedecinSchema = CreateMedecinSchema.partial().extend({
  email: GmailEmailSchema.optional(),
  avatarUrl: AvatarUrlSchema.nullish(),
});

export const MedecinQuerySchema = z.object({
  specialite: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const MedecinListQuerySchema = PaginationQuerySchema.extend({
  specialite: z.string().optional(),
});

export type CreateMedecinDto = z.infer<typeof CreateMedecinSchema>;
export type UpdateMedecinDto = z.infer<typeof UpdateMedecinSchema>;
