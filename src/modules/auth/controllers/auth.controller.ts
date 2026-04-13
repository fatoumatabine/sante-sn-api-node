import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { useCases } from '../../../shared/di/container';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import { prisma } from '../../../config/db';
import bcrypt from 'bcryptjs';
import { readUserAvatarUrl, writeUserAvatarUrl } from '../../../shared/utils/user-avatar';

// Controller utilisant les UseCases via DI Container
export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const registerUseCase = useCases.registerUseCase;
      const result = await registerUseCase.execute(req.body);
      return res.status(201).json(ApiResponse.created(result, 'Inscription réussie'));
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const loginUseCase = useCases.loginUseCase;
      const { email, password } = req.body;
      const result = await loginUseCase.execute({ email, password });
      return res.status(200).json(ApiResponse.success(result, 'Connexion réussie'));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const logoutUseCase = useCases.logoutUseCase;
      const userId = req.user?.id;
      const result = await logoutUseCase.execute(userId!);
      return res.status(200).json(ApiResponse.success(result, 'Déconnexion réussie'));
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const forgotPasswordUseCase = useCases.forgotPasswordUseCase;
      const { email } = req.body;
      const result = await forgotPasswordUseCase.execute(email);
      return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const resetPasswordUseCase = useCases.resetPasswordUseCase;
      const { token, password } = req.body;
      const result = await resetPasswordUseCase.execute(token, password);
      return res.status(200).json(ApiResponse.success(result, 'Mot de passe réinitialisé'));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshTokenUseCase = useCases.refreshTokenUseCase;
      const { refreshToken } = req.body;
      const tokens = await refreshTokenUseCase.execute(refreshToken);
      return res.status(200).json(ApiResponse.success(tokens, 'Token rafraîchi'));
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const getCurrentUserUseCase = useCases.getCurrentUserUseCase;
      const userId = req.user?.id;
      const user = await getCurrentUserUseCase.execute(userId!);
      return res.status(200).json(ApiResponse.success(user));
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }

      const {
        firstName,
        lastName,
        name,
        email,
        avatarUrl,
      } = req.body as {
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
        avatarUrl?: string | null;
      };

      const nextName = name || `${firstName || ''} ${lastName || ''}`.trim();
      if (!nextName) {
        return res.status(400).json(ApiResponse.error('Nom requis', null, 400));
      }

      if (!email) {
        return res.status(400).json(ApiResponse.error('Email requis', null, 400));
      }

      const existing = await prisma.user.findFirst({
        where: {
          email,
          isArchived: false,
          NOT: { id: userId },
        },
      });
      if (existing) {
        return res.status(400).json(ApiResponse.error('Cet email est déjà utilisé', null, 400));
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          name: nextName,
          email,
        },
      });

      if (avatarUrl !== undefined) {
        await writeUserAvatarUrl(prisma, userId, typeof avatarUrl === 'string' ? avatarUrl.trim() || null : null);
      }

      const storedAvatarUrl = await readUserAvatarUrl(prisma, userId);

      return res.status(200).json(
        ApiResponse.success(
          {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
            avatarUrl: storedAvatarUrl,
          },
          'Profil mis à jour'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }

      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!currentPassword || !newPassword) {
        return res.status(400).json(ApiResponse.error('Mot de passe actuel et nouveau requis', null, 400));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(ApiResponse.error('Le nouveau mot de passe doit contenir au moins 8 caractères', null, 400));
      }

      const user = await prisma.user.findFirst({
        where: { id: userId, isArchived: false },
      });
      if (!user) {
        return res.status(404).json(ApiResponse.error('Utilisateur non trouvé', null, 404));
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json(ApiResponse.error('Mot de passe actuel incorrect', null, 400));
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      });

      return res.status(200).json(ApiResponse.success(null, 'Mot de passe modifié'));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
