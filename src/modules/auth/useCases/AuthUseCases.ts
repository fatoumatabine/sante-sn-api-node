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
  date_naissance?: string | Date;
  adresse?: string;
  groupe_sanguin?: string;
  diabete?: boolean;
  hypertension?: boolean;
  hepatite?: boolean;
  autres_pathologies?: string;
  allergies?: string[];
  antecedents?: RegisterAntecedentInput[];
  specialite?: string;
  tarif_consultation?: number;
}

export interface RegisterAntecedentInput {
  type: 'medical' | 'chirurgical' | 'familial' | 'allergie';
  description: string;
  date?: string;
  traitement?: string;
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
    avatarUrl?: string | null;
    patientId?: number;
    medecinId?: number;
    secretaireId?: number;
  };
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
  debugResetLink?: string;
  debugStatus?: 'USER_NOT_FOUND' | 'EMAIL_SENT' | 'SMTP_NOT_CONFIGURED' | 'SMTP_SEND_FAILED';
}

export class RegisterUseCase {
  constructor(private authRepository: IAuthRepository) {}

  private normalizeOptionalString(value?: string): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private parseOptionalDate(value?: string | Date): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    const normalized = value.trim();
    if (!normalized) return undefined;

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestError('Format date_naissance invalide');
    }
    return parsed;
  }

  private buildAutresPathologies(input: RegisterInput): string | undefined {
    const lines: string[] = [];

    const explicitPathologies = this.normalizeOptionalString(input.autres_pathologies);
    if (explicitPathologies) {
      lines.push(explicitPathologies);
    }

    const allergies = (input.allergies || [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (allergies.length > 0) {
      lines.push(`Allergies: ${allergies.join(', ')}`);
    }

    const antecedentSummaries = (input.antecedents || [])
      .map((item) => {
        const description = item.description?.trim();
        if (!description) return undefined;

        const type = item.type ? `[${item.type}] ` : '';
        const date = item.date?.trim() ? ` | Date: ${item.date.trim()}` : '';
        const traitement = item.traitement?.trim()
          ? ` | Traitement: ${item.traitement.trim()}`
          : '';

        return `${type}${description}${date}${traitement}`;
      })
      .filter((value): value is string => Boolean(value));

    if (antecedentSummaries.length > 0) {
      lines.push(`Antécédents: ${antecedentSummaries.join(' ; ')}`);
    }

    return lines.length > 0 ? lines.join('\n') : undefined;
  }

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
        date_naissance: this.parseOptionalDate(input.date_naissance),
        adresse: this.normalizeOptionalString(input.adresse),
        groupe_sanguin: this.normalizeOptionalString(input.groupe_sanguin),
        diabete: input.diabete,
        hypertension: input.hypertension,
        hepatite: input.hepatite,
        autres_pathologies: this.buildAutresPathologies(input),
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
        avatarUrl: user.avatarUrl,
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

  async execute(email: string): Promise<ForgotPasswordResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestError('Email requis');
    }

    const debugModeEnabled =
      process.env.LOG_RESET_TOKEN === 'true' ||
      process.env.NODE_ENV !== 'production';
    const genericResponseMessage = 'Si cet email existe, un lien de réinitialisation sera envoyé';

    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    
    if (!user) {
      if (debugModeEnabled) {
        console.info(`[Auth] Forgot-password requested for unknown email: ${normalizedEmail}`);
        return { message: genericResponseMessage, debugStatus: 'USER_NOT_FOUND' };
      }

      // Don't reveal if user exists
      return { message: genericResponseMessage };
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
      debugModeEnabled ||
      (!sendResult.sent && process.env.NODE_ENV === 'development');

    if (shouldLogResetLink) {
      console.info(`[Auth] Password reset link for ${user.email}: ${resetLink}`);
    }

    if (!sendResult.sent) {
      console.warn('[Auth] Password reset email not sent:', sendResult.reason);
    }

    if (debugModeEnabled) {
      return {
        message: genericResponseMessage,
        debugResetLink: resetLink,
        debugStatus: sendResult.sent ? 'EMAIL_SENT' : sendResult.reason,
      };
    }

    return { message: genericResponseMessage };
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
    avatarUrl?: string | null;
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
      avatarUrl: user.avatarUrl,
      patientId: user.patient?.id,
      medecinId: user.medecin?.id,
      secretaireId: user.secretaire?.id,
    };
  }
}
