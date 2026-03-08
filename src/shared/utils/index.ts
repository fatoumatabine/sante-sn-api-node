/**
 * Module d'index pour les utilitaires de validation
 * Export centralisé de tous les validateurs
 */

// Export des schémas Zod
export * from './zod-schemas';

// Export du service de validation avec vérification base de données
export { ValidationService } from './validation.service';

// Export des utilitaires de base (email, téléphone, etc.)
export { 
  validateSenegalPhoneNumber, 
  formatSenegalPhoneNumber,
  validateData,
  getFirstValidationError,
  createUserSchema,
  createMedecinSchema,
  createSecretaireSchema,
  createPatientSchema,
  updateMedecinSchema,
  updateSecretaireSchema,
  updatePatientSchema,
  ValidationResult
} from './validation';
