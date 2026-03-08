import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { httpKernel } from '../../../kernel';
import {
  AdminArchivesQuerySchema,
  RestoreArchiveParamsSchema,
  AdminEntityIdParamSchema,
  CreateAdminMedecinSchema,
  UpdateAdminMedecinSchema,
  CreateAdminSecretaireSchema,
  UpdateAdminSecretaireSchema,
  CreateAdminPatientSchema,
  UpdateAdminPatientSchema,
} from '../../../validations';

const router = Router();

// Toutes les routes admin nécessitent une authentification
router.use(...httpKernel.allow('admin'));

// Routes admin - List
router.get('/medecins', (req, res, next) => adminController.getMedecins(req, res, next));
router.get('/secretaires', (req, res, next) => adminController.getSecretaires(req, res, next));
router.get('/patients', (req, res, next) => adminController.getPatients(req, res, next));
router.get('/stats', (req, res, next) => adminController.getStats(req, res, next));
router.get('/archives', ...httpKernel.query(AdminArchivesQuerySchema), (req, res, next) => adminController.getArchives(req, res, next));
router.post('/archives/:type/:id/restore', ...httpKernel.params(RestoreArchiveParamsSchema), (req, res, next) => adminController.restoreArchive(req, res, next));

// Routes admin - CRUD (avec /admin prefix pour le frontend)
router.post('/medecins', ...httpKernel.body(CreateAdminMedecinSchema), (req, res, next) => adminController.createMedecin(req, res, next));
router.put('/medecins/:id', ...httpKernel.params(AdminEntityIdParamSchema), ...httpKernel.body(UpdateAdminMedecinSchema), (req, res, next) => adminController.updateMedecin(req, res, next));
router.delete('/medecins/:id', ...httpKernel.params(AdminEntityIdParamSchema), (req, res, next) => adminController.deleteMedecin(req, res, next));

router.post('/secretaires', ...httpKernel.body(CreateAdminSecretaireSchema), (req, res, next) => adminController.createSecretaire(req, res, next));
router.put('/secretaires/:id', ...httpKernel.params(AdminEntityIdParamSchema), ...httpKernel.body(UpdateAdminSecretaireSchema), (req, res, next) => adminController.updateSecretaire(req, res, next));
router.delete('/secretaires/:id', ...httpKernel.params(AdminEntityIdParamSchema), (req, res, next) => adminController.deleteSecretaire(req, res, next));

router.post('/patients', ...httpKernel.body(CreateAdminPatientSchema), (req, res, next) => adminController.createPatient(req, res, next));
router.put('/patients/:id', ...httpKernel.params(AdminEntityIdParamSchema), ...httpKernel.body(UpdateAdminPatientSchema), (req, res, next) => adminController.updatePatient(req, res, next));
router.delete('/patients/:id', ...httpKernel.params(AdminEntityIdParamSchema), (req, res, next) => adminController.deletePatient(req, res, next));

export default router;
