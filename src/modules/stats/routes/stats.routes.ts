import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { httpKernel } from '../../../kernel';

const router = Router();

// Toutes les routes stats nécessitent une authentification
router.use(...httpKernel.allow('admin'));

// Routes stats
router.get('/dashboard', (req, res, next) => statsController.getDashboardStats(req, res, next));
router.get('/globales', (req, res, next) => statsController.getGlobalStats(req, res, next));
router.get('/graphiques', (req, res, next) => statsController.getGraphStats(req, res, next));

export default router;
