import { ModuleRouteContract } from '../../../kernel/route-contract';

export const secretaireRouteContract: ModuleRouteContract = {
  module: 'secretaire',
  basePath: '/api/v1/secretaire',
  routes: [
    { method: 'GET', path: '/dashboard/appointments/all', auth: 'roles', roles: ['secretaire'] },
    { method: 'GET', path: '/dashboard/demandes', auth: 'roles', roles: ['secretaire'] },
    { method: 'GET', path: '/dashboard/patients', auth: 'roles', roles: ['secretaire'] },
    { method: 'GET', path: '/dashboard/medecins', auth: 'roles', roles: ['secretaire'] },
    { method: 'GET', path: '/dashboard/stats', auth: 'roles', roles: ['secretaire'] },
    { method: 'PUT', path: '/rendez-vous/:id/valider', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'PUT', path: '/rendez-vous/:id/rejeter', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema', body: 'SecretaireActionReasonSchema' } },
    { method: 'PUT', path: '/rendez-vous/:id/annuler', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema', body: 'SecretaireActionReasonSchema' } },
    { method: 'PUT', path: '/rendez-vous/:id/confirmer', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/demandes/:id/disponibilite', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'PUT', path: '/demandes/:id/valider', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'PUT', path: '/demandes/:id/rejeter', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema', body: 'SecretaireActionReasonSchema' } },
    { method: 'POST', path: '/demandes/:id/approuver', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/demandes/:id/refuser', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema', body: 'SecretaireActionReasonSchema' } },
  ],
};
