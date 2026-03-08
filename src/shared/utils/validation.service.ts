import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const gmailEmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/i;
const gmailEmailMessage = 'Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com';

/**
 * Service de validation avec vérification base de données
 * Vérifie l'unicité des champs critiques
 */
export class ValidationService {
  /**
   * Vérifie si un email existe déjà dans la base de données
   */
  static async checkEmailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        ...(excludeUserId && { id: { not: excludeUserId } })
      }
    });
    return !!user;
  }

  /**
   * Vérifie si un numéro de téléphone existe déjà
   */
  static async checkPhoneExists(
    phone: string, 
    options: {
      excludeUserId?: number;
      excludePatientId?: number;
      excludeMedecinId?: number;
      excludeSecretaireId?: number;
    } = {}
  ): Promise<{ exists: boolean; usedBy: string }> {
    const formattedPhone = this.formatPhone(phone);
    
    // Vérifier chez les patients
    const patient = await prisma.patient.findFirst({
      where: { telephone: formattedPhone }
    });
    if (patient) {
      if (options.excludePatientId && patient.id === options.excludePatientId) {
        // C'est le même patient, c'est ok
      } else {
        return { exists: true, usedBy: 'patient' };
      }
    }

    // Vérifier chez les médecins
    const medecin = await prisma.medecin.findFirst({
      where: { telephone: formattedPhone }
    });
    if (medecin) {
      if (options.excludeMedecinId && medecin.id === options.excludeMedecinId) {
        // C'est le même médecin, c'est ok
      } else {
        return { exists: true, usedBy: 'medecin' };
      }
    }

    // Vérifier chez les secrétaires
    const secretaire = await prisma.secretaire.findFirst({
      where: { telephone: formattedPhone }
    });
    if (secretaire) {
      if (options.excludeSecretaireId && secretaire.id === options.excludeSecretaireId) {
        // C'est le même secrétaire, c'est ok
      } else {
        return { exists: true, usedBy: 'secretaire' };
      }
    }

    return { exists: false, usedBy: '' };
  }

  /**
   * Valide et formate un numéro de téléphone sénégalais
   */
  static formatPhone(phone: string): string {
    if (!phone) return '';
    
    // Supprimer tous les espaces et caractères non numériques (sauf +)
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si ça commence par +, garder le format +221
    if (cleaned.startsWith('+')) {
      // Si ça commence par + et pas par +221, remplacer
      if (!cleaned.startsWith('+221')) {
        return '+221' + cleaned.replace(/^\+/, '');
      }
      return cleaned;
    }
    
    // Si ça commence par 221, ajouter +
    if (cleaned.startsWith('221')) {
      return '+' + cleaned;
    }
    
    // Si ça commence par un préfixe valide (70, 71, 76, 77, 78, 75, 33)
    if (/^(70|71|76|77|78|75|33)/.test(cleaned)) {
      return '+221' + cleaned;
    }
    
    return phone;
  }

  /**
   * Valide un numéro de téléphone sénégalais
   */
  static isValidSenegalPhone(phone: string): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/\s/g, '');
    return /^(\+221|221)?(70|71|76|77|78|75|33)\d{7}$/.test(cleaned);
  }

  /**
   * Valide une adresse email
   */
  static isValidEmail(email: string): boolean {
    if (!email) return false;
    return gmailEmailRegex.test(email.trim());
  }

  /**
   * Valide un mot de passe sécurisé
   */
  static isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Le mot de passe est requis');
      return { valid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide les données d'un médecin
   */
  static async validateMedecin(data: {
    email: string;
    telephone: string;
    nom: string;
    prenom: string;
    specialite: string;
    password?: string;
    medecinId?: number;
  }): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    const errors: Array<{ field: string; message: string }> = [];

    // Valider l'email
    if (!data.email) {
      errors.push({ field: 'email', message: 'L\'email est obligatoire' });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: gmailEmailMessage });
    } else if (await this.checkEmailExists(data.email)) {
      errors.push({ field: 'email', message: 'Cet email est déjà utilisé' });
    }

    // Valider le téléphone
    if (!data.telephone) {
      errors.push({ field: 'telephone', message: 'Le téléphone est obligatoire' });
    } else if (!this.isValidSenegalPhone(data.telephone)) {
      errors.push({ field: 'telephone', message: 'Numéro de téléphone sénégalais invalide (+221 avec préfixes 70,71,76,77,78,75,33)' });
    } else {
      const phoneCheck = await this.checkPhoneExists(data.telephone, {
        excludeMedecinId: data.medecinId
      });
      if (phoneCheck.exists) {
        errors.push({ field: 'telephone', message: `Ce numéro est déjà utilisé par un ${phoneCheck.usedBy}` });
      }
    }

    // Valider le nom
    if (!data.nom || data.nom.trim().length < 2) {
      errors.push({ field: 'nom', message: 'Le nom doit contenir au moins 2 caractères' });
    }

    // Valider le prénom
    if (!data.prenom || data.prenom.trim().length < 2) {
      errors.push({ field: 'prenom', message: 'Le prénom doit contenir au moins 2 caractères' });
    }

    // Valider la spécialite
    if (!data.specialite || data.specialite.trim().length < 2) {
      errors.push({ field: 'specialite', message: 'La spécialite est requise' });
    }

    // Valider le mot de passe (pour la création)
    if (!data.medecinId) {
      if (!data.password) {
        errors.push({ field: 'password', message: 'Le mot de passe est obligatoire' });
      } else if (data.password.length < 8) {
        errors.push({ field: 'password', message: 'Le mot de passe doit contenir au moins 8 caractères' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide les données d'un secrétaire
   */
  static async validateSecretaire(data: {
    email: string;
    telephone: string;
    nom: string;
    prenom: string;
    password?: string;
    secretaireId?: number;
  }): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    const errors: Array<{ field: string; message: string }> = [];

    // Valider l'email
    if (!data.email) {
      errors.push({ field: 'email', message: 'L\'email est obligatoire' });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: gmailEmailMessage });
    } else if (await this.checkEmailExists(data.email)) {
      errors.push({ field: 'email', message: 'Cet email est déjà utilisé' });
    }

    // Valider le téléphone
    if (!data.telephone) {
      errors.push({ field: 'telephone', message: 'Le téléphone est obligatoire' });
    } else if (!this.isValidSenegalPhone(data.telephone)) {
      errors.push({ field: 'telephone', message: 'Numéro de téléphone sénégalais invalide' });
    } else {
      const phoneCheck = await this.checkPhoneExists(data.telephone, {
        excludeSecretaireId: data.secretaireId
      });
      if (phoneCheck.exists) {
        errors.push({ field: 'telephone', message: `Ce numéro est déjà utilisé par un ${phoneCheck.usedBy}` });
      }
    }

    // Valider le nom
    if (!data.nom || data.nom.trim().length < 2) {
      errors.push({ field: 'nom', message: 'Le nom doit contenir au moins 2 caractères' });
    }

    // Valider le prénom
    if (!data.prenom || data.prenom.trim().length < 2) {
      errors.push({ field: 'prenom', message: 'Le prénom doit contenir au moins 2 caractères' });
    }

    // Valider le mot de passe (pour la création)
    if (!data.secretaireId) {
      if (!data.password) {
        errors.push({ field: 'password', message: 'Le mot de passe est obligatoire' });
      } else if (data.password.length < 8) {
        errors.push({ field: 'password', message: 'Le mot de passe doit contenir au moins 8 caractères' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide les données d'un patient
   */
  static async validatePatient(data: {
    email: string;
    telephone: string;
    nom: string;
    prenom: string;
    password?: string;
    patientId?: number;
  }): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    const errors: Array<{ field: string; message: string }> = [];

    // Valider l'email
    if (!data.email) {
      errors.push({ field: 'email', message: 'L\'email est obligatoire' });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: gmailEmailMessage });
    } else if (await this.checkEmailExists(data.email)) {
      errors.push({ field: 'email', message: 'Cet email est déjà utilisé' });
    }

    // Valider le téléphone
    if (!data.telephone) {
      errors.push({ field: 'telephone', message: 'Le téléphone est obligatoire' });
    } else if (!this.isValidSenegalPhone(data.telephone)) {
      errors.push({ field: 'telephone', message: 'Numéro de téléphone sénégalais invalide' });
    } else {
      const phoneCheck = await this.checkPhoneExists(data.telephone, {
        excludePatientId: data.patientId
      });
      if (phoneCheck.exists) {
        errors.push({ field: 'telephone', message: `Ce numéro est déjà utilisé par un ${phoneCheck.usedBy}` });
      }
    }

    // Valider le nom
    if (!data.nom || data.nom.trim().length < 2) {
      errors.push({ field: 'nom', message: 'Le nom doit contenir au moins 2 caractères' });
    }

    // Valider le prénom
    if (!data.prenom || data.prenom.trim().length < 2) {
      errors.push({ field: 'prenom', message: 'Le prénom doit contenir au moins 2 caractères' });
    }

    // Valider le mot de passe (pour la création)
    if (!data.patientId) {
      if (!data.password) {
        errors.push({ field: 'password', message: 'Le mot de passe est obligatoire' });
      } else if (data.password.length < 8) {
        errors.push({ field: 'password', message: 'Le mot de passe doit contenir au moins 8 caractères' });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default ValidationService;
