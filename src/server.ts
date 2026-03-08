import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './config/cors';
import { validateRuntimeEnv } from './config/env';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { initializeContainer } from './shared/di/container';

// Import routes
import authRoutes from './modules/auth/routes/auth.routes';
import medecinRoutes from './modules/medecin/routes/medecin.routes';
import rendezVousRoutes from './modules/rendez-vous/routes/rendez-vous.routes';
import patientRoutes from './modules/patient/routes/patient.routes';
import adminRoutes from './modules/admin/routes/admin.routes';
import statsRoutes from './modules/stats/routes/stats.routes';
import secretaireRoutes from './modules/secretaire/routes/secretaire.routes';
import consultationRoutes from './modules/consultation/routes/consultation.routes';
import ordonnanceRoutes from './modules/ordonnance/routes/ordonnance.routes';
import paiementRoutes from './modules/paiement/routes/paiement.routes';
import prestationRoutes from './modules/prestation/routes/prestation.routes';
import notificationRoutes from './modules/notification/routes/notification.routes';
import creneauRoutes from './modules/creneau/routes/creneau.routes';
import settingsRoutes from './modules/settings/routes/settings.routes';
import chatRoutes from './modules/chat/routes/chat.routes';

const app = express();
const PORT = process.env.PORT || 3000;

validateRuntimeEnv();

// ==================== MIDDLEWARES ====================

// CORS
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== SWAGGER ====================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Santé SN',
      version: '1.0.0',
      description: 'API REST pour application de gestion médicale - Node.js/Express/Prisma',
      contact: {
        name: 'Support',
        email: 'support@santesn.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Santé SN est en ligne' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/medecins', medecinRoutes);
app.use('/api/v1/rendez-vous', rendezVousRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/secretaire', secretaireRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/ordonnances', ordonnanceRoutes);
app.use('/api/v1/paiements', paiementRoutes);
app.use('/api/v1/prestations', prestationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/creneaux', creneauRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/chat', chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
  });
});

// Error handling
app.use(errorMiddleware);

// ==================== SERVER ====================

// Initialize DI Container
initializeContainer();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🏥 API Santé SN - Serveur démarré                 ║
║                                                       ║
║   📍 URL: http://localhost:${PORT}                    ║
║   📚 Docs: http://localhost:${PORT}/api-docs          ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
