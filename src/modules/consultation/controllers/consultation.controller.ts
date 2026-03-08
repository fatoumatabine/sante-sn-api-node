import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { ConsultationService } from '../services/consultation.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class ConsultationController {
  private consultationService: ConsultationService;

  constructor() {
    this.consultationService = new ConsultationService();
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.getByPatientId = this.getByPatientId.bind(this);
    this.getByMedecinId = this.getByMedecinId.bind(this);
    this.create = this.create.bind(this);
    this.startFromRendezVous = this.startFromRendezVous.bind(this);
    this.startVideoSession = this.startVideoSession.bind(this);
    this.getVideoSession = this.getVideoSession.bind(this);
    this.pingVideoPresence = this.pingVideoPresence.bind(this);
    this.getVideoPresence = this.getVideoPresence.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const consultations = await this.consultationService.findAll();
      return res.status(200).json(ApiResponse.success(consultations, 'Consultations récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const consultation = await this.consultationService.findById(id);
      
      if (!consultation) {
        return res.status(404).json(ApiResponse.error('Consultation non trouvée', null, 404));
      }
      
      return res.status(200).json(ApiResponse.success(consultation, 'Consultation récupérée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByPatientId(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = parseInt(req.params.patientId);
      const consultations = await this.consultationService.findByPatientId(patientId);
      return res.status(200).json(ApiResponse.success(consultations, 'Consultations du patient récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByMedecinId(req: Request, res: Response, next: NextFunction) {
    try {
      const medecinId = parseInt(req.params.medecinId);
      const consultations = await this.consultationService.findByMedecinId(medecinId);
      return res.status(200).json(ApiResponse.success(consultations, 'Consultations du médecin récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const consultation = await this.consultationService.create(req.body);
      return res.status(201).json(ApiResponse.created(consultation, 'Consultation créée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async startFromRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rendezVousId = parseInt(req.params.rendezVousId);
      const consultation = await this.consultationService.startFromRendezVous(rendezVousId, {
        role: req.user?.role || '',
        medecinId: req.user?.medecinId,
      });
      return res.status(200).json(ApiResponse.success(consultation, 'Consultation démarrée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async startVideoSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.id);
      const session = await this.consultationService.startVideoSession(consultationId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(session, 'Session vidéo démarrée'));
    } catch (error) {
      next(error);
    }
  }

  async getVideoSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.id);
      const session = await this.consultationService.getVideoSession(consultationId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(session));
    } catch (error) {
      next(error);
    }
  }

  async pingVideoPresence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.id);
      const result = await this.consultationService.pingVideoPresence(consultationId, {
        id: req.user?.id,
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  async getVideoPresence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.id);
      const presence = await this.consultationService.getVideoPresence(consultationId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(presence));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const consultation = await this.consultationService.update(id, req.body);
      return res.status(200).json(ApiResponse.success(consultation, 'Consultation mise à jour avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.consultationService.delete(id);
      return res.status(200).json(ApiResponse.success(null, 'Consultation archivée avec succès'));
    } catch (error) {
      next(error);
    }
  }
}

export default new ConsultationController();
