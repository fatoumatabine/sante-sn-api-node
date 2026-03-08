import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../utils/AppError';

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Non authentifié'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Accès refusé. Rôle requis: ' + roles.join(', ')));
    }

    next();
  };
};
