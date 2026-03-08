import { ModuleRouteContract } from '../../../kernel/route-contract';

export const authRouteContract: ModuleRouteContract = {
  module: 'auth',
  basePath: '/api/v1/auth',
  routes: [
    { method: 'POST', path: '/register', auth: 'public', validations: { body: 'RegisterPatientSchema' } },
    { method: 'POST', path: '/login', auth: 'public', validations: { body: 'LoginSchema' } },
    { method: 'POST', path: '/forgot-password', auth: 'public', validations: { body: 'ForgotPasswordSchema' } },
    { method: 'POST', path: '/reset-password', auth: 'public', validations: { body: 'ResetPasswordSchema' } },
    { method: 'POST', path: '/refresh-token', auth: 'public', validations: { body: 'RefreshTokenSchema' } },
    { method: 'GET', path: '/me', auth: 'auth' },
    { method: 'PUT', path: '/me', auth: 'auth', validations: { body: 'UpdateMeSchema' } },
    { method: 'PUT', path: '/change-password', auth: 'auth', validations: { body: 'ChangePasswordSchema' } },
    { method: 'POST', path: '/logout', auth: 'auth' },
  ],
};
