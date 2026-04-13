import { z } from 'zod';
import { AvatarUrlSchema, GmailEmailSchema } from './common.schema';

export const RegisterSchema = z.object({
  email: GmailEmailSchema,
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.literal('patient').default('patient'),
});

export const LoginSchema = z.object({
  email: GmailEmailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const ForgotPasswordSchema = z.object({
  email: GmailEmailSchema,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

export const UpdateMeSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    email: GmailEmailSchema.optional(),
    avatarUrl: AvatarUrlSchema.nullish(),
  })
  .passthrough();

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

// Patient registration with additional fields
const AntecedentInputSchema = z.object({
  type: z.enum(['medical', 'chirurgical', 'familial', 'allergie']),
  description: z.string().trim().min(1, "La description de l'antécédent est requise"),
  date: z.string().trim().optional(),
  traitement: z.string().trim().optional(),
});

export const RegisterPatientSchema = RegisterSchema.extend({
  role: z.literal('patient'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  telephone: z.string().min(8, 'Le numéro de téléphone est requis'),
  date_naissance: z.union([z.string(), z.date()]).optional(),
  adresse: z.string().trim().min(1).optional(),
  groupe_sanguin: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  diabete: z.boolean().optional(),
  hypertension: z.boolean().optional(),
  hepatite: z.boolean().optional(),
  autres_pathologies: z.string().trim().min(1).optional(),
  allergies: z.array(z.string().trim().min(1)).optional(),
  antecedents: z.array(AntecedentInputSchema).optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type RegisterPatientDto = z.infer<typeof RegisterPatientSchema>;
