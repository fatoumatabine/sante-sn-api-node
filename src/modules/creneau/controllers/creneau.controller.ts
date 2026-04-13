import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { CreneauService } from '../services/creneau.service';

export class CreneauController {
  private creneauService: CreneauService;

  constructor() {
    this.creneauService = new CreneauService();
    this.getAll = this.getAll.bind(this);
    this.getByMedecinId = this.getByMedecinId.bind(this);
    this.getByMedecinIdAndDay = this.getByMedecinIdAndDay.bind(this);
    this.create = this.create.bind(this);
    this.createMultiple = this.createMultiple.bind(this);
    this.update = this.update.bind(this);
    this.toggleActive = this.toggleActive.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const creneaux = await this.creneauService.findAll();
      return res.status(200).json(ApiResponse.success(creneaux, 'Créneaux récupérés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByMedecinId(req: Request, res: Response, next: NextFunction) {
    try {
      const medecinId = parseInt(req.params.medecinId);
      const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
      const creneaux = await this.creneauService.findByMedecinId(medecinId, { includeInactive });
      return res.status(200).json(ApiResponse.success(creneaux, 'Créneaux du médecin récupérés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByMedecinIdAndDay(req: Request, res: Response, next: NextFunction) {
    try {
      const medecinId = parseInt(req.params.medecinId);
      const jour = parseInt(req.params.jour);
      const creneaux = await this.creneauService.findByMedecinIdAndDay(medecinId, jour);
      return res.status(200).json(ApiResponse.success(creneaux, 'Créneaux récupérés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const creneau = await this.creneauService.create(req.body);
      return res.status(201).json(ApiResponse.created(creneau, 'Créneau créé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async createMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const creneaux = await this.creneauService.createMultiple(req.body);
      return res.status(201).json(ApiResponse.created(creneaux, 'Créneaux créés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const creneau = await this.creneauService.update(id, req.body);
      return res.status(200).json(ApiResponse.success(creneau, 'Créneau mis à jour avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const creneau = await this.creneauService.toggleActive(id);
      return res.status(200).json(ApiResponse.success(creneau, creneau.actif ? 'Créneau activé' : 'Créneau désactivé'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.creneauService.delete(id);
      return res.status(200).json(ApiResponse.success(null, 'Créneau archivé avec succès'));
    } catch (error) {
      next(error);
    }
  }
}

export default new CreneauController();
