import { z } from 'zod';

export const GMAIL_EMAIL_REGEX = /^[a-z0-9._%+-]+@gmail\.com$/i;
export const GMAIL_EMAIL_MESSAGE = 'Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com';

/**
 * Validateur de numéro de téléphone sénégalais
 * Formats acceptés:
 * - +221771234567
 * - 221771234567
 * - 771234567
 * - +221 77 123 45 67
 * - 77 123 45 67
 * 
 * Préfixes valides: 70, 71, 76, 77, 78 (et autres opérateurs sénégalais)
 */
export const validateSenegalPhoneNumber = (value: string): boolean => {
  // Supprimer tous les espaces
  const cleaned = value.replace(/\s/g, '');
  
  // Regex pour numéro sénégalais
  // +221 + 9 chiffres (70, 71, 76, 77, 78 + 7 chiffres)
  const senegalPhoneRegex = /^(\+221|221)?(70|71|76|77|78|75|33)\d{7}$/;
  
  return senegalPhoneRegex.test(cleaned);
};

/**
 * Nettoie et formate un numéro de téléphone sénégalais
 */
export const formatSenegalPhoneNumber = (value: string): string => {
  // Supprimer tous les espaces et caractères non numériques (sauf +)
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Si ça commence par +, garder le format +221
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Si ça commence par 221, ajouter +
  if (cleaned.startsWith('221')) {
    return '+' + cleaned;
  }
  
  // Si ça commence par un préfixe valide (70, 71, 76, 77, 78)
  if (/^(70|71|76|77|78|75|33)/.test(cleaned)) {
    return '+221' + cleaned;
  }
  
  return value;
};

/**
 * Valide une adresse email Gmail uniquement
 */
export const validateGmailEmail = (value: string): boolean => {
  if (!value) return false;
  return GMAIL_EMAIL_REGEX.test(value.trim());
};

/**
 * Schéma de validation pour le téléphone sénégalais
 */
export const senegalPhoneSchema = z.string().refine(validateSenegalPhoneNumber, {
  message: 'Numéro de téléphone invalide. Utilisez un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
});

/**
 * Schéma de validation pour l'email
 */
export const emailSchema = z
  .string()
  .trim()
  .regex(GMAIL_EMAIL_REGEX, GMAIL_EMAIL_MESSAGE)
  .transform((value) => value.toLowerCase());

/**
 * Schéma de validation pour le numéro d'ordre/matricule (médecin)
 * Format: LETTRES + CHIFFRES (ex: OD/2024/001, 12345)
 */
export const numeroOrdreSchema = z.string()
  .min(1, 'Le numéro d\'ordre est requis')
  .regex(/^[A-Za-z0-9\/\-]+$/, 'Le numéro d\'ordre ne doit contenir que des lettres, chiffres, tirets et slash');

/**
 * Schéma de validation pour le mot de passe
 */
export const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');

/**
 * Schéma commun pour la création d'un utilisateur
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  telephone: senegalPhoneSchema,
  adresse: z.string().optional(),
});

/**
 * Schéma pour la création d'un médecin
 */
export const createMedecinSchema = createUserSchema.extend({
  specialite: z.string().min(2, 'La spécialite est requise'),
  numeroOrdre: numeroOrdreSchema.optional(),
  tarif_consultation: z.number().min(0).optional(),
  experience: z.number().min(0).optional(),
});

/**
 * Schéma pour la création d'un secrétaire
 */
export const createSecretaireSchema = createUserSchema.extend({
  medecinId: z.number().optional(),
});

/**
 * Schéma pour la création d'un patient
 */
export const createPatientSchema = createUserSchema.extend({
  date_naissance: z.string().optional(),
  groupe_sanguin: z.string().optional(),
  diabete: z.boolean().optional(),
  hypertension: z.boolean().optional(),
  hepatite: z.boolean().optional(),
  autres_pathologies: z.string().optional(),
});

/**
 * Schéma pour la mise à jour d'un médecin
 */
export const updateMedecinSchema = z.object({
  specialite: z.string().min(2).optional(),
  telephone: senegalPhoneSchema.optional(),
  adresse: z.string().optional(),
  tarif_consultation: z.number().min(0).optional(),
  numeroOrdre: numeroOrdreSchema.optional(),
  experience: z.number().min(0).optional(),
  biographie: z.string().optional(),
});

/**
 * Schéma pour la mise à jour d'un secrétaire
 */
export const updateSecretaireSchema = z.object({
  telephone: senegalPhoneSchema.optional(),
  medecinId: z.number().optional(),
});

/**
 * Schéma pour la mise à jour d'un patient
 */
export const updatePatientSchema = z.object({
  telephone: senegalPhoneSchema.optional(),
  date_naissance: z.string().optional(),
  adresse: z.string().optional(),
  groupe_sanguin: z.string().optional(),
  diabete: z.boolean().optional(),
  hypertension: z.boolean().optional(),
  hepatite: z.boolean().optional(),
  autres_pathologies: z.string().optional(),
});

/**
 * Type pour les résultats de validation
 */
export interface ValidationResult {
  success: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  data?: any;
}

/**
 * Valide les données et retourne un résultat structuré
 * Cette fonction est utilisée pour afficher les erreurs un champ à la fois
 */
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }
  
  // Trier les erreurs par ordre de priorité: téléphone, email, matricule, puis autres
  const priorityFields = ['telephone', 'email', 'numeroOrdre', 'numero_ordre', 'password'];
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  })).sort((a, b) => {
    const aIndex = priorityFields.indexOf(a.field);
    const bIndex = priorityFields.indexOf(b.field);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });
  
  return {
    success: false,
    errors
  };
};

/**
 * Formate un message d'erreur de validation pour l'utilisateur
 * Retourne uniquement le premier champ invalide pour permettre
 * une correction champ par champ
 */
export const getFirstValidationError = (errors: Array<{ field: string; message: string }>): string => {
  if (errors.length === 0) return '';
  
  const error = errors[0];
  
  // Personnaliser les messages en français
  const fieldLabels: Record<string, string> = {
    'telephone': 'téléphone',
    'email': 'email',
    'numeroOrdre': 'numéro d\'ordre',
    'numero_ordre': 'numéro d\'ordre',
    'password': 'mot de passe',
    'nom': 'nom',
    'prenom': 'prénom',
    'specialite': 'spécialité',
  };
  
  const fieldLabel = fieldLabels[error.field] || error.field;
  
  return `${fieldLabel}: ${error.message}`;
};
