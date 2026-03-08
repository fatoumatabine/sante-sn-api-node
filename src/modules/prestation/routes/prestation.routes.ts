import { Router } from 'express';
import prestationController from '../controllers/prestation.controller';
import { httpKernel } from '../../../kernel';
import {
  PatientIdParamSchema,
  ConsultationIdParamSchema,
  IdParamSchema,
  CreatePrestationSchema,
  UpdatePrestationSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Prestations
 *   description: API de gestion des prestations
 */

router.get('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), prestationController.getAll);
router.get('/patient/:patientId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(PatientIdParamSchema), prestationController.getByPatientId);
router.get('/consultation/:consultationId', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.params(ConsultationIdParamSchema), prestationController.getByConsultationId);
router.get('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), prestationController.getById);
router.post('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.body(CreatePrestationSchema), prestationController.create);
router.put('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdatePrestationSchema), prestationController.update);
router.delete('/:id', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), prestationController.delete);

export default router;
