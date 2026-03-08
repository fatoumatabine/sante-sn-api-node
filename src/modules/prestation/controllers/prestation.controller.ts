import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { PrestationService } from '../services/prestation.service';

export class PrestationController {
  private prestationService: PrestationService;

  constructor() {
    this.prestationService = new PrestationService();
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.getByPatientId = this.getByPatientId.bind(this);
    this.getByConsultationId = this.getByConsultationId.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const prestations = await this.prestationService.findAll();
      return res.status(200).json(ApiResponse.success(prestations, 'Prestations récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const prestation = await this.prestationService.findById(id);
      
      if (!prestation) {
        return res.status(404).json(ApiResponse.error('Prestation non trouvée', null, 404));
      }
      
      return res.status(200).json(ApiResponse.success(prestation, 'Prestation récupérée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByPatientId(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = parseInt(req.params.patientId);
      const prestations = await this.prestationService.findByPatientId(patientId);
      return res.status(200).json(ApiResponse.success(prestations, 'Prestations du patient récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByConsultationId(req: Request, res: Response, next: NextFunction) {
    try {
      const consultationId = parseInt(req.params.consultationId);
      const prestations = await this.prestationService.findByConsultationId(consultationId);
      return res.status(200).json(ApiResponse.success(prestations, 'Prestations récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const prestation = await this.prestationService.create(req.body);
      return res.status(201).json(ApiResponse.created(prestation, 'Prestation créée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const prestation = await this.prestationService.update(id, req.body);
      return res.status(200).json(ApiResponse.success(prestation, 'Prestation mise à jour avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.prestationService.delete(id);
      return res.status(200).json(ApiResponse.success(null, 'Prestation archivée avec succès'));
    } catch (error) {
      next(error);
    }
  }
}

export default new PrestationController();
