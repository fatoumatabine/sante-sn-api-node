import { createHash, randomBytes } from 'crypto';
import { getResetTokenTtlMinutes } from '../../../config/env';

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generatePasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashPasswordResetToken(token);
  const ttlMinutes = getResetTokenTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

