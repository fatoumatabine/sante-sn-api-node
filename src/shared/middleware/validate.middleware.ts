import { ZodSchema } from 'zod';
import {
  validateBody,
  validateParams as validateParamsMiddleware,
  validateQuery as validateQueryMiddleware,
} from './validation.middleware';

// Legacy compatibility wrapper used by existing routes.
export const validate = (schema: ZodSchema) => validateBody(schema);
export const validateParams = (schema: ZodSchema) => validateParamsMiddleware(schema);
export const validateQuery = (schema: ZodSchema) => validateQueryMiddleware(schema);
