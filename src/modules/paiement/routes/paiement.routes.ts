import { Router } from 'express';
import paiementController from '../controllers/paiement.controller';
import { httpKernel } from '../../../kernel';
import {
  PatientIdParamSchema,
  RendezVousIdParamSchema,
  IdParamSchema,
  CreatePaiementSchema,
  InitiatePaiementSchema,
  PayPaiementSchema,
  UpdatePaiementSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Paiements
 *   description: API de gestion des paiements
 */

router.get('/', ...httpKernel.allow('admin', 'medecin', 'secretaire'), paiementController.getAll);
router.get('/patient/:patientId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(PatientIdParamSchema), paiementController.getByPatientId);
router.get('/rendez-vous/:rendezVousId', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(RendezVousIdParamSchema), paiementController.getByRendezVousId);
router.post('/webhooks/paydunya', ...httpKernel.public(), paiementController.paydunyaWebhook);
router.get('/:id/facture/download', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), paiementController.downloadFacture);
router.get('/:id', ...httpKernel.allow('admin', 'medecin', 'secretaire', 'patient'), ...httpKernel.params(IdParamSchema), paiementController.getById);
router.post('/initier', ...httpKernel.allow('patient'), ...httpKernel.body(InitiatePaiementSchema), paiementController.initiate);
router.post('/payer', ...httpKernel.allow('patient'), paiementController.simulate);
router.post('/:id/payer', ...httpKernel.allow('patient'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(PayPaiementSchema), paiementController.pay);
router.post('/', ...httpKernel.allow('admin', 'secretaire', 'patient'), ...httpKernel.body(CreatePaiementSchema), paiementController.create);
router.put('/:id', ...httpKernel.allow('admin', 'secretaire'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdatePaiementSchema), paiementController.update);
router.put('/:id/confirm', ...httpKernel.allow('admin', 'secretaire'), ...httpKernel.params(IdParamSchema), paiementController.confirm);
router.put('/:id/fail', ...httpKernel.allow('admin', 'secretaire'), ...httpKernel.params(IdParamSchema), paiementController.fail);
router.delete('/:id', ...httpKernel.allow('admin'), ...httpKernel.params(IdParamSchema), paiementController.delete);

export default router;
