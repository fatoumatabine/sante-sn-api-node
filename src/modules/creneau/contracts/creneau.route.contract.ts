import { ModuleRouteContract } from '../../../kernel/route-contract';

export const creneauRouteContract: ModuleRouteContract = {
  module: 'creneau',
  basePath: '/api/v1/creneaux',
  routes: [
    { method: 'GET', path: '/', auth: 'roles', roles: ['admin', 'secretaire'] },
    { method: 'GET', path: '/medecin/:medecinId', auth: 'auth', validations: { params: 'MedecinIdParamSchema' } },
    { method: 'GET', path: '/medecin/:medecinId/jour/:jour', auth: 'auth', validations: { params: 'MedecinJourParamSchema' } },
    { method: 'POST', path: '/', auth: 'roles', roles: ['admin', 'medecin'], validations: { body: 'CreateCreneauSchema' } },
    { method: 'POST', path: '/multiple', auth: 'roles', roles: ['admin', 'medecin'], validations: { body: 'CreateMultipleCreneauxSchema' } },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema', body: 'UpdateCreneauSchema' } },
    { method: 'PUT', path: '/:id/toggle', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
    { method: 'DELETE', path: '/:id', auth: 'roles', roles: ['admin', 'medecin'], validations: { params: 'IdParamSchema' } },
  ],
};
