import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { OrdonnanceService } from '../services/ordonnance.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class OrdonnanceController {
  private ordonnanceService: OrdonnanceService;

  constructor() {
    this.ordonnanceService = new OrdonnanceService();
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.getByConsultationId = this.getByConsultationId.bind(this);
    this.getByPatientId = this.getByPatientId.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.download = this.download.bind(this);
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ordonnances = await this.ordonnanceService.findAll({
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(ordonnances, 'Ordonnances récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const ordonnance = await this.ordonnanceService.findById(id, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      
      if (!ordonnance) {
        return res.status(404).json(ApiResponse.error('Ordonnance non trouvée', null, 404));
      }
      
      return res.status(200).json(ApiResponse.success(ordonnance, 'Ordonnance récupérée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByConsultationId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.consultationId);
      const ordonnance = await this.ordonnanceService.findByConsultationId(consultationId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(ordonnance, 'Ordonnance récupérée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByPatientId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patientId = parseInt(req.params.patientId);
      const ordonnances = await this.ordonnanceService.findByPatientId(patientId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(ordonnances, 'Ordonnances du patient récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ordonnance = await this.ordonnanceService.create(req.body, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(201).json(ApiResponse.created(ordonnance, 'Ordonnance créée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const ordonnance = await this.ordonnanceService.update(id, req.body, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(ordonnance, 'Ordonnance mise à jour avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.ordonnanceService.delete(id, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(null, 'Ordonnance archivée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const result = await this.ordonnanceService.generateOrdonnancePdf(id, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new OrdonnanceController();
