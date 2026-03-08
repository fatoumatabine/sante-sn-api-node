import { ModuleRouteContract } from '../../../kernel/route-contract';

export const prestationRouteContract: ModuleRouteContract = {
  module: 'prestation',
  basePath: '/api/v1/prestations',
  routes: [
    { method: 'GET', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'] },
    { method: 'GET', path: '/patient/:patientId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'PatientIdParamSchema' } },
    { method: 'GET', path: '/consultation/:consultationId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { params: 'ConsultationIdParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { body: 'CreatePrestationSchema' } },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { params: 'IdParamSchema', body: 'UpdatePrestationSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
  ],
};
