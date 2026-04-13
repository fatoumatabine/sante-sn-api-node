import bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/auth.repository';
import { generateTokens, TokenPayload } from '../../../config/auth';
import { AppError, BadRequestError, UnauthorizedError } from '../../../shared/utils/AppError';
import { Role } from '@prisma/client';
import { generatePasswordResetToken, hashPasswordResetToken } from '../utils/passwordReset';
import { getResetTokenTtlMinutes } from '../../../config/env';
import { mailerService } from '../../../shared/services/mailer.service';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
    prenom?: string;
    nom?: string;
    telephone?: string;
    specialite?: string;
    tarif_consultation?: number;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestError('Un utilisateur avec cet email existe déjà');
    }

    // For patient registration, use the name as-is
    const userName = data.name || `${data.prenom || ''} ${data.nom || ''}`.trim();

    // Create user
    const user = await authRepository.createUser({
      email: normalizedEmail,
      password: data.password,
      name: userName,
      role: data.role || 'patient',
    });

    // Create role-specific profile
    if ((data.role === 'patient' || !data.role) && data.prenom && data.nom && data.telephone) {
      await authRepository.createPatient(user.id, {
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
      });
    } else if (data.role === 'medecin' && data.prenom && data.nom && data.telephone && data.specialite) {
      await authRepository.createMedecin(user.id, {
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
        specialite: data.specialite,
        tarif_consultation: data.tarif_consultation,
      });
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokens(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(normalizedEmail);
    
    if (!user) {
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    // Load role-specific data
    let patientId: number | undefined;
    let medecinId: number | undefined;
    let secretaireId: number | undefined;

    if (user.patient) {
      patientId = user.patient.id;
    }
    if (user.medecin) {
      medecinId = user.medecin.id;
    }
    if (user.secretaire) {
      secretaireId = user.secretaire.id;
    }

    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      patientId,
      medecinId,
      secretaireId,
    };

    const tokens = generateTokens(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        patientId,
        medecinId,
        secretaireId,
      },
      ...tokens,
    };
  }

  async logout(userId: number) {
    // In a real app, you might want to blacklist the token
    return { message: 'Déconnexion réussie' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const debugModeEnabled =
      process.env.LOG_RESET_TOKEN === 'true' ||
      process.env.NODE_ENV !== 'production';
    const user = await authRepository.findUserByEmail(normalizedEmail);
    
    if (!user) {
      // Don't reveal if user exists
      return { message: 'Si cet email existe, un lien de réinitialisation sera envoyé' };
    }

    const { token, tokenHash, expiresAt } = generatePasswordResetToken();
    await authRepository.setResetToken(user.id, tokenHash, expiresAt);

    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const fallbackPath = '/auth/reset-password';
    const resetLink = baseUrl
      ? `${baseUrl}${fallbackPath}?token=${token}`
      : `${fallbackPath}?token=${token}`;

    const sendResult = await mailerService.sendPasswordResetEmail({
      to: user.email,
      resetLink,
      expiresInMinutes: getResetTokenTtlMinutes(),
    });

    const shouldLogResetLink =
      debugModeEnabled ||
      (!sendResult.sent && process.env.NODE_ENV === 'development');

    if (shouldLogResetLink) {
      console.info(`[Auth] Password reset link for ${user.email}: ${resetLink}`);
    }

    if (!sendResult.sent) {
      console.warn('[Auth] Password reset email not sent:', sendResult.reason);
    }

    return { message: 'Si cet email existe, un lien de réinitialisation sera envoyé' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashPasswordResetToken(token);
    const user = await authRepository.findByResetToken(tokenHash, new Date());
    
    if (!user) {
      throw new BadRequestError('Token invalide ou expiré');
    }

    await authRepository.updatePassword(user.id, newPassword);
    await authRepository.clearResetToken(user.id);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const { id } = require('../../../config/auth').verifyRefreshToken(refreshToken);
      const user = await authRepository.findUserById(id);
      
      if (!user) {
        throw new UnauthorizedError('Utilisateur non trouvé');
      }

      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const tokens = generateTokens(tokenPayload);
      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Token de refresh invalide');
    }
  }
}

export const authService = new AuthService();
