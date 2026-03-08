import { AppError, BadRequestError, UnauthorizedError } from '../../../shared/utils/AppError';
import { IAuthRepository } from '../repositories/IAuthRepository';
import { TokenPayload } from '../../../config/auth';
import { generateTokens } from '../../../config/auth';
import { getResetTokenTtlMinutes } from '../../../config/env';
import { Role } from '@prisma/client';
import { generatePasswordResetToken, hashPasswordResetToken } from '../utils/passwordReset';
import { mailerService } from '../../../shared/services/mailer.service';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
  prenom?: string;
  nom?: string;
  telephone?: string;
  specialite?: string;
  tarif_consultation?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: Role;
    patientId?: number;
    medecinId?: number;
    secretaireId?: number;
  };
  accessToken: string;
  refreshToken: string;
}

export class RegisterUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(input: RegisterInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !input.password || !input.name) {
      throw new BadRequestError('Email, mot de passe et nom requis');
    }

    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestError('Un utilisateur avec cet email existe déjà');
    }

    // Determine user name
    const userName = input.name || `${input.prenom || ''} ${input.nom || ''}`.trim();

    // Create user
    const user = await this.authRepository.createUser({
      email: normalizedEmail,
      password: input.password,
      name: userName,
      role: input.role || 'patient',
    });

    // Create role-specific profile
    if ((input.role === 'patient' || !input.role) && input.prenom && input.nom && input.telephone) {
      await this.authRepository.createPatient(user.id, {
        prenom: input.prenom,
        nom: input.nom,
        telephone: input.telephone,
      });
    } else if (input.role === 'medecin' && input.prenom && input.nom && input.telephone && input.specialite) {
      await this.authRepository.createMedecin(user.id, {
        prenom: input.prenom,
        nom: input.nom,
        telephone: input.telephone,
        specialite: input.specialite,
        tarif_consultation: input.tarif_consultation,
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
      },
      ...tokens,
    };
  }
}

export class LoginUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(input: LoginInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !input.password) {
      throw new BadRequestError('Email et mot de passe requis');
    }

    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    
    if (!user) {
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await this.authRepository.verifyPassword(input.password, user.password);
    
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
        patientId,
        medecinId,
        secretaireId,
      },
      ...tokens,
    };
  }
}

export class LogoutUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(userId: number): Promise<{ message: string }> {
    // In a real app, you might want to blacklist the token
    return { message: 'Déconnexion réussie' };
  }
}

export class ForgotPasswordUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestError('Email requis');
    }

    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    
    if (!user) {
      // Don't reveal if user exists
      return { message: 'Si cet email existe, un lien de réinitialisation sera envoyé' };
    }

    const { token, tokenHash, expiresAt } = generatePasswordResetToken();
    await this.authRepository.setResetToken(user.id, tokenHash, expiresAt);

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
      process.env.LOG_RESET_TOKEN === 'true' ||
      (process.env.NODE_ENV === 'development' && !sendResult.sent);

    if (shouldLogResetLink) {
      console.info(`[Auth] Password reset link for ${user.email}: ${resetLink}`);
    }

    if (!sendResult.sent) {
      console.warn('[Auth] Password reset email not sent:', sendResult.reason);
    }

    return { message: 'Si cet email existe, un lien de réinitialisation sera envoyé' };
  }
}

export class ResetPasswordUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || !newPassword) {
      throw new BadRequestError('Token et nouveau mot de passe requis');
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('Le mot de passe doit contenir au moins 8 caractères');
    }

    const tokenHash = hashPasswordResetToken(token);
    const user = await this.authRepository.findByResetToken(tokenHash, new Date());
    
    if (!user) {
      throw new BadRequestError('Token invalide ou expiré');
    }

    await this.authRepository.updatePassword(user.id, newPassword);
    await this.authRepository.clearResetToken(user.id);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}

export class RefreshTokenUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token requis');
    }

    try {
      const { verifyRefreshToken } = require('../../../config/auth');
      const { id } = verifyRefreshToken(refreshToken);
      
      const user = await this.authRepository.findUserById(id);
      
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

export class GetCurrentUserUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(userId: number): Promise<{
    id: number;
    email: string;
    name: string;
    role: Role;
    patientId?: number;
    medecinId?: number;
    secretaireId?: number;
  }> {
    const user = await this.authRepository.findUserByIdWithRelations(userId);
    
    if (!user) {
      throw new UnauthorizedError('Utilisateur non trouvé');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      patientId: user.patient?.id,
      medecinId: user.medecin?.id,
      secretaireId: user.secretaire?.id,
    };
  }
}
