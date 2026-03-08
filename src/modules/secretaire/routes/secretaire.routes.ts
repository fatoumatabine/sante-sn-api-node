import { Router } from 'express';
import { secretaireController } from '../controllers/secretaire.controller';
import { httpKernel } from '../../../kernel';
import { IdParamSchema, SecretaireActionReasonSchema } from '../../../validations';

const router = Router();

// Toutes les routes secretaire nécessitent une authentification
router.use(...httpKernel.allow('secretaire'));

// Dashboard secretaire
router.get('/dashboard/appointments/all', (req, res, next) => secretaireController.getAllAppointments(req, res, next));
router.get('/dashboard/demandes', (req, res, next) => secretaireController.getDemandesRDV(req, res, next));
router.get('/dashboard/patients', (req, res, next) => secretaireController.getPatients(req, res, next));
router.get('/dashboard/medecins', (req, res, next) => secretaireController.getMedecins(req, res, next));
router.get('/dashboard/stats', (req, res, next) => secretaireController.getStats(req, res, next));

// Rendez-vous actions
router.put('/rendez-vous/:id/valider', ...httpKernel.params(IdParamSchema), (req, res, next) => secretaireController.validerRendezVous(req, res, next));
router.put('/rendez-vous/:id/rejeter', ...httpKernel.params(IdParamSchema), ...httpKernel.body(SecretaireActionReasonSchema), (req, res, next) => secretaireController.rejeterRendezVous(req, res, next));
router.put('/rendez-vous/:id/annuler', ...httpKernel.params(IdParamSchema), ...httpKernel.body(SecretaireActionReasonSchema), (req, res, next) => secretaireController.annulerRendezVous(req, res, next));
router.put('/rendez-vous/:id/confirmer', ...httpKernel.params(IdParamSchema), (req, res, next) => secretaireController.confirmerRendezVous(req, res, next));

// Demandes RDV
router.get('/demandes/:id/disponibilite', ...httpKernel.params(IdParamSchema), (req, res, next) => secretaireController.getDisponibiliteDemande(req, res, next));
router.put('/demandes/:id/valider', ...httpKernel.params(IdParamSchema), (req, res, next) => secretaireController.validerDemande(req, res, next));
router.put('/demandes/:id/rejeter', ...httpKernel.params(IdParamSchema), ...httpKernel.body(SecretaireActionReasonSchema), (req, res, next) => secretaireController.rejeterDemande(req, res, next));
router.post('/demandes/:id/approuver', ...httpKernel.params(IdParamSchema), (req, res, next) => secretaireController.validerDemande(req, res, next));
router.post('/demandes/:id/refuser', ...httpKernel.params(IdParamSchema), ...httpKernel.body(SecretaireActionReasonSchema), (req, res, next) => secretaireController.rejeterDemande(req, res, next));

export default router;
