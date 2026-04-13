import { Request, Response, NextFunction } from 'express';
import { rendezVousService } from '../services/rendez-vous.service';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class RendezVousController {
  
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { medecin_id, date, type, motif, specialite, prestation_type, heure, triage_evaluation_id } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(403).json(ApiResponse.error('Utilisateur non identifié'));
      }
      
      if (!medecin_id || !date || !type || !heure) {
        return res.status(400).json(ApiResponse.error('Données manquantes'));
      }
      
      // Chercher le patient par userId
      const { prisma } = await import('../../../config/db');
      const patient = await prisma.patient.findFirst({
        where: { userId: Number(userId) }
      });
      
      if (!patient) {
        return res.status(403).json(ApiResponse.error('Profil patient requis'));
      }
      
      // Convertir la date en objet Date
      const dateObj = new Date(date);
      
      let urgentIa = false;

      if (triage_evaluation_id) {
        const triageEvaluation = await prisma.patientTriageEvaluation.findFirst({
          where: {
            id: Number(triage_evaluation_id),
            patientId: patient.id,
          },
          select: {
            urgent: true,
          },
        });

        if (!triageEvaluation) {
          return res.status(400).json(ApiResponse.error('Évaluation IA introuvable pour ce patient'));
        }

        urgentIa = triageEvaluation.urgent;
      }

      const rdv = await rendezVousService.create({
        patientId: patient.id,
        medecinId: Number(medecin_id),
        date: dateObj,
        heure,
        type,
        motif: motif || specialite,
        prestation_type,
        urgent_ia: urgentIa,
      });

      return res.status(201).json(ApiResponse.created(rdv, 'Rendez-vous créé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, statut, patientId, medecinId } = req.query;
      
      const result = await rendezVousService.findAll({
        page: Number(page) || 1,
        limit: Number(limit) || 15,
        statut,
        patientId: Number(patientId),
        medecinId: Number(medecinId),
      });

      return res.status(200).json(ApiResponse.paginated(
        result.data,
        result.total,
        Number(page) || 1,
        Number(limit) || 15
      ));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdv = await rendezVousService.findById(Number(id));

      const authReq = req as AuthRequest;
      const role = authReq.user?.role;

      if (role === 'patient' && authReq.user?.patientId !== rdv.patientId) {
        return res.status(403).json(ApiResponse.error('Accès interdit', null, 403));
      }

      if (role === 'medecin' && authReq.user?.medecinId !== rdv.medecinId) {
        return res.status(403).json(ApiResponse.error('Accès interdit', null, 403));
      }

      if (role === 'secretaire') {
        const secretaireId = authReq.user?.secretaireId;

        if (!secretaireId) {
          return res.status(403).json(ApiResponse.error('Profil secrétaire requis', null, 403));
        }

        const { prisma } = await import('../../../config/db');
        const secretaire = await prisma.secretaire.findFirst({
          where: { id: secretaireId, isArchived: false },
          select: { medecinId: true },
        });

        if (!secretaire?.medecinId || secretaire.medecinId !== rdv.medecinId) {
          return res.status(403).json(ApiResponse.error('Accès interdit', null, 403));
        }
      }

      return res.status(200).json(ApiResponse.success(rdv));
    } catch (error) {
      next(error);
    }
  }

  async mesRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patientId = (req.user as any)?.patientId;
      
      if (!patientId) {
        return res.status(403).json(ApiResponse.error('Profil patient requis'));
      }
      
      const rdv = await rendezVousService.mesRendezVous(patientId);

      return res.status(200).json(ApiResponse.success(rdv));
    } catch (error) {
      next(error);
    }
  }

  async medecinList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const medecinId = (req.user as any)?.medecinId;
      
      if (!medecinId) {
        return res.status(403).json(ApiResponse.error('Profil médecin requis'));
      }
      
      const rdv = await rendezVousService.medecinList(medecinId);

      return res.status(200).json(ApiResponse.success(rdv));
    } catch (error) {
      next(error);
    }
  }

  async annuler(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const raison = req.body?.raison_refus || req.body?.raison;
      await rendezVousService.annulerAvecContexte(
        Number(id),
        {
          id: req.user?.id,
          role: req.user?.role || '',
          patientId: req.user?.patientId,
          medecinId: req.user?.medecinId,
          secretaireId: req.user?.secretaireId,
        },
        raison
      );

      return res.status(200).json(ApiResponse.success(null, 'Rendez-vous annulé'));
    } catch (error) {
      next(error);
    }
  }

  async confirmer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdv = await rendezVousService.confirmer(Number(id), {
        id: req.user?.id,
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      return res.status(200).json(ApiResponse.success(rdv, 'Rendez-vous confirmé'));
    } catch (error) {
      next(error);
    }
  }

  async payer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdv = await rendezVousService.payer(Number(id), {
        id: req.user?.id,
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      return res.status(200).json(ApiResponse.success(rdv, 'Paiement enregistré'));
    } catch (error) {
      next(error);
    }
  }

  async getCreneauxDisponibles(req: Request, res: Response, next: NextFunction) {
    try {
      const { medecinId, date } = req.query;
      const creneaux = await rendezVousService.getCreneauxDisponibles(
        Number(medecinId),
        new Date(date as string)
      );

      return res.status(200).json(ApiResponse.success(creneaux));
    } catch (error) {
      next(error);
    }
  }
}

export const rendezVousController = new RendezVousController();
