import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError, ZodIssue } from 'zod';
import { BadRequestError } from '../utils/AppError';

const gmailEmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/i;
const gmailEmailMessage = 'Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com';

/**
 * Codes d'erreur pour les validations
 */
export const ValidationErrorCodes = {
  // Erreurs générales
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  INVALID_TYPE: 'INVALID_TYPE',
  
  // Erreurs spécifiques
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_PHONE: 'DUPLICATE_PHONE',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  
  // Erreurs métier
  DATE_IN_FUTURE: 'DATE_IN_FUTURE',
  DATE_IN_PAST: 'DATE_IN_PAST',
  NEGATIVE_NUMBER: 'NEGATIVE_NUMBER',
  INVALID_ENUM: 'INVALID_ENUM',
};

/**
 * Message d'erreur en français avec code
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Formate les erreurs Zod en erreurs structurées
 */
export const formatZodErrors = (error: ZodError): ValidationError[] => {
  return error.errors.map((issue: ZodIssue) => {
    const path = issue.path.join('.');
    let code = ValidationErrorCodes.INVALID_FORMAT;
    let message = issue.message;

    // Mapper les codes d'erreur selon le type d'erreur
    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'string' && issue.received === 'undefined') {
          code = ValidationErrorCodes.REQUIRED_FIELD;
          message = `Le champ "${path}" est obligatoire`;
        } else {
          code = ValidationErrorCodes.INVALID_TYPE;
          message = `Type invalide pour le champ "${path}"`;
        }
        break;

      case 'too_small':
        if (issue.type === 'string') {
          code = ValidationErrorCodes.TOO_SHORT;
          message = issue.message || `Le champ "${path}" est trop court`;
        } else {
          code = ValidationErrorCodes.INVALID_NUMBER;
          message = issue.message || `La valeur du champ "${path}" est trop petite`;
        }
        break;

      case 'too_big':
        if (issue.type === 'string') {
          code = ValidationErrorCodes.TOO_LONG;
          message = issue.message || `Le champ "${path}" est trop long`;
        } else {
          code = ValidationErrorCodes.INVALID_NUMBER;
          message = issue.message || `La valeur du champ "${path}" est trop grande`;
        }
        break;

      case 'invalid_string':
        if (issue.validation === 'email') {
          code = ValidationErrorCodes.INVALID_EMAIL;
          message = gmailEmailMessage;
        } else if (issue.validation === 'regex') {
          // Détecter le type de champ par le chemin
          if (path.includes('telephone') || path.includes('phone')) {
            code = ValidationErrorCodes.INVALID_PHONE;
            message = 'Numéro de téléphone sénégalais invalide. Utilisez +221 avec les préfixes 70, 71, 76, 77, 78, 75 ou 33';
          } else if (path.includes('password')) {
            code = ValidationErrorCodes.INVALID_PASSWORD;
            message = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre';
          } else {
            code = ValidationErrorCodes.INVALID_FORMAT;
            message = issue.message;
          }
        } else {
          code = ValidationErrorCodes.INVALID_FORMAT;
          message = issue.message;
        }
        break;

      case 'invalid_enum_value':
        code = ValidationErrorCodes.INVALID_ENUM;
        message = `Valeur invalide pour le champ "${path}". Valeurs autorisées: ${issue.options?.join(', ')}`;
        break;

      default:
        code = ValidationErrorCodes.INVALID_FORMAT;
        message = issue.message;
    }

    return {
      field: path,
      message,
      code,
      value: issue.code === 'invalid_string' ? undefined : undefined
    };
  });
};

/**
 * Classe d'erreur de validation personnalisée
 */
export class ValidationException extends BadRequestError {
  errors: ValidationError[];
  
  constructor(errors: ValidationError[], message: string = 'Validation échouée') {
    super(message, errors);
    this.errors = errors;
    this.name = 'ValidationException';
  }
  
  /**
   * Retourne le premier erreur pour affichage simple
   */
  getFirstError(): string {
    if (this.errors.length === 0) return this.message;
    return this.errors[0].message;
  }
  
