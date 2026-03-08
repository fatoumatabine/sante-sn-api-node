import { ModuleRouteContract } from '../../../kernel/route-contract';

export const rendezVousRouteContract: ModuleRouteContract = {
  module: 'rendez-vous',
  basePath: '/api/v1/rendez-vous',
  routes: [
    { method: 'GET', path: '/creneaux-disponibles', auth: 'public', validations: { query: 'CreneauxDisponiblesQuerySchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['patient'], validations: { body: 'CreateRendezVousSchema' } },
    { method: 'GET', path: '/mes-rdv', auth: 'roles', roles: ['patient'] },
    { method: 'GET', path: '/medecin/list', auth: 'roles', roles: ['medecin'] },
    { method: 'POST', path: '/:id/confirmer', auth: 'roles', roles: ['secretaire'], validations: { params: 'IdParamSchema' } },
    { method: 'POST', path: '/:id/payer', auth: 'roles', roles: ['patient'], validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'auth', validations: { params: 'IdParamSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'auth', validations: { params: 'IdParamSchema', body: 'AnnulerRendezVousBodySchema' } },
  ],
};
