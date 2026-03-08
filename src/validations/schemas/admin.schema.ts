import { z } from 'zod';
import { GmailEmailSchema, IdParamSchema } from './common.schema';

export const AdminArchivesQuerySchema = z.object({
  type: z.enum(['all', 'medecin', 'secretaire', 'patient']).optional(),
});

export const RestoreArchiveParamsSchema = z.object({
  type: z.enum(['medecin', 'secretaire', 'patient']),
  id: z.coerce.number().int().positive(),
});

export const CreateAdminMedecinSchema = z
  .object({
    email: GmailEmailSchema,
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    name: z.string().optional(),
    nom: z.string().min(1, 'Nom requis'),
    prenom: z.string().min(1, 'Prénom requis'),
    specialite: z.string().min(1, 'Spécialité requise'),
    telephone: z.string().min(1, 'Téléphone requis'),
    adresse: z.string().optional(),
    tarif_consultation: z.coerce.number().optional(),
    numeroOrdre: z.string().optional(),
  })
  .passthrough();

export const UpdateAdminMedecinSchema = z
  .object({
    email: GmailEmailSchema.optional(),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional(),
    nom: z.string().min(1, 'Nom requis').optional(),
    prenom: z.string().min(1, 'Prénom requis').optional(),
    specialite: z.string().optional(),
    telephone: z.string().optional(),
    adresse: z.string().optional(),
    tarif_consultation: z.coerce.number().optional(),
  })
  .passthrough();

export const CreateAdminSecretaireSchema = z
  .object({
    email: GmailEmailSchema,
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    name: z.string().optional(),
    nom: z.string().min(1, 'Nom requis'),
    prenom: z.string().min(1, 'Prénom requis'),
    telephone: z.string().min(1, 'Téléphone requis'),
    medecinId: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const UpdateAdminSecretaireSchema = z
  .object({
    email: GmailEmailSchema.optional(),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional(),
    nom: z.string().min(1, 'Nom requis').optional(),
    prenom: z.string().min(1, 'Prénom requis').optional(),
    telephone: z.string().optional(),
    medecinId: z.union([z.string(), z.number(), z.null()]).optional(),
  })
  .passthrough();

export const CreateAdminPatientSchema = z
  .object({
    email: GmailEmailSchema,
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    name: z.string().optional(),
    nom: z.string().min(1, 'Nom requis'),
    prenom: z.string().min(1, 'Prénom requis'),
    telephone: z.string().min(1, 'Téléphone requis'),
    date_naissance: z.union([z.string(), z.date()]).optional(),
    adresse: z.string().optional(),
    groupe_sanguin: z.string().optional(),
  })
  .passthrough();

export const UpdateAdminPatientSchema = z
  .object({
    telephone: z.string().optional(),
    date_naissance: z.union([z.string(), z.date(), z.null()]).optional(),
    adresse: z.string().optional(),
    groupe_sanguin: z.string().optional(),
    diabete: z.boolean().optional(),
    hypertension: z.boolean().optional(),
    hepatite: z.boolean().optional(),
    autres_pathologies: z.string().optional(),
  })
  .passthrough();

export const AdminEntityIdParamSchema = IdParamSchema;
