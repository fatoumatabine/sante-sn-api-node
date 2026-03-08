import jwt from 'jsonwebtoken';
import { requireEnv } from './env';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  patientId?: number;
  medecinId?: number;
  secretaireId?: number;
}

export const generateTokens = (user: TokenPayload) => {
  const accessExpiresIn = (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'];
  const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  const jwtSecret = requireEnv('JWT_SECRET');
  const jwtRefreshSecret = requireEnv('JWT_REFRESH_SECRET');

  const accessToken = jwt.sign(
    user,
    jwtSecret,
    { expiresIn: accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    jwtRefreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, requireEnv('JWT_SECRET')) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { id: number } => {
  return jwt.verify(token, requireEnv('JWT_REFRESH_SECRET')) as { id: number };
};

export const generateNumeroRDV = (): string => {
  return `RDV-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
