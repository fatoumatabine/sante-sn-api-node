import { Router } from 'express';
import creneauController from '../controllers/creneau.controller';
import { httpKernel } from '../../../kernel';
import {
  MedecinIdParamSchema,
  MedecinJourParamSchema,
  IdParamSchema,
  CreateCreneauSchema,
  CreateMultipleCreneauxSchema,
  UpdateCreneauSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Crénaux
 *   description: API de gestion des créneaux disponibles
 */

router.get('/', ...httpKernel.allow('admin', 'secretaire'), creneauController.getAll);
router.get('/medecin/:medecinId', ...httpKernel.auth(), ...httpKernel.params(MedecinIdParamSchema), creneauController.getByMedecinId);
router.get('/medecin/:medecinId/jour/:jour', ...httpKernel.auth(), ...httpKernel.params(MedecinJourParamSchema), creneauController.getByMedecinIdAndDay);
router.post('/', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.body(CreateCreneauSchema), creneauController.create);
router.post('/multiple', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.body(CreateMultipleCreneauxSchema), creneauController.createMultiple);
router.put('/:id', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdateCreneauSchema), creneauController.update);
router.put('/:id/toggle', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), creneauController.toggleActive);
router.delete('/:id', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), creneauController.delete);

export default router;
