import { Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class StatsController {
  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await statsService.getDashboardStats();
      return res.json(ApiResponse.success(stats));
    } catch (error) {
      next(error);
    }
  }

  async getGlobalStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await statsService.getGlobalStats();
      return res.json(ApiResponse.success(stats));
    } catch (error) {
      next(error);
    }
  }

  async getGraphStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await statsService.getGraphStats();
      return res.json(ApiResponse.success(stats));
    } catch (error) {
      next(error);
    }
  }
}

export const statsController = new StatsController();
