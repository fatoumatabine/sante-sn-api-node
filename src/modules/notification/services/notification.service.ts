import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';

export class NotificationService {
  async findAll() {
    return await prisma.notification.findMany({
      where: { isArchived: false },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByUserId(userId: number) {
    return await prisma.notification.findMany({
      where: { userId, isArchived: false },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findUnreadByUserId(userId: number) {
    return await prisma.notification.findMany({
      where: {
        userId,
        lu: false,
        isArchived: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUnreadCount(userId: number) {
    return await prisma.notification.count({
      where: {
        userId,
        lu: false,
        isArchived: false,
      },
    });
  }

  async create(data: {
    userId: number;
    titre: string;
    message: string;
  }) {
    const { userId, titre, message } = data;

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findFirst({
      where: { id: userId, isArchived: false },
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    return await prisma.notification.create({
      data: {
        userId,
        titre,
        message,
        lu: false,
      },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId, isArchived: false },
    });

    if (!notification) {
      throw new AppError('Notification non trouvée', 404);
    }

    return await prisma.notification.update({
      where: { id },
      data: {
        lu: true,
      },
    });
  }

  async markAllAsRead(userId: number) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        lu: false,
        isArchived: false,
      },
      data: {
        lu: true,
      },
    });
  }

  async delete(id: number, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId, isArchived: false },
    });

    if (!notification) {
      throw new AppError('Notification non trouvée', 404);
    }

    return await prisma.notification.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        lu: true,
      },
    });
  }

  async deleteAllByUserId(userId: number) {
    return await prisma.notification.updateMany({
      where: { userId, isArchived: false },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        lu: true,
      },
    });
  }
}
