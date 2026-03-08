import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { authenticate } from '../shared/middleware/auth.middleware';
import { authorize } from '../shared/middleware/roles.middleware';
import {
  validateBody,
  validateParams as validateParamsMiddleware,
  validateQuery as validateQueryMiddleware,
} from '../shared/middleware/validation.middleware';

type Role = 'patient' | 'medecin' | 'secretaire' | 'admin' | string;

const asHandler = (handler: unknown): RequestHandler => handler as RequestHandler;

export const httpKernel = {
  public(): RequestHandler[] {
    return [];
  },

  auth(): RequestHandler[] {
    return [asHandler(authenticate)];
  },

  allow(...roles: Role[]): RequestHandler[] {
    return [asHandler(authenticate), asHandler(authorize(...roles))];
  },

  body<T>(schema: ZodSchema<T>): RequestHandler[] {
    return [asHandler(validateBody(schema))];
  },

  params<T>(schema: ZodSchema<T>): RequestHandler[] {
    return [asHandler(validateParamsMiddleware(schema))];
  },

  query<T>(schema: ZodSchema<T>): RequestHandler[] {
    return [asHandler(validateQueryMiddleware(schema))];
  },

  secureBody<T>(schema: ZodSchema<T>, ...roles: Role[]): RequestHandler[] {
    return [...httpKernel.allow(...roles), ...httpKernel.body(schema)];
  },
};
