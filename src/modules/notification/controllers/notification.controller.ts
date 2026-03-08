import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { NotificationService } from '../services/notification.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await this.notificationService.findAll();
      return res.status(200).json(ApiResponse.success(notifications, 'Notifications récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByUserId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      const notifications = await this.notificationService.findByUserId(userId);
      return res.status(200).json(ApiResponse.success(notifications, 'Notifications récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getUnread(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      const notifications = await this.notificationService.findUnreadByUserId(userId);
      return res.status(200).json(ApiResponse.success(notifications, 'Notifications non lues récupérées avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      const count = await this.notificationService.getUnreadCount(userId);
      return res.status(200).json(ApiResponse.success({ count }, 'Nombre de notifications non lues récupéré'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await this.notificationService.create(req.body);
      return res.status(201).json(ApiResponse.created(notification, 'Notification créée avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      const notification = await this.notificationService.markAsRead(id, userId);
      return res.status(200).json(ApiResponse.success(notification, 'Notification marquée comme lue'));
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      await this.notificationService.markAllAsRead(userId);
      return res.status(200).json(ApiResponse.success(null, 'Toutes les notifications marquées comme lues'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      await this.notificationService.delete(id, userId);
      return res.status(200).json(ApiResponse.success(null, 'Notification archivée avec succès'));
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
