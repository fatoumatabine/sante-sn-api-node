import { Router } from 'express';
import ordonnanceController from '../controllers/ordonnance.controller';
import { httpKernel } from '../../../kernel';
import {
  ConsultationIdParamSchema,
  PatientIdParamSchema,
  IdParamSchema,
  CreateOrdonnanceSchema,
  UpdateOrdonnanceSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ordonnances
 *   description: API de gestion des ordonnances
 */

router.get('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ordonnanceController.getAll);
router.get('/consultation/:consultationId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(ConsultationIdParamSchema), ordonnanceController.getByConsultationId);
router.get('/patient/:patientId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(PatientIdParamSchema), ordonnanceController.getByPatientId);
router.get('/:id/download', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), ordonnanceController.download);
router.get('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), ordonnanceController.getById);
router.post('/', ...httpKernel.allow('medecin'), ...httpKernel.body(CreateOrdonnanceSchema), ordonnanceController.create);
router.put('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdateOrdonnanceSchema), ordonnanceController.update);
router.delete('/:id', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), ordonnanceController.delete);

export default router;
