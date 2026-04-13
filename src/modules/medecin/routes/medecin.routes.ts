import { Router } from 'express';
import { medecinController } from '../controllers/medecin.controller';
import { httpKernel } from '../../../kernel';
import { MedecinListQuerySchema, SpecialiteParamSchema, IdParamSchema, UpdateMedecinSchema } from '../../../validations';

const router = Router();

/**
 * @swagger
 * /api/v1/medecins:
 *   get:
 *     summary: Liste tous les médecins
 *     description: Retourne la liste de tous les médecins
 *     tags:
 *       - Médecins
 *     responses:
 *       200:
 *         description: Liste des médecins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Medecin'
 */
router.get('/', ...httpKernel.query(MedecinListQuerySchema), (req, res, next) => medecinController.index(req, res, next));

/**
 * @swagger
 * /api/v1/medecins/public/catalog:
 *   get:
 *     summary: Catalogue public des médecins et services
 *     description: Retourne des données publiques agrégées pour les pages marketing
 *     tags:
 *       - Médecins
 *     responses:
 *       200:
 *         description: Catalogue public
 */
router.get('/public/catalog', ...httpKernel.public(), (req, res, next) =>
  medecinController.publicCatalog(req, res, next)
);

/**
 * @swagger
 * /api/v1/medecins/specialites:
 *   get:
 *     summary: Liste les spécialités
 *     description: Retourne la liste de toutes les spécialités médicales
 *     tags:
 *       - Médecins
 *     responses:
 *       200:
 *         description: Liste des spécialités
 */
router.get('/specialites', ...httpKernel.public(), (req, res, next) => medecinController.specialites(req, res, next));

/**
 * @swagger
 * /api/v1/medecins/specialite/{specialite}:
 *   get:
 *     summary: Liste les médecins par spécialité
 *     description: Retourne la liste des médecins d'une spécialité donnée
 *     tags:
 *       - Médecins
 *     parameters:
 *       - in: path
 *         name: specialite
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des médecins
 */
router.get('/specialite/:specialite', ...httpKernel.params(SpecialiteParamSchema), (req, res, next) => medecinController.bySpecialite(req, res, next));

/**
 * @swagger
 * /api/v1/medecins/profile/me:
 *   get:
 *     summary: Profil du médecin connecté
 *     description: Retourne le profil du médecin actuellement connecté
 *     tags:
 *       - Médecins
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil du médecin
 */
router.get('/profile/me', ...httpKernel.allow('medecin'), (req, res, next) => 
  medecinController.getProfile(req, res, next)
);

/**
 * @swagger
 * /api/v1/medecins/{id}:
 *   get:
 *     summary: Détails d'un médecin
 *     description: Retourne les détails d'un médecin par son ID
 *     tags:
 *       - Médecins
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du médecin
 */
router.get('/:id', ...httpKernel.params(IdParamSchema), (req, res, next) => medecinController.show(req, res, next));

/**
 * @swagger
 * /api/v1/medecins/{id}:
 *   put:
 *     summary: Mettre à jour un médecin
 *     description: Met à jour les informations d'un médecin
 *     tags:
 *       - Médecins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               specialite:
 *                 type: string
 *               telephone:
 *                 type: string
 *               adresse:
 *                 type: string
 *               tarif_consultation:
 *                 type: number
 *     responses:
 *       200:
 *         description: Médecin mis à jour
 */
router.put('/:id', ...httpKernel.allow('medecin', 'admin'), ...httpKernel.params(IdParamSchema), ...httpKernel.body(UpdateMedecinSchema), (req, res, next) => 
  medecinController.update(req, res, next)
);

export default router;
