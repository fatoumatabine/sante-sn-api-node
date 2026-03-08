import { ModuleRouteContract } from '../../../kernel/route-contract';

export const patientRouteContract: ModuleRouteContract = {
  module: 'patient',
  basePath: '/api/v1/patient',
  routes: [
    { method: 'GET', path: '/profile', auth: 'roles', roles: ['patient'] },
    { method: 'PUT', path: '/profile', auth: 'roles', roles: ['patient'], validations: { body: 'UpdatePatientProfileSchema' } },
    { method: 'GET', path: '/triage-evaluations', auth: 'roles', roles: ['patient'], validations: { query: 'TriageHistoryQuerySchema' } },
    { method: 'POST', path: '/triage-evaluations', auth: 'roles', roles: ['patient'], validations: { body: 'CreateTriageEvaluationSchema' } },
    { method: 'GET', path: '/mes-rendez-vous', auth: 'roles', roles: ['patient'] },
    { method: 'GET', path: '/mes-consultations', auth: 'roles', roles: ['patient'] },
    { method: 'GET', path: '/mes-paiements', auth: 'roles', roles: ['patient'] },
    { method: 'GET', path: '/dashboard/summary', auth: 'roles', roles: ['patient'] },
  ],
};
