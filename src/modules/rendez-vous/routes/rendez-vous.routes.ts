import { Router } from 'express';
import { rendezVousController } from '../controllers/rendez-vous.controller';
import { httpKernel } from '../../../kernel';
import {
  CreateRendezVousSchema,
  CreneauxDisponiblesQuerySchema,
  IdParamSchema,
  AnnulerRendezVousBodySchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * /api/v1/rendez-vous/creneaux-disponibles:
 *   get:
 *     summary: Liste les créneaux disponibles
 *     description: Retourne les créneaux disponibles pour un médecin à une date donnée
 *     tags:
 *       - Rendez-vous
 *     parameters:
 *       - in: query
 *         name: medecinId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Liste des créneaux disponibles
 */
router.get('/creneaux-disponibles', ...httpKernel.query(CreneauxDisponiblesQuerySchema), (req, res, next) => 
  rendezVousController.getCreneauxDisponibles(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous:
 *   post:
 *     summary: Créer un rendez-vous
 *     description: Crée un nouveau rendez-vous pour un patient
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medecinId
 *               - date
 *               - heure
 *               - type
 *             properties:
 *               medecinId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               heure:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [en_ligne, presentiel, prestation]
 *               motif:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rendez-vous créé
 */
router.post(
  '/',
  ...httpKernel.secureBody(CreateRendezVousSchema, 'patient'),
  (req, res, next) => rendezVousController.create(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/mes-rdv:
 *   get:
 *     summary: Liste mes rendez-vous
 *     description: Retourne la liste des rendez-vous du patient connecté
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des rendez-vous
 */
router.get(
  '/mes-rdv',
  ...httpKernel.allow('patient'),
  (req, res, next) => rendezVousController.mesRendezVous(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/medecin/list:
 *   get:
 *     summary: Liste les rendez-vous du médecin
 *     description: Retourne la liste des rendez-vous d'un médecin
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des rendez-vous
 */
router.get(
  '/medecin/list',
  ...httpKernel.allow('medecin'),
  (req, res, next) => rendezVousController.medecinList(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/{id}/confirmer:
 *   post:
 *     summary: Confirmer un rendez-vous
 *     description: Confirme un rendez-vous par une secrétaire
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rendez-vous confirmé
 */
router.post(
  '/:id/confirmer',
  ...httpKernel.allow('secretaire'),
  ...httpKernel.params(IdParamSchema),
  (req, res, next) => rendezVousController.confirmer(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/{id}/payer:
 *   post:
 *     summary: Payer un rendez-vous
 *     description: Marque un rendez-vous comme payé
 *     tags:
 *       - Rendez-vous
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
 *             required:
 *               - methode
 *             properties:
 *               methode:
 *                 type: string
 *                 enum: [Espèces, Mobile Money, Carte bancaire]
 *     responses:
 *       200:
 *         description: Rendez-vous payé
 */
router.post(
  '/:id/payer',
  ...httpKernel.allow('patient'),
  ...httpKernel.params(IdParamSchema),
  (req, res, next) => rendezVousController.payer(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/{id}:
 *   get:
 *     summary: Détails d'un rendez-vous
 *     description: Retourne les détails d'un rendez-vous par son ID
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du rendez-vous
 */
router.get(
  '/:id',
  ...httpKernel.auth(),
  ...httpKernel.params(IdParamSchema),
  (req, res, next) => rendezVousController.findById(req, res, next)
);

/**
 * @swagger
 * /api/v1/rendez-vous/{id}:
 *   delete:
 *     summary: Annuler un rendez-vous
 *     description: Annule un rendez-vous
 *     tags:
 *       - Rendez-vous
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               raison_refus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rendez-vous annulé
 */
router.delete(
  '/:id',
  ...httpKernel.auth(),
  ...httpKernel.params(IdParamSchema),
  ...httpKernel.body(AnnulerRendezVousBodySchema),
  (req, res, next) => rendezVousController.annuler(req, res, next)
);

export default router;
