import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { httpKernel } from '../../../kernel';
import { UpdateMySettingsSchema, UpdateAdminSettingsSchema } from '../../../validations';

const router = Router();

router.get('/app', ...httpKernel.auth(), (req, res, next) => settingsController.getAppSettings(req, res, next));

router.get('/me', ...httpKernel.auth(), (req, res, next) => settingsController.getMySettings(req, res, next));
router.put('/me', ...httpKernel.auth(), ...httpKernel.body(UpdateMySettingsSchema), (req, res, next) => settingsController.updateMySettings(req, res, next));

router.get('/admin', ...httpKernel.allow('admin'), (req, res, next) =>
  settingsController.getAdminSettings(req, res, next)
);
router.put('/admin', ...httpKernel.allow('admin'), ...httpKernel.body(UpdateAdminSettingsSchema), (req, res, next) =>
  settingsController.updateAdminSettings(req, res, next)
);
router.delete('/admin', ...httpKernel.allow('admin'), (req, res, next) =>
  settingsController.resetAdminSettings(req, res, next)
);

export default router;
