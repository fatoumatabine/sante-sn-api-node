import { Router } from 'express';
import consultationController from '../controllers/consultation.controller';
import { httpKernel } from '../../../kernel';
import {
  PatientIdParamSchema,
  MedecinIdParamSchema,
  IdParamSchema,
  RendezVousIdParamSchema,
  CreateConsultationSchema,
  UpdateConsultationSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Consultations
 *   description: API de gestion des consultations
 */

// Routes protégées - seul le personnel médical peut accéder
router.get('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), consultationController.getAll);
router.get('/patient/:patientId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(PatientIdParamSchema), consultationController.getByPatientId);
router.get('/medecin/:medecinId', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.params(MedecinIdParamSchema), consultationController.getByMedecinId);
router.get('/:id/video-session', ...httpKernel.allow('admin', 'medecin', 'patient'), ...httpKernel.params(IdParamSchema), consultationController.getVideoSession);
router.get('/:id/video-session/presence', ...httpKernel.allow('admin', 'medecin', 'patient', 'secretaire'), ...httpKernel.params(IdParamSchema), consultationController.getVideoPresence);
router.get('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), consultationController.getById);
router.post('/rendez-vous/:rendezVousId/start', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(RendezVousIdParamSchema), consultationController.startFromRendezVous);
router.post('/:id/video-session/start', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), consultationController.startVideoSession);
router.post('/:id/video-session/ping', ...httpKernel.allow('admin', 'medecin', 'patient'), ...httpKernel.params(IdParamSchema), consultationController.pingVideoPresence);
router.post('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.body(CreateConsultationSchema), consultationController.create);
router.put('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdateConsultationSchema), consultationController.update);
router.delete('/:id', ...httpKernel.allow('admin', 'medecin'), ...httpKernel.params(IdParamSchema), consultationController.delete);

export default router;
