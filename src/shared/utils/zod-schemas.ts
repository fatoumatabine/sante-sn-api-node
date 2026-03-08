import { z } from 'zod';

/**
 * Schémas de validation Zod pour l'application Sante SN
 * Tous les schémas utilisent les formats sénégalais
 */

// ==================== VALIDATEURS PERSONNALISÉS ====================

// Validateur pour le numéro de téléphone sénégalais
const senegalPhoneRegex = /^(\+221|221)?(70|71|76|77|78|75|33)\d{7}$/;
const gmailEmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/i;
const gmailEmailMessage = 'Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com';

export const senegalPhoneValidator = z.string().refine(
  (value) => {
    if (!value) return false;
    const cleaned = value.replace(/\s/g, '');
    return senegalPhoneRegex.test(cleaned);
  },
  {
    message: 'Le numéro de téléphone doit être un numéro sénégalais valide (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
  }
);

// Validateur pour l'email
export const emailValidator = z
  .string()
  .trim()
  .regex(gmailEmailRegex, gmailEmailMessage)
  .transform((value) => value.toLowerCase());

// Validateur pour le mot de passe sécurisé
export const passwordValidator = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');

// Validateur pour le numéro d'ordre (médecin)
export const numeroOrdreValidator = z.string()
  .min(1, 'Le numéro d\'ordre est requis')
  .regex(/^[A-Za-z0-9\/\-]+$/, 'Le numéro d\'ordre ne doit contenir que des lettres, chiffres, tirets et slash');

// ==================== SCHÉMAS DE BASE ====================

// Schéma commun pour les noms
export const nomSchema = z.string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(100, 'Le nom ne peut pas dépasser 100 caractères');

// Schéma commun pour les prénoms
export const prenomSchema = z.string()
  .min(2, 'Le prénom doit contenir au moins 2 caractères')
  .max(100, 'Le prénom ne peut pas dépasser 100 caractères');

// Schéma pour l'adresse
export const adresseSchema = z.string()
  .max(255, 'L\'adresse ne peut pas dépasser 255 caractères')
  .optional();

// ==================== SCHÉMAS POUR UTILISATEURS ====================

// Schéma pour la création d'un utilisateur de base
export const createUserSchema = z.object({
  email: emailValidator,
  password: passwordValidator,
  nom: nomSchema,
  prenom: prenomSchema,
  telephone: senegalPhoneValidator,
  adresse: adresseSchema,
});

// Schéma pour la mise à jour d'un utilisateur de base
export const updateUserSchema = z.object({
  nom: nomSchema.optional(),
  prenom: prenomSchema.optional(),
  telephone: senegalPhoneValidator.optional(),
  adresse: adresseSchema.optional(),
});

// ==================== SCHÉMAS POUR MÉDECIN ====================

// Schéma pour la création d'un médecin
export const createMedecinSchema = createUserSchema.extend({
  specialite: z.string()
    .min(2, 'La spécialite est requise')
    .max(100, 'La spécialite ne peut pas dépasser 100 caractères'),
  numeroOrdre: numeroOrdreValidator.optional(),
  tarif_consultation: z.number()
    .min(0, 'Le tarif de consultation ne peut pas être négatif')
    .optional(),
  experience: z.number()
    .min(0, 'L\'expérience ne peut pas être négative')
    .max(50, 'L\'expérience ne peut pas dépasser 50 ans')
    .optional(),
  biographie: z.string()
    .max(1000, 'La biographie ne peut pas dépasser 1000 caractères')
    .optional(),
});

// Schéma pour la mise à jour d'un médecin
export const updateMedecinSchema = updateUserSchema.extend({
  specialite: z.string()
    .min(2, 'La spécialite est requise')
    .max(100, 'La spécialite ne peut pas dépasser 100 caractères')
    .optional(),
  numeroOrdre: numeroOrdreValidator.optional(),
  tarif_consultation: z.number()
    .min(0, 'Le tarif de consultation ne peut pas être négatif')
    .optional(),
  experience: z.number()
    .min(0, 'L\'expérience ne peut pas être négative')
    .max(50, 'L\'expérience ne peut pas dépasser 50 ans')
    .optional(),
  biographie: z.string()
    .max(1000, 'La biographie ne peut pas dépasser 1000 caractères')
    .optional(),
});

