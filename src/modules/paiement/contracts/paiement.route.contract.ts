import { ModuleRouteContract } from '../../../kernel/route-contract';

export const paiementRouteContract: ModuleRouteContract = {
  module: 'paiement',
  basePath: '/api/v1/paiements',
  routes: [
    { method: 'GET', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'] },
    { method: 'GET', path: '/patient/:patientId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'PatientIdParamSchema' } },
    { method: 'GET', path: '/rendez-vous/:rendezVousId', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'RendezVousIdParamSchema' } },
    { method: 'GET', path: '/:id/facture/download', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'roles', roles: ['admin', 'medecin', 'secretaire', 'patient'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/initier', auth: 'roles', roles: ['patient'], validations: { body: 'InitiatePaiementSchema' } },
    { method: 'POST', path: '/:id/payer', auth: 'roles', roles: ['patient'], validations: { params: 'IdParamSchema', body: 'PayPaiementSchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['admin', 'secretaire', 'patient'], validations: { body: 'CreatePaiementSchema' } },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['admin', 'secretaire'], validations: { params: 'IdParamSchema', body: 'UpdatePaiementSchema' } },
    { method: 'PUT', path: '/:id/confirm', auth: 'roles', roles: ['admin', 'secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'PUT', path: '/:id/fail', auth: 'roles', roles: ['admin', 'secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'roles', roles: ['admin'], validations: { params: 'IdParamSchema' } },
  ],
};
