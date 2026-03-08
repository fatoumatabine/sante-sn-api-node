import { Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { 
  validateData, 
  getFirstValidationError, 
  validateSenegalPhoneNumber,
  formatSenegalPhoneNumber,
  validateGmailEmail
} from '../../../shared/utils/validation';

const prisma = new PrismaClient();

const buildArchivedEmail = (email: string, userId: number) =>
  `archived+${userId}+${Date.now()}-${email}`;

const buildArchivedPhone = (phone: string, profileId: number) =>
  `${phone}-arch-${profileId}-${Date.now()}`;

const extractOriginalArchivedEmail = (archivedEmail: string) => {
  const match = archivedEmail.match(/^archived\+\d+\+\d+-(.+)$/);
  return match ? match[1] : archivedEmail;
};

const extractOriginalArchivedPhone = (archivedPhone: string) => {
  const match = archivedPhone.match(/^(.*)-arch-\d+-\d+$/);
  return match ? match[1] : archivedPhone;
};

export class AdminController {
  async getMedecins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const medecins = await adminService.getMedecins();
      return res.json(ApiResponse.success(medecins));
    } catch (error) {
      next(error);
    }
  }

  async getSecretaires(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaires = await adminService.getSecretaires();
      return res.json(ApiResponse.success(secretaires));
    } catch (error) {
      next(error);
    }
  }

  async getPatients(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patients = await adminService.getPatients();
      return res.json(ApiResponse.success(patients));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getStats();
      return res.json(ApiResponse.success(stats));
    } catch (error) {
      next(error);
    }
  }

  async getArchives(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const requestedType = String(req.query.type || 'all').toLowerCase();
      const allowedTypes = ['all', 'medecin', 'secretaire', 'patient'];

      if (!allowedTypes.includes(requestedType)) {
        return res.status(400).json(ApiResponse.error('Type invalide. Utilisez all, medecin, secretaire ou patient'));
      }

      const archives: any[] = [];
      const includeType = (type: string) => requestedType === 'all' || requestedType === type;

      if (includeType('medecin')) {
        const medecins = await prisma.medecin.findMany({
          where: { isArchived: true },
          include: { user: true },
          orderBy: { archivedAt: 'desc' },
        });

        medecins.forEach((item) => {
          archives.push({
            type: 'medecin',
            id: item.id,
            userId: item.userId,
            nomComplet: `Dr. ${item.prenom} ${item.nom}`,
            email: item.user?.email || null,
            telephone: item.telephone,
            archivedAt: item.archivedAt || item.updatedAt,
            createdAt: item.createdAt,
            details: { specialite: item.specialite },
          });
        });
      }

      if (includeType('secretaire')) {
        const secretaires = await prisma.secretaire.findMany({
          where: { isArchived: true },
          include: { user: true, medecin: true },
          orderBy: { archivedAt: 'desc' },
        });

        secretaires.forEach((item) => {
          archives.push({
            type: 'secretaire',
            id: item.id,
            userId: item.userId,
            nomComplet: `${item.prenom} ${item.nom}`,
            email: item.user?.email || null,
            telephone: item.telephone,
            archivedAt: item.archivedAt || item.updatedAt,
            createdAt: item.createdAt,
            details: {
              medecinAssigne: item.medecin ? `Dr. ${item.medecin.prenom} ${item.medecin.nom}` : null,
            },
          });
        });
      }

      if (includeType('patient')) {
        const patients = await prisma.patient.findMany({
          where: { isArchived: true },
          include: { user: true },
          orderBy: { archivedAt: 'desc' },
        });

        patients.forEach((item) => {
          archives.push({
            type: 'patient',
            id: item.id,
            userId: item.userId,
            nomComplet: `${item.prenom} ${item.nom}`,
            email: item.user?.email || null,
            telephone: item.telephone,
            archivedAt: item.archivedAt || item.updatedAt,
            createdAt: item.createdAt,
            details: {
              groupeSanguin: item.groupe_sanguin || null,
            },
          });
        });
      }

      archives.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());

      return res.json(ApiResponse.success(archives, 'Archives chargées'));
    } catch (error) {
      next(error);
    }
  }

  async createMedecin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, nom, prenom, specialite, telephone, adresse, tarif_consultation, numeroOrdre } = req.body;
      
      // Validation des champs obligatoires
      if (!email || !password || !nom || !prenom || !specialite || !telephone) {
        const missingFields = [];
        if (!email) missingFields.push('email');
        if (!password) missingFields.push('mot de passe');
        if (!nom) missingFields.push('nom');
        if (!prenom) missingFields.push('prénom');
        if (!specialite) missingFields.push('spécialité');
        if (!telephone) missingFields.push('téléphone');
        
        return res.status(400).json(ApiResponse.error(`Champ(s) obligatoire(s) manquant(s): ${missingFields.join(', ')}`));
      }

      // Validation du format du téléphone
      if (!validateSenegalPhoneNumber(telephone)) {
        return res.status(400).json(ApiResponse.error(
          'Téléphone invalide. Le numéro doit être un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
        ));
      }

      // Validation du format de l'email
      if (!validateGmailEmail(email)) {
        return res.status(400).json(ApiResponse.error('Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com'));
      }

      // Validation du mot de passe
      if (password.length < 8) {
        return res.status(400).json(ApiResponse.error('Le mot de passe doit contenir au moins 8 caractères'));
      }

      // Vérification de l'unicité de l'email
      const existingUser = await prisma.user.findFirst({ where: { email, isArchived: false } });
      if (existingUser) {
        return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé'));
      }

      // Vérification de l'unicité du téléphone
      const existingMedecinTel = await prisma.medecin.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingMedecinTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé'));
      }

      const existingPatientTel = await prisma.patient.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingPatientTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un patient'));
      }

      const existingSecretaireTel = await prisma.secretaire.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingSecretaireTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un(e) secrétaire'));
      }

      const fullName = name || `${prenom || ''} ${nom || ''}`.trim();
      
      // Créer l'utilisateur
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          role: 'medecin'
        }
      });

      const medecin = await prisma.medecin.create({
        data: {
          userId: user.id,
          nom: nom || fullName.split(' ')[1] || fullName,
          prenom: prenom || fullName.split(' ')[0] || fullName,
          specialite,
          telephone: formatSenegalPhoneNumber(telephone),
          adresse,
          tarif_consultation: tarif_consultation || 0
        }
      });

      return res.json(ApiResponse.success(medecin, 'Médecin créé avec succès'));
    } catch (error: any) {
      // Gestion des erreurs de base de données
      if (error.code === 'P2002') {
        return res.status(400).json(ApiResponse.error('Un utilisateur avec cet email existe déjà'));
      }
      next(error);
    }
  }

  async updateMedecin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const medecinId = parseInt(req.params.id, 10);
      const { email, password, nom, prenom, specialite, telephone, adresse, tarif_consultation } = req.body;

      const existingMedecin = await prisma.medecin.findFirst({
        where: { id: medecinId, isArchived: false },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      if (!existingMedecin) {
        return res.status(404).json(ApiResponse.error('Médecin non trouvé'));
      }

      const cleanedNom = typeof nom === 'string' ? nom.trim() : undefined;
      const cleanedPrenom = typeof prenom === 'string' ? prenom.trim() : undefined;
      const cleanedSpecialite = typeof specialite === 'string' ? specialite.trim() : undefined;
      const cleanedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
      const formattedTelephone = typeof telephone === 'string' ? formatSenegalPhoneNumber(telephone) : undefined;

      if (typeof nom === 'string' && !cleanedNom) {
        return res.status(400).json(ApiResponse.error('Nom requis'));
      }

      if (typeof prenom === 'string' && !cleanedPrenom) {
        return res.status(400).json(ApiResponse.error('Prénom requis'));
      }

      if (typeof specialite === 'string' && !cleanedSpecialite) {
        return res.status(400).json(ApiResponse.error('Spécialité requise'));
      }

      if (cleanedEmail && !validateGmailEmail(cleanedEmail)) {
        return res.status(400).json(ApiResponse.error('Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com'));
      }

      if (password && password.length < 8) {
        return res.status(400).json(ApiResponse.error('Le mot de passe doit contenir au moins 8 caractères'));
      }

      if (formattedTelephone && !validateSenegalPhoneNumber(formattedTelephone)) {
        return res.status(400).json(ApiResponse.error(
          'Téléphone invalide. Le numéro doit être un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
        ));
      }

      if (cleanedEmail && cleanedEmail !== existingMedecin.user.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: cleanedEmail,
            isArchived: false,
            id: { not: existingMedecin.userId },
          },
        });
        if (existingUser) {
          return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé'));
        }
      }

      if (formattedTelephone && formattedTelephone !== existingMedecin.telephone) {
        const existingMedecinTel = await prisma.medecin.findFirst({
          where: {
            telephone: formattedTelephone,
            isArchived: false,
            id: { not: medecinId },
          },
        });
        if (existingMedecinTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé'));
        }

        const existingPatientTel = await prisma.patient.findFirst({
          where: { telephone: formattedTelephone, isArchived: false },
        });
        if (existingPatientTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un patient'));
        }

        const existingSecretaireTel = await prisma.secretaire.findFirst({
          where: { telephone: formattedTelephone, isArchived: false },
        });
        if (existingSecretaireTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un(e) secrétaire'));
        }
      }

      const medecinData: Record<string, any> = {};
      if (typeof cleanedNom !== 'undefined') medecinData.nom = cleanedNom;
      if (typeof cleanedPrenom !== 'undefined') medecinData.prenom = cleanedPrenom;
      if (typeof cleanedSpecialite !== 'undefined') medecinData.specialite = cleanedSpecialite;
      if (typeof formattedTelephone !== 'undefined') medecinData.telephone = formattedTelephone;
      if (typeof adresse !== 'undefined') medecinData.adresse = adresse;
      if (typeof tarif_consultation !== 'undefined') medecinData.tarif_consultation = tarif_consultation;

      const userData: Record<string, any> = {};
      if (typeof cleanedEmail !== 'undefined') userData.email = cleanedEmail;

      if (typeof cleanedNom !== 'undefined' || typeof cleanedPrenom !== 'undefined') {
        const finalNom = cleanedNom ?? existingMedecin.nom;
        const finalPrenom = cleanedPrenom ?? existingMedecin.prenom;
        userData.name = `${finalPrenom} ${finalNom}`.trim();
      }

      if (password) {
        const bcrypt = require('bcryptjs');
        userData.password = await bcrypt.hash(password, 10);
      }

      const medecin = await prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: existingMedecin.userId },
            data: userData,
          });
        }

        if (Object.keys(medecinData).length > 0) {
          await tx.medecin.update({
            where: { id: medecinId },
            data: medecinData,
          });
        }

        return tx.medecin.findUnique({
          where: { id: medecinId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
              },
            },
          },
        });
      });

      return res.json(ApiResponse.success(medecin, 'Médecin mis à jour'));
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json(ApiResponse.error('Un utilisateur avec cet email existe déjà'));
      }
      next(error);
    }
  }

  async deleteMedecin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const medecin = await prisma.medecin.findFirst({
        where: { id: parseInt(id), isArchived: false },
      });
      if (!medecin) {
        return res.status(404).json(ApiResponse.error('Médecin non trouvé'));
      }

      await prisma.$transaction(async (tx) => {
        const linkedUser = await tx.user.findUnique({ where: { id: medecin.userId } });
        await tx.medecin.update({
          where: { id: medecin.id },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            telephone: buildArchivedPhone(medecin.telephone, medecin.id),
          },
        });
        await tx.user.update({
          where: { id: medecin.userId },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            rememberToken: null,
            email: buildArchivedEmail(linkedUser?.email || `user${medecin.userId}@archive.local`, medecin.userId),
          },
        });
      });

      return res.json(ApiResponse.success(null, 'Médecin archivé'));
    } catch (error) {
      next(error);
    }
  }

  async createSecretaire(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, nom, prenom, telephone, medecinId } = req.body;

      // Validation des champs obligatoires
      if (!email || !password || !nom || !prenom || !telephone) {
        const missingFields = [];
        if (!email) missingFields.push('email');
        if (!password) missingFields.push('mot de passe');
        if (!nom) missingFields.push('nom');
        if (!prenom) missingFields.push('prénom');
        if (!telephone) missingFields.push('téléphone');
        
        return res.status(400).json(ApiResponse.error(`Champ(s) obligatoire(s) manquant(s): ${missingFields.join(', ')}`));
      }

      // Validation du format du téléphone
      if (!validateSenegalPhoneNumber(telephone)) {
        return res.status(400).json(ApiResponse.error(
          'Téléphone invalide. Le numéro doit être un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
        ));
      }

      // Validation du format de l'email
      if (!validateGmailEmail(email)) {
        return res.status(400).json(ApiResponse.error('Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com'));
      }

      // Validation du mot de passe
      if (password.length < 8) {
        return res.status(400).json(ApiResponse.error('Le mot de passe doit contenir au moins 8 caractères'));
      }

      // Vérification de l'unicité de l'email
      const existingUser = await prisma.user.findFirst({ where: { email, isArchived: false } });
      if (existingUser) {
        return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé'));
      }

      // Vérification de l'unicité du téléphone
      const existingMedecinTel = await prisma.medecin.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingMedecinTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un médecin'));
      }

      const existingPatientTel = await prisma.patient.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingPatientTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un patient'));
      }

      const existingSecretaireTel = await prisma.secretaire.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingSecretaireTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé'));
      }

      const fullName = name || `${prenom || ''} ${nom || ''}`.trim();
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          role: 'secretaire'
        }
      });

      const secretaire = await prisma.secretaire.create({
        data: {
          userId: user.id,
          nom: nom || fullName.split(' ')[1] || fullName,
          prenom: prenom || fullName.split(' ')[0] || fullName,
          telephone: formatSenegalPhoneNumber(telephone),
          medecinId: medecinId ? parseInt(medecinId) : null
        }
      });

      return res.json(ApiResponse.success(secretaire, 'Secrétaire créé avec succès'));
    } catch (error: any) {
      // Gestion des erreurs de base de données
      if (error.code === 'P2002') {
        return res.status(400).json(ApiResponse.error('Un utilisateur avec cet email existe déjà'));
      }
      next(error);
    }
  }

  async updateSecretaire(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaireId = parseInt(req.params.id, 10);
      const { email, password, nom, prenom, telephone, medecinId } = req.body;

      const existingSecretaire = await prisma.secretaire.findFirst({
        where: { id: secretaireId, isArchived: false },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      if (!existingSecretaire) {
        return res.status(404).json(ApiResponse.error('Secrétaire non trouvé'));
      }

      const cleanedNom = typeof nom === 'string' ? nom.trim() : undefined;
      const cleanedPrenom = typeof prenom === 'string' ? prenom.trim() : undefined;
      const cleanedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
      const formattedTelephone = typeof telephone === 'string' ? formatSenegalPhoneNumber(telephone) : undefined;

      if (typeof nom === 'string' && !cleanedNom) {
        return res.status(400).json(ApiResponse.error('Nom requis'));
      }

      if (typeof prenom === 'string' && !cleanedPrenom) {
        return res.status(400).json(ApiResponse.error('Prénom requis'));
      }

      if (cleanedEmail && !validateGmailEmail(cleanedEmail)) {
        return res.status(400).json(ApiResponse.error('Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com'));
      }

      if (password && password.length < 8) {
        return res.status(400).json(ApiResponse.error('Le mot de passe doit contenir au moins 8 caractères'));
      }

      if (formattedTelephone && !validateSenegalPhoneNumber(formattedTelephone)) {
        return res.status(400).json(ApiResponse.error(
          'Téléphone invalide. Le numéro doit être un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
        ));
      }

      if (cleanedEmail && cleanedEmail !== existingSecretaire.user.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: cleanedEmail,
            isArchived: false,
            id: { not: existingSecretaire.userId },
          },
        });
        if (existingUser) {
          return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé'));
        }
      }

      if (formattedTelephone && formattedTelephone !== existingSecretaire.telephone) {
        const existingMedecinTel = await prisma.medecin.findFirst({
          where: { telephone: formattedTelephone, isArchived: false },
        });
        if (existingMedecinTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un médecin'));
        }

        const existingPatientTel = await prisma.patient.findFirst({
          where: { telephone: formattedTelephone, isArchived: false },
        });
        if (existingPatientTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un patient'));
        }

        const existingSecretaireTel = await prisma.secretaire.findFirst({
          where: {
            telephone: formattedTelephone,
            isArchived: false,
            id: { not: secretaireId },
          },
        });
        if (existingSecretaireTel) {
          return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé'));
        }
      }

      let resolvedMedecinId: number | null | undefined = undefined;
      if (typeof medecinId !== 'undefined') {
        if (medecinId === null || medecinId === '') {
          resolvedMedecinId = null;
        } else {
          const parsedMedecinId = Number(medecinId);
          if (!Number.isInteger(parsedMedecinId) || parsedMedecinId <= 0) {
            return res.status(400).json(ApiResponse.error('Médecin assigné invalide'));
          }

          const medecinExists = await prisma.medecin.findFirst({
            where: { id: parsedMedecinId, isArchived: false },
            select: { id: true },
          });

          if (!medecinExists) {
            return res.status(400).json(ApiResponse.error('Médecin assigné introuvable'));
          }

          resolvedMedecinId = parsedMedecinId;
        }
      }

      const secretaireData: Record<string, any> = {};
      if (typeof cleanedNom !== 'undefined') secretaireData.nom = cleanedNom;
      if (typeof cleanedPrenom !== 'undefined') secretaireData.prenom = cleanedPrenom;
      if (typeof formattedTelephone !== 'undefined') secretaireData.telephone = formattedTelephone;
      if (typeof resolvedMedecinId !== 'undefined') secretaireData.medecinId = resolvedMedecinId;

      const userData: Record<string, any> = {};
      if (typeof cleanedEmail !== 'undefined') userData.email = cleanedEmail;

      if (typeof cleanedNom !== 'undefined' || typeof cleanedPrenom !== 'undefined') {
        const finalNom = cleanedNom ?? existingSecretaire.nom;
        const finalPrenom = cleanedPrenom ?? existingSecretaire.prenom;
        userData.name = `${finalPrenom} ${finalNom}`.trim();
      }

      if (password) {
        const bcrypt = require('bcryptjs');
        userData.password = await bcrypt.hash(password, 10);
      }

      const secretaire = await prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: existingSecretaire.userId },
            data: userData,
          });
        }

        if (Object.keys(secretaireData).length > 0) {
          await tx.secretaire.update({
            where: { id: secretaireId },
            data: secretaireData,
          });
        }

        return tx.secretaire.findUnique({
          where: { id: secretaireId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
              },
            },
            medecin: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });
      });

      return res.json(ApiResponse.success(secretaire, 'Secrétaire mis à jour'));
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json(ApiResponse.error('Un utilisateur avec cet email existe déjà'));
      }
      next(error);
    }
  }

  async deleteSecretaire(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const secretaire = await prisma.secretaire.findFirst({
        where: { id: parseInt(id), isArchived: false },
      });
      if (!secretaire) {
        return res.status(404).json(ApiResponse.error('Secrétaire non trouvé'));
      }

      await prisma.$transaction(async (tx) => {
        const linkedUser = await tx.user.findUnique({ where: { id: secretaire.userId } });
        await tx.secretaire.update({
          where: { id: secretaire.id },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            telephone: buildArchivedPhone(secretaire.telephone, secretaire.id),
          },
        });
        await tx.user.update({
          where: { id: secretaire.userId },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            rememberToken: null,
            email: buildArchivedEmail(linkedUser?.email || `user${secretaire.userId}@archive.local`, secretaire.userId),
          },
        });
      });

      return res.json(ApiResponse.success(null, 'Secrétaire archivé'));
    } catch (error) {
      next(error);
    }
  }

  async createPatient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, nom, prenom, telephone, date_naissance, adresse, groupe_sanguin } = req.body;

      // Validation des champs obligatoires
      if (!email || !password || !nom || !prenom || !telephone) {
        const missingFields = [];
        if (!email) missingFields.push('email');
        if (!password) missingFields.push('mot de passe');
        if (!nom) missingFields.push('nom');
        if (!prenom) missingFields.push('prénom');
        if (!telephone) missingFields.push('téléphone');
        
        return res.status(400).json(ApiResponse.error(`Champ(s) obligatoire(s) manquant(s): ${missingFields.join(', ')}`));
      }

      // Validation du format du téléphone
      if (!validateSenegalPhoneNumber(telephone)) {
        return res.status(400).json(ApiResponse.error(
          'Téléphone invalide. Le numéro doit être un numéro sénégalais (+221) avec les préfixes 70, 71, 76, 77, 78, 75 ou 33'
        ));
      }

      // Validation du format de l'email
      if (!validateGmailEmail(email)) {
        return res.status(400).json(ApiResponse.error('Adresse email invalide. Utilisez uniquement le format votrenom@gmail.com'));
      }

      // Validation du mot de passe
      if (password.length < 8) {
        return res.status(400).json(ApiResponse.error('Le mot de passe doit contenir au moins 8 caractères'));
      }

      // Vérification de l'unicité de l'email
      const existingUser = await prisma.user.findFirst({ where: { email, isArchived: false } });
      if (existingUser) {
        return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé'));
      }

      // Vérification de l'unicité du téléphone
      const existingMedecinTel = await prisma.medecin.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingMedecinTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un médecin'));
      }

      const existingPatientTel = await prisma.patient.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingPatientTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé'));
      }

      const existingSecretaireTel = await prisma.secretaire.findFirst({ 
        where: { telephone: formatSenegalPhoneNumber(telephone), isArchived: false } 
      });
      if (existingSecretaireTel) {
        return res.status(400).json(ApiResponse.error('Ce numéro de téléphone est déjà utilisé par un(e) secrétaire'));
      }

      const fullName = name || `${prenom || ''} ${nom || ''}`.trim();
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          role: 'patient'
        }
      });

      const patient = await prisma.patient.create({
        data: {
          userId: user.id,
          nom: nom || fullName.split(' ')[1] || fullName,
          prenom: prenom || fullName.split(' ')[0] || fullName,
          telephone: formatSenegalPhoneNumber(telephone),
          date_naissance: date_naissance ? new Date(date_naissance) : null,
          adresse,
          groupe_sanguin
        }
      });

      return res.json(ApiResponse.success(patient, 'Patient créé avec succès'));
    } catch (error: any) {
      // Gestion des erreurs de base de données
      if (error.code === 'P2002') {
        return res.status(400).json(ApiResponse.error('Un utilisateur avec cet email existe déjà'));
      }
      next(error);
    }
  }

  async updatePatient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { telephone, date_naissance, adresse, groupe_sanguin, diabete, hypertension, hepatite, autres_pathologies } = req.body;
      
      const patient = await prisma.patient.update({
        where: { id: parseInt(id) },
        data: {
          telephone,
          date_naissance: date_naissance ? new Date(date_naissance) : null,
          adresse,
          groupe_sanguin,
          diabete,
          hypertension,
          hepatite,
          autres_pathologies
        }
      });

      return res.json(ApiResponse.success(patient, 'Patient mis à jour'));
    } catch (error) {
      next(error);
    }
  }

  async deletePatient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const patient = await prisma.patient.findFirst({
        where: { id: parseInt(id), isArchived: false },
      });
      if (!patient) {
        return res.status(404).json(ApiResponse.error('Patient non trouvé'));
      }

      await prisma.$transaction(async (tx) => {
        const linkedUser = await tx.user.findUnique({ where: { id: patient.userId } });
        await tx.patient.update({
          where: { id: patient.id },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            telephone: buildArchivedPhone(patient.telephone, patient.id),
          },
        });
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            rememberToken: null,
            email: buildArchivedEmail(linkedUser?.email || `user${patient.userId}@archive.local`, patient.userId),
          },
        });
      });

      return res.json(ApiResponse.success(null, 'Patient archivé'));
    } catch (error) {
      next(error);
    }
  }

  async restoreArchive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const type = String(req.params.type || '').toLowerCase();
      const id = parseInt(req.params.id || '0', 10);

      if (!['medecin', 'secretaire', 'patient'].includes(type) || Number.isNaN(id) || id <= 0) {
        return res.status(400).json(ApiResponse.error('Type ou identifiant invalide'));
      }

      if (type === 'medecin') {
        const medecin = await prisma.medecin.findFirst({
          where: { id, isArchived: true },
          include: { user: true },
        });

        if (!medecin) {
          return res.status(404).json(ApiResponse.error('Médecin archivé non trouvé'));
        }

        const restoredEmail = extractOriginalArchivedEmail(medecin.user.email);
        const restoredPhone = extractOriginalArchivedPhone(medecin.telephone);

        const existingEmail = await prisma.user.findFirst({
          where: { email: restoredEmail, isArchived: false },
        });
        if (existingEmail && existingEmail.id !== medecin.userId) {
          return res.status(409).json(ApiResponse.error('Impossible de restaurer: email déjà utilisé'));
        }

        const existingPhone = await prisma.medecin.findFirst({
          where: { telephone: restoredPhone, isArchived: false },
        });
        if (existingPhone && existingPhone.id !== medecin.id) {
          return res.status(409).json(ApiResponse.error('Impossible de restaurer: téléphone déjà utilisé'));
        }

        await prisma.$transaction(async (tx) => {
          await tx.medecin.update({
            where: { id: medecin.id },
            data: { isArchived: false, archivedAt: null, telephone: restoredPhone },
          });
          await tx.user.update({
            where: { id: medecin.userId },
            data: { isArchived: false, archivedAt: null, email: restoredEmail },
          });
        });

        return res.json(ApiResponse.success(null, 'Médecin restauré avec succès'));
      }

      if (type === 'secretaire') {
        const secretaire = await prisma.secretaire.findFirst({
          where: { id, isArchived: true },
          include: { user: true },
        });

        if (!secretaire) {
          return res.status(404).json(ApiResponse.error('Secrétaire archivée non trouvée'));
        }

        const restoredEmail = extractOriginalArchivedEmail(secretaire.user.email);
        const restoredPhone = extractOriginalArchivedPhone(secretaire.telephone);

        const existingEmail = await prisma.user.findFirst({
          where: { email: restoredEmail, isArchived: false },
        });
        if (existingEmail && existingEmail.id !== secretaire.userId) {
          return res.status(409).json(ApiResponse.error('Impossible de restaurer: email déjà utilisé'));
        }

        const existingPhone = await prisma.secretaire.findFirst({
          where: { telephone: restoredPhone, isArchived: false },
        });
        if (existingPhone && existingPhone.id !== secretaire.id) {
          return res.status(409).json(ApiResponse.error('Impossible de restaurer: téléphone déjà utilisé'));
        }

        await prisma.$transaction(async (tx) => {
          await tx.secretaire.update({
            where: { id: secretaire.id },
            data: { isArchived: false, archivedAt: null, telephone: restoredPhone },
          });
          await tx.user.update({
            where: { id: secretaire.userId },
            data: { isArchived: false, archivedAt: null, email: restoredEmail },
          });
        });

        return res.json(ApiResponse.success(null, 'Secrétaire restaurée avec succès'));
      }

      const patient = await prisma.patient.findFirst({
        where: { id, isArchived: true },
        include: { user: true },
      });

      if (!patient) {
        return res.status(404).json(ApiResponse.error('Patient archivé non trouvé'));
      }

      const restoredEmail = extractOriginalArchivedEmail(patient.user.email);
      const restoredPhone = extractOriginalArchivedPhone(patient.telephone);

      const existingEmail = await prisma.user.findFirst({
        where: { email: restoredEmail, isArchived: false },
      });
      if (existingEmail && existingEmail.id !== patient.userId) {
        return res.status(409).json(ApiResponse.error('Impossible de restaurer: email déjà utilisé'));
      }

      const existingPhone = await prisma.patient.findFirst({
        where: { telephone: restoredPhone, isArchived: false },
      });
      if (existingPhone && existingPhone.id !== patient.id) {
        return res.status(409).json(ApiResponse.error('Impossible de restaurer: téléphone déjà utilisé'));
      }

      await prisma.$transaction(async (tx) => {
        await tx.patient.update({
          where: { id: patient.id },
          data: { isArchived: false, archivedAt: null, telephone: restoredPhone },
        });
        await tx.user.update({
          where: { id: patient.userId },
          data: { isArchived: false, archivedAt: null, email: restoredEmail },
        });
      });

      return res.json(ApiResponse.success(null, 'Patient restauré avec succès'));
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
