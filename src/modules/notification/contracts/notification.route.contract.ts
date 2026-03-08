import { ModuleRouteContract } from '../../../kernel/route-contract';

export const notificationRouteContract: ModuleRouteContract = {
  module: 'notification',
  basePath: '/api/v1/notifications',
  routes: [
    { method: 'GET', path: '/', auth: 'auth' },
    { method: 'GET', path: '/unread', auth: 'auth' },
    { method: 'GET', path: '/unread/count', auth: 'auth' },
    { method: 'POST', path: '/', auth: 'roles', roles: ['admin', 'medecin', 'secretaire'], validations: { body: 'CreateNotificationSchema' } },
    { method: 'PUT', path: '/:id/read', auth: 'auth', validations: { params: 'IdParamSchema' } },
    { method: 'PUT', path: '/read-all', auth: 'auth' },
    { method: 'DELETE', path: '/:id', auth: 'auth', validations: { params: 'IdParamSchema' } },
  ],
};
