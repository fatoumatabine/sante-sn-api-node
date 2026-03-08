import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { httpKernel } from '../../../kernel';
import { IdParamSchema, CreateNotificationSchema } from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API de gestion des notifications
 */

// Routes protégées - nécessite authentification
router.get('/', ...httpKernel.auth(), (req, res, next) =>
  notificationController.getByUserId(req, res, next)
);
router.get('/unread', ...httpKernel.auth(), (req, res, next) =>
  notificationController.getUnread(req, res, next)
);
router.get('/unread/count', ...httpKernel.auth(), (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);
router.post('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.body(CreateNotificationSchema), (req, res, next) =>
  notificationController.create(req, res, next)
);
router.put('/:id/read', ...httpKernel.auth(), ...httpKernel.params(IdParamSchema), (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);
router.put('/read-all', ...httpKernel.auth(), (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);
router.delete('/:id', ...httpKernel.auth(), ...httpKernel.params(IdParamSchema), (req, res, next) =>
  notificationController.delete(req, res, next)
);

export default router;