// ==================== SCHÉMAS POUR SECRÉTAIRE ====================

// Schéma pour la création d'un secrétaire
export const createSecretaireSchema = createUserSchema.extend({
  medecinId: z.number()
    .int('L\'ID du médecin doit être un entier')
    .positive('L\'ID du médecin doit être positif')
    .optional(),
});

// Schéma pour la mise à jour d'un secrétaire
export const updateSecretaireSchema = z.object({
  telephone: senegalPhoneValidator.optional(),
  medecinId: z.number()
    .int('L\'ID du médecin doit être un entier')
    .positive('L\'ID du médecin doit être positif')
    .nullable()
    .optional(),
});

// ==================== SCHÉMAS POUR PATIENT ====================

// Schéma pour le groupe sanguin
const groupeSanguinSchema = z.enum([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
]).optional();

// Schéma pour la création d'un patient
export const createPatientSchema = createUserSchema.extend({
  date_naissance: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date de naissance doit être au format YYYY-MM-DD')
    .optional(),
  groupe_sanguin: groupeSanguinSchema,
  diabete: z.boolean().optional(),
  hypertension: z.boolean().optional(),
  hepatite: z.boolean().optional(),
  autres_pathologies: z.string()
    .max(500, 'Les autres pathologies ne peuvent pas dépasser 500 caractères')
    .optional(),
});

// Schéma pour la mise à jour d'un patient
export const updatePatientSchema = z.object({
  telephone: senegalPhoneValidator.optional(),
  date_naissance: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date de naissance doit être au format YYYY-MM-DD')
    .optional(),
  adresse: adresseSchema.optional(),
  groupe_sanguin: groupeSanguinSchema,
  diabete: z.boolean().optional(),
  hypertension: z.boolean().optional(),
  hepatite: z.boolean().optional(),
  autres_pathologies: z.string()
    .max(500, 'Les autres pathologies ne peuvent pas dépasser 500 caractères')
    .optional(),
});

// ==================== SCHÉMAS POUR AUTHENTIFICATION ====================

// Schéma pour la connexion
export const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, 'Le mot de passe est requis'),
});

// Schéma pour l'enregistrement
export const registerSchema = createUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// ==================== SCHÉMAS POUR RENDEZ-VOUS ====================

// Schéma pour la création d'un rendez-vous
export const createRendezVousSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format YYYY-MM-DD')
    .refine((date) => {
      const d = new Date(date);
      return d > new Date();
    }, 'La date doit être dans le futur'),
  heure: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'L\'heure doit être au format HH:MM'),
  patientId: z.number()
    .int('L\'ID du patient doit être un entier')
    .positive('L\'ID du patient doit être positif'),
  medecinId: z.number()
    .int('L\'ID du médecin doit être un entier')
    .positive('L\'ID du médecin doit être positif'),
  type: z.enum(['en_ligne', 'presentiel', 'prestation']),
  motif: z.string()
    .max(500, 'Le motif ne peut pas dépasser 500 caractères')
    .optional(),
  prestation_type: z.string().optional(),
});

// ==================== SCHÉMAS POUR CONSULTATION ====================

// Schéma pour la création d'une consultation
export const createConsultationSchema = z.object({
  patientId: z.number()
    .int('L\'ID du patient doit être un entier')
    .positive('L\'ID du patient doit être positif'),
  medecinId: z.number()
    .int('L\'ID du médecin doit être un entier')
    .positive('L\'ID du médecin doit être positif'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit être au format YYYY-MM-DD'),
  heure: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'L\'heure doit être au format HH:MM'),
  type: z.string()
    .min(2, 'Le type de consultation est requis'),
  constantes: z.object({
    tension: z.string().optional(),
    temperature: z.number().optional(),
    poids: z.number().optional(),
    taille: z.number().optional(),
    frequence_cardiaque: z.number().optional(),
  }).optional(),
  diagnostic: z.string()
    .max(1000, 'Le diagnostic ne peut pas dépasser 1000 caractères')
    .optional(),
  observations: z.string()
    .max(2000, 'Les observations ne peuvent pas dépasser 2000 caractères')
    .optional(),
});

