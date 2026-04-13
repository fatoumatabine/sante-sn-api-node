import { Request, Response, NextFunction } from 'express';
import { medecinService } from '../services/medecin.service';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class MedecinController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, specialite } = req.query;
      const result = await medecinService.findAll({
        page: Number(page) || 1,
        limit: Number(limit) || 15,
        specialite: specialite as string,
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

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const medecin = await medecinService.findById(Number(id));
      return res.status(200).json(ApiResponse.success(medecin));
    } catch (error) {
      next(error);
    }
  }

  async specialites(req: Request, res: Response, next: NextFunction) {
    try {
      const specialites = await medecinService.getSpecialites();
      return res.status(200).json(ApiResponse.success(specialites));
    } catch (error) {
      next(error);
    }
  }

  async bySpecialite(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialite } = req.params;
      const medecins = await medecinService.findBySpecialite(specialite);
      return res.status(200).json(ApiResponse.success(medecins));
    } catch (error) {
      next(error);
    }
  }

  async publicCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const catalog = await medecinService.getPublicCatalog();
      return res.status(200).json(ApiResponse.success(catalog));
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const medecin = await medecinService.findByUserId(userId);
      return res.status(200).json(ApiResponse.success(medecin));
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const medecin = await medecinService.update(Number(id), req.body);
      return res.status(200).json(ApiResponse.success(medecin, 'Profil mis à jour'));
    } catch (error) {
      next(error);
    }
  }
}

export const medecinController = new MedecinController();
