import { ModuleRouteContract } from '../../../kernel/route-contract';

export const ordonnanceRouteContract: ModuleRouteContract = {
  module: 'ordonnance',
  basePath: '/api/v1/ordonnances',
  routes: [
    { method: 'GET', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'] },
    { method: 'GET', path: '/consultation/:consultationId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'ConsultationIdParamSchema' } },
    { method: 'GET', path: '/patient/:patientId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'PatientIdParamSchema' } },
    { method: 'GET', path: '/:id/download', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['medecin'], validations: { body: 'CreateOrdonnanceSchema' } },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { params: 'IdParamSchema', body: 'UpdateOrdonnanceSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
  ],
};
