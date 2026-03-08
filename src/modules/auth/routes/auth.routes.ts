import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { httpKernel } from '../../../kernel';
import {
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RegisterPatientSchema,
  RefreshTokenSchema,
  UpdateMeSchema,
  ChangePasswordSchema,
} from '../../../validations';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Inscription d'un patient
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *               - prenom
 *               - nom
 *               - telephone
 *             properties:
 *               email:
 *                 type: string
 *                 example: utilisateur@gmail.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [patient]
 *               prenom:
 *                 type: string
 *               nom:
 *                 type: string
 *               telephone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inscription réussie
 *       400:
 *         description: Erreur de validation
 */
router.post('/register', ...httpKernel.body(RegisterPatientSchema), (req, res, next) => 
  authController.register(req, res, next)
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', ...httpKernel.body(LoginSchema), (req, res, next) => 
  authController.login(req, res, next)
);

router.post('/forgot-password', ...httpKernel.body(ForgotPasswordSchema), (req, res, next) => 
  authController.forgotPassword(req, res, next)
);

router.post('/reset-password', ...httpKernel.body(ResetPasswordSchema), (req, res, next) => 
  authController.resetPassword(req, res, next)
);

router.post('/refresh-token', ...httpKernel.body(RefreshTokenSchema), (req, res, next) => 
  authController.refreshToken(req, res, next)
);

// Protected routes
router.get('/me', ...httpKernel.auth(), (req, res, next) => 
  authController.me(req, res, next)
);

router.put('/me', ...httpKernel.auth(), ...httpKernel.body(UpdateMeSchema), (req, res, next) =>
  authController.updateMe(req, res, next)
);

router.put('/change-password', ...httpKernel.auth(), ...httpKernel.body(ChangePasswordSchema), (req, res, next) =>
  authController.changePassword(req, res, next)
);

router.post('/logout', ...httpKernel.auth(), (req, res, next) => 
  authController.logout(req, res, next)
);

export default router;
