import { z } from 'zod';

const PaiementMethodeSchema = z.enum([
  'especes',
  'carte_bancaire',
  'mobile_money',
  'virement',
  'wave',
  'orange_money',
]);

export const CreatePaiementSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
    rendezVousId: z.coerce.number().int().positive(),
    montant: z.coerce.number().positive(),
    methode: PaiementMethodeSchema,
  })
  .passthrough();

export const InitiatePaiementSchema = z.object({
  rendezVousId: z.coerce.number().int().positive(),
  methode: PaiementMethodeSchema,
});

export const PayPaiementSchema = z.object({
  confirmationCode: z
    .string()
    .regex(/^\d{6}$/, 'Code de confirmation invalide (6 chiffres requis)')
    .optional(),
});

export const UpdatePaiementSchema = z
  .object({
    montant: z.coerce.number().positive().optional(),
    methode: PaiementMethodeSchema.optional(),
    transactionId: z.string().optional(),
  })
  .passthrough();
