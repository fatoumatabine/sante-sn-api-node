import { Response, NextFunction } from 'express';
import { patientService } from '../services/patient.service';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class PatientController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }
      
      const patient = await patientService.getPatientProfile(userId);
      return res.json(ApiResponse.success(patient));
    } catch (error) {
      next(error);
    }
  }

  async getMesRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }
      
      const rendezVous = await patientService.getMesRendezVous(userId);
      return res.json(ApiResponse.success(rendezVous));
    } catch (error) {
      next(error);
    }
  }

  async getMesConsultations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }
      
      const consultations = await patientService.getMesConsultations(userId);
      return res.json(ApiResponse.success(consultations));
    } catch (error) {
      next(error);
    }
  }

  async getDossierMedical(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const dossier = await patientService.getPatientMedicalRecord(userId);
      return res.json(ApiResponse.success(dossier));
    } catch (error) {
      next(error);
    }
  }

  async getDashboardSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }
      
      const summary = await patientService.getDashboardSummary(userId);
      return res.json(ApiResponse.success(summary));
    } catch (error) {
      next(error);
    }
  }

  async getMesPaiements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }
      
      const paiements = await patientService.getMesPaiements(userId);
      return res.json(ApiResponse.success(paiements));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const { prenom, nom, telephone, email, avatarUrl } = req.body as {
        prenom?: string;
        nom?: string;
        telephone?: string;
        email?: string;
        avatarUrl?: string | null;
      };

      const updated = await patientService.updatePatientProfile(userId, {
        prenom,
        nom,
        telephone,
        email,
        avatarUrl,
      });
      return res.json(ApiResponse.success(updated, 'Profil mis à jour'));
    } catch (error) {
      next(error);
    }
  }

  async runTriageEvaluation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const { responses, contexteLibre } = req.body as {
        responses?: Record<string, string | string[]>;
        contexteLibre?: string;
      };

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json(ApiResponse.error('Réponses invalides'));
      }

      const evaluation = await patientService.runTriageEvaluation(userId, {
        responses,
        contexteLibre,
      });

      return res.status(201).json(ApiResponse.created(evaluation, 'Évaluation IA enregistrée'));
    } catch (error) {
      next(error);
    }
  }

  async getTriageHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const rawLimit = Number(req.query.limit || 10);
      const limit = Number.isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);

      const history = await patientService.getTriageHistory(userId, limit);
      return res.json(ApiResponse.success(history));
    } catch (error) {
      next(error);
    }
  }
}

export const patientController = new PatientController();
