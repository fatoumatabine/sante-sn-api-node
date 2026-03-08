import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { httpKernel } from '../../../kernel';
import {
  UpdatePatientProfileSchema,
  CreateTriageEvaluationSchema,
  TriageHistoryQuerySchema,
} from '../../../validations';

const router = Router();

// Toutes les routes patient nécessitent une authentification
router.use(...httpKernel.allow('patient'));

// Routes patient
router.get('/profile', (req, res, next) => patientController.getProfile(req, res, next));
router.put('/profile', ...httpKernel.body(UpdatePatientProfileSchema), (req, res, next) => patientController.updateProfile(req, res, next));
router.get('/triage-evaluations', ...httpKernel.query(TriageHistoryQuerySchema), (req, res, next) => patientController.getTriageHistory(req, res, next));
router.post('/triage-evaluations', ...httpKernel.body(CreateTriageEvaluationSchema), (req, res, next) => patientController.createTriageEvaluation(req, res, next));
router.get('/mes-rendez-vous', (req, res, next) => patientController.getMesRendezVous(req, res, next));
router.get('/mes-consultations', (req, res, next) => patientController.getMesConsultations(req, res, next));
router.get('/mes-paiements', (req, res, next) => patientController.getMesPaiements(req, res, next));
router.get('/dashboard/summary', (req, res, next) => patientController.getDashboardSummary(req, res, next));

export default router;
