import { ModuleRouteContract } from '../../../kernel/route-contract';

export const consultationRouteContract: ModuleRouteContract = {
  module: 'consultation',
  basePath: '/api/v1/consultations',
  routes: [
    { method: 'GET', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'] },
    { method: 'GET', path: '/patient/:patientId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'PatientIdParamSchema' } },
    { method: 'GET', path: '/medecin/:medecinId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { params: 'MedecinIdParamSchema' } },
    { method: 'GET', path: '/:id/video-session', auth: 'roles', roles: ['admin', 'medecin', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/:id/video-session/presence', auth: 'roles', roles: ['admin', 'medecin', 'patient', 'secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/rendez-vous/:rendezVousId/start', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'RendezVousIdParamSchema' } },
    { method: 'POST', path: '/:id/video-session/start', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/:id/video-session/ping', auth: 'roles', roles: ['admin', 'medecin', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { body: 'CreateConsultationSchema' } },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { params: 'IdParamSchema', body: 'UpdateConsultationSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
  ],
};
