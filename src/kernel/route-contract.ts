export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RouteAuthPolicy = 'public' | 'auth' | 'roles';

export interface RouteValidationRefs {
  params?: string;
  query?: string;
  body?: string;
}

export interface RouteContractEntry {
  method: HttpMethod;
  path: string;
  auth: RouteAuthPolicy;
  roles?: readonly string[];
  validations?: RouteValidationRefs;
}

export interface ModuleRouteContract {
  module: string;
  basePath: string;
  routes: readonly RouteContractEntry[];
}
