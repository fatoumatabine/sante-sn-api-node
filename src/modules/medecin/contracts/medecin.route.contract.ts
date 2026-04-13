import { ModuleRouteContract } from '../../../kernel/route-contract';

export const medecinRouteContract: ModuleRouteContract = {
  module: 'medecin',
  basePath: '/api/v1/medecins',
  routes: [
    { method: 'GET', path: '/', auth: 'public', validations: { query: 'MedecinListQuerySchema' } },
    { method: 'GET', path: '/public/catalog', auth: 'public' },
    { method: 'GET', path: '/specialites', auth: 'public' },
    { method: 'GET', path: '/specialite/:specialite', auth: 'public', validations: { params: 'SpecialiteParamSchema' } },
    { method: 'GET', path: '/:id', auth: 'public', validations: { params: 'IdParamSchema' } },
    { method: 'GET', path: '/profile/me', auth: 'roles', roles: ['medecin'] },
    { method: 'PUT', path: '/:id', auth: 'roles', roles: ['medecin', 'admin'], validations: { params: 'IdParamSchema', body: 'UpdateMedecinSchema' } },
  ],
};
