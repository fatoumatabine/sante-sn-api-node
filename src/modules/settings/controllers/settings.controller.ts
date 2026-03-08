import { Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import { settingsService } from '../services/settings.service';

export class SettingsController {
  async getAppSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getAdminSettings();
      return res.json(ApiResponse.success(settings));
    } catch (error) {
      next(error);
    }
  }

  async getAdminSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getAdminSettings();
      return res.json(ApiResponse.success(settings));
    } catch (error) {
      next(error);
    }
  }

  async updateAdminSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await settingsService.updateAdminSettings(req.body);
      return res.json(ApiResponse.success(updated, 'Paramètres admin mis à jour'));
    } catch (error) {
      next(error);
    }
  }

  async resetAdminSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = await settingsService.resetAdminSettings();
      return res.json(ApiResponse.success(payload, 'Paramètres admin réinitialisés'));
    } catch (error) {
      next(error);
    }
  }

  async getMySettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const settings = await settingsService.getUserSettings(userId);
      return res.json(ApiResponse.success(settings));
    } catch (error) {
      next(error);
    }
  }

  async updateMySettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé'));
      }

      const updated = await settingsService.updateUserSettings(userId, req.body);
      return res.json(ApiResponse.success(updated, 'Préférences mises à jour'));
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