// ==================== SCHÉMAS POUR ORDONNANCE ====================

// Schéma pour un médicament sur une ordonnance
const medicamentSchema = z.object({
  medicamentId: z.number(),
  posologie: z.string()
    .min(1, 'La posologie est requise')
    .max(200, 'La posologie ne peut pas dépasser 200 caractères'),
  duree: z.string()
    .min(1, 'La durée est requise')
    .max(100, 'La durée ne peut pas dépasser 100 caractères'),
  quantite: z.number()
    .int('La quantité doit être un entier')
    .min(1, 'La quantité doit être au moins 1')
    .optional(),
});

// Schéma pour la création d'une ordonnance
export const createOrdonnanceSchema = z.object({
  consultationId: z.number()
    .int('L\'ID de la consultation doit être un entier')
    .positive('L\'ID de la consultation doit être positif'),
  patientId: z.number()
    .int('L\'ID du patient doit être un entier')
    .positive('L\'ID du patient doit être positif'),
  medecinId: z.number()
    .int('L\'ID du médecin doit être un entier')
    .positive('L\'ID du médecin doit être positif'),
  contenu: z.string()
    .min(1, 'Le contenu de l\'ordonnance est requis')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères'),
  medicaments: z.array(medicamentSchema).optional(),
});

// ==================== SCHÉMAS POUR PAIEMENT ====================

// Schéma pour la création d'un paiement
export const createPaiementSchema = z.object({
  patientId: z.number()
    .int('L\'ID du patient doit être un entier')
    .positive('L\'ID du patient doit être positif'),
  rendezVousId: z.number()
    .int('L\'ID du rendez-vous doit être un entier')
    .positive('L\'ID du rendez-vous doit être positif'),
  montant: z.number()
    .positive('Le montant doit être positif'),
  methode: z.enum(['especes', 'carte', 'mobile_money', 'virement']),
});

// ==================== TYPES INFÉRÉS ====================

// Types pour les DTO
export type CreateMedecinDto = z.infer<typeof createMedecinSchema>;
export type UpdateMedecinDto = z.infer<typeof updateMedecinSchema>;
export type CreateSecretaireDto = z.infer<typeof createSecretaireSchema>;
export type UpdateSecretaireDto = z.infer<typeof updateSecretaireSchema>;
export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type CreateRendezVousDto = z.infer<typeof createRendezVousSchema>;
export type CreateConsultationDto = z.infer<typeof createConsultationSchema>;
export type CreateOrdonnanceDto = z.infer<typeof createOrdonnanceSchema>;
export type CreatePaiementDto = z.infer<typeof createPaiementSchema>;

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Valide les données et retourne un résultat formaté
 */
export const validateWithZod = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
} => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Trier les erreurs par priorité
  const priorityFields = ['telephone', 'email', 'password', 'numeroOrdre', 'nom', 'prenom'];
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  })).sort((a, b) => {
    const aIndex = priorityFields.indexOf(a.field);
    const bIndex = priorityFields.indexOf(b.field);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });
  
  return { success: false, errors };
};

/**
 * Formate un numéro de téléphone sénégalais
 */
export const formatSenegalPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('221')) return '+' + cleaned;
  if (/^(70|71|76|77|78|75|33)/.test(cleaned)) return '+221' + cleaned;
  return phone;
};

/**
 * Nettoie et valide un numéro de téléphone
 */
export const sanitizePhoneNumber = (phone: string): string => {
  return formatSenegalPhone(phone);
};
