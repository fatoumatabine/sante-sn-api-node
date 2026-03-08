import { ModuleRouteContract } from '../../../kernel/route-contract';

export const adminRouteContract: ModuleRouteContract = {
  module: 'admin',
  basePath: '/api/v1/admin',
  routes: [
    { method: 'GET', path: '/medecins', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/secretaires', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/patients', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/stats', auth: 'roles', roles: ['admin'] },
    { method: 'GET', path: '/archives', auth: 'roles', roles: ['admin'], validations: { query: 'AdminArchivesQuerySchema' } },
    { method: 'POST', path: '/archives/:type/:id/restore', auth: 'roles', roles: ['admin'], validations: { params: 'RestoreArchiveParamsSchema' } },
    { method: 'POST', path: '/medecins', auth: 'roles', roles: ['admin'], validations: { body: 'CreateAdminMedecinSchema' } },
    { method: 'PUT', path: '/medecins/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema', body: 'UpdateAdminMedecinSchema' } },
    { method: 'DELETE', path: '/medecins/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema' } },
    { method: 'POST', path: '/secretaires', auth: 'roles', roles: ['admin'], validations: { body: 'CreateAdminSecretaireSchema' } },
    { method: 'PUT', path: '/secretaires/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema', body: 'UpdateAdminSecretaireSchema' } },
    { method: 'DELETE', path: '/secretaires/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema' } },
    { method: 'POST', path: '/patients', auth: 'roles', roles: ['admin'], validations: { body: 'CreateAdminPatientSchema' } },
    { method: 'PUT', path: '/patients/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema', body: 'UpdateAdminPatientSchema' } },
    { method: 'DELETE', path: '/patients/:id', auth: 'roles', roles: ['admin'], validations: { params: 'AdminEntityIdParamSchema' } },
  ],
};
