import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../../config/auth';
import { UnauthorizedError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token requis');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    const err = error as Error;
    if (err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Token invalide'));
    } else if (err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expiré'));
    } else {
      next(err);
    }
  }
};
