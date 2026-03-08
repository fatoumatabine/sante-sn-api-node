import { ModuleRouteContract } from '../../../kernel/route-contract';

export const statsRouteContract: ModuleRouteContract = {
  module: 'stats',
  basePath: '/api/v1/stats',
  routes: [
    { method: 'GET', path: '/dashboard', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/globales', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/graphiques', auth: 'roles', roles: ['admin'] },
  ],
};
