import { z } from 'zod';

export const CreatePaiementSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
    rendezVousId: z.coerce.number().int().positive(),
    montant: z.coerce.number().positive(),
    methode: z.string().min(1),
  })
  .passthrough();

export const InitiatePaiementSchema = z.object({
  rendezVousId: z.coerce.number().int().positive(),
  methode: z.string().min(1),
});

export const PayPaiementSchema = z.object({
  confirmationCode: z.string().regex(/^\d{6}$/, 'Code de confirmation invalide (6 chiffres requis)'),
});

export const UpdatePaiementSchema = z
  .object({
    montant: z.coerce.number().positive().optional(),
    methode: z.string().optional(),
    transactionId: z.string().optional(),
  })
  .passthrough();
