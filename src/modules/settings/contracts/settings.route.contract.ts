import { ModuleRouteContract } from '../../../kernel/route-contract';

export const settingsRouteContract: ModuleRouteContract = {
  module: 'settings',
  basePath: '/api/v1/settings',
  routes: [
    { method: 'GET', path: '/public-site', auth: 'public' },
    { method: 'GET', path: '/app', auth: 'auth' },
    { method: 'GET', path: '/me', auth: 'auth' },
    { method: 'PUT', path: '/me', auth: 'auth', validations: { body: 'UpdateMySettingsSchema' } },
    { method: 'GET', path: '/admin', auth: 'roles', roles: ['admin'] },
    { method: 'PUT', path: '/admin', auth: 'roles', roles: ['admin'], validations: { body: 'UpdateAdminSettingsSchema' } },
    { method: 'DELETE', path: '/admin', auth: 'roles', roles: ['admin'] },
  ],
};