  /**
   * Retourne les erreurs groupées par champ
   */
  getErrorsByField(): Record<string, string[]> {
    return this.errors.reduce((acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error.message);
      return acc;
    }, {} as Record<string, string[]>);
  }
}

/**
 * Middleware de validation avec Zod
 * @param schema - Schéma Zod à utiliser pour la validation
 * @param source - Source des données à valider (body, params, query)
 */
export const validate = (schema: ZodSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.parse(data);
      
      // Remplacer les données validées
      req[source] = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        
        // Trier les erreurs par priorité
        const priorityFields = ['telephone', 'email', 'password', 'numero_ordre', 'nom', 'prenom'];
        
        errors.sort((a, b) => {
          const aIndex = priorityFields.indexOf(a.field.split('.')[0]);
          const bIndex = priorityFields.indexOf(b.field.split('.')[0]);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });
        
        next(new ValidationException(errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware pour valider les paramètres de route
 */
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

/**
 * Middleware pour valider les query strings
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

/**
 * Middleware pour valider le corps de la requête
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

/**
 * Classe utilitaire pour créer des validateurs personnalisés
 */
export class ZodValidators {
  /**
   * Valide un numéro de téléphone sénégalais
   */
  static senegalPhone(message?: string) {
    return z.string().refine(
      (val) => {
        const cleaned = val.replace(/\s/g, '');
        return /^(\+221|221)?(70|71|76|77|78|75|33)\d{7}$/.test(cleaned);
      },
      { message: message || 'Numéro de téléphone sénégalais invalide' }
    );
  }

  /**
   * Valide un email
   */
  static email(message?: string) {
    return z
      .string()
      .trim()
      .regex(gmailEmailRegex, message || gmailEmailMessage)
      .transform((value) => value.toLowerCase());
  }

  /**
   * Valide un mot de passe sécurisé
   */
  static securePassword(message?: string) {
    return z.string()
      .min(8, message || 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
        message || 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
  }

  /**
   * Valide une date au format YYYY-MM-DD
   */
  static date(message?: string) {
    return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message || 'Date invalide. Format attendu: YYYY-MM-DD');
  }

  /**
   * Valide une date future
   */
  static futureDate(message?: string) {
    return z.string().refine(
      (val) => new Date(val) > new Date(),
      { message: message || 'La date doit être dans le futur' }
    );
  }

  /**
   * Valide une date passée
   */
  static pastDate(message?: string) {
    return z.string().refine(
      (val) => new Date(val) < new Date(),
      { message: message || 'La date doit être dans le passé' }
    );
  }

  /**
   * Valide un nombre positif
   */
  static positiveNumber(message?: string) {
    return z.number().positive(message || 'Le nombre doit être positif');
  }

  /**
   * Valide un entier positif
   */
  static positiveInt(message?: string) {
    return z.number().int().positive(message || 'Le nombre doit être un entier positif');
  }

  /**
   * Valide un ID
   */
  static id(message?: string) {
    return z.number().int().positive(message || 'ID invalide');
  }

  /**
   * Nettoie les chaînes de caractères
   */
  static sanitizeString() {
    return z.string().transform((val) => {
      if (typeof val !== 'string') return val;
      return val.trim().replace(/<[^>]*>/g, ''); // Supprimer les balises HTML
    });
  }

  /**
   * Valide un numéro de téléphone optionnel
   */
  static optionalPhone(message?: string) {
    return z.string().optional().refine(
      (val) => !val || /^(\+221|221)?(70|71|76|77|78|75|33)\d{7}$/.test(val.replace(/\s/g, '')),
      { message: message || 'Numéro de téléphone sénégalais invalide' }
    );
  }

  /**
   * Valide un email optionnel
   */
  static optionalEmail(message?: string) {
    return z.string().optional().refine(
      (val) => !val || gmailEmailRegex.test(val.trim()),
      { message: message || gmailEmailMessage }
    );
  }
}
