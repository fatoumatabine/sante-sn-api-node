import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import { AppError, ForbiddenError, NotFoundError } from '../../../shared/utils/AppError';

const chatUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  patient: {
    select: {
      prenom: true,
      nom: true,
    },
  },
  medecin: {
    select: {
      prenom: true,
      nom: true,
    },
  },
  secretaire: {
    select: {
      prenom: true,
      nom: true,
    },
  },
} satisfies Prisma.UserSelect;

type ChatUserProjection = Prisma.UserGetPayload<{ select: typeof chatUserSelect }>;

const threadWithLastMessageInclude = {
  participantA: { select: chatUserSelect },
  participantB: { select: chatUserSelect },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      content: true,
      createdAt: true,
      senderUserId: true,
    },
  },
};

interface ThreadWithLastMessage {
  id: number;
  participantAUserId: number;
  participantBUserId: number;
  lastMessageAt: Date;
  participantA: ChatUserProjection;
  participantB: ChatUserProjection;
  messages: Array<{
    id: number;
    content: string;
    createdAt: Date;
    senderUserId: number;
  }>;
}

const threadMessageInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
};

interface MessageWithSender {
  id: number;
  threadId: number;
  senderUserId: number;
  content: string;
  readAt: Date | null;
  createdAt: Date;
  sender: {
    id: number;
    name: string;
    role: string;
  };
}

const resolveDisplayName = (user: ChatUserProjection): string => {
  const patientName = `${user.patient?.prenom || ''} ${user.patient?.nom || ''}`.trim();
  const medecinName = `${user.medecin?.prenom || ''} ${user.medecin?.nom || ''}`.trim();
  const secretaireName = `${user.secretaire?.prenom || ''} ${user.secretaire?.nom || ''}`.trim();

  if (user.role === 'patient' && patientName) return patientName;
  if (user.role === 'medecin' && medecinName) return `Dr. ${medecinName}`;
  if (user.role === 'secretaire' && secretaireName) return secretaireName;
  return user.name?.trim() || user.email;
};

const normalizePair = (userAId: number, userBId: number): [number, number] => {
  if (userAId === userBId) {
    throw new AppError('Conversation invalide', 400);
  }
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
};

export interface ChatContactDto {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export interface ChatMessageDto {
  id: number;
  threadId: number;
  senderUserId: number;
  content: string;
  readAt: Date | null;
  createdAt: Date;
  sender: {
    id: number;
    name: string;
    role: string;
  };
}

export interface ChatMessagesPageDto {
  messages: ChatMessageDto[];
  pageInfo: {
    hasMore: boolean;
    nextBeforeMessageId: number | null;
  };
}

export interface ChatThreadDto {
  threadId: number;
  otherUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    createdAt: Date;
    senderUserId: number;
  } | null;
  updatedAt: Date;
}

export class ChatService {
  private getChatDb() {
    const db = prisma as any;
    if (!db.chatThread || !db.chatMessage) {
      throw new AppError(
        "Le client Prisma du chat n'est pas généré. Exécutez `npx prisma generate` puis redémarrez l'API.",
        500
      );
    }
    return db;
  }

  private mapThread(thread: ThreadWithLastMessage, currentUserId: number, unreadCount: number): ChatThreadDto {
    const other = thread.participantAUserId === currentUserId ? thread.participantB : thread.participantA;
    const lastMessage = thread.messages[0] ?? null;

    return {
      threadId: thread.id,
      otherUser: {
        id: other.id,
        name: resolveDisplayName(other),
        email: other.email,
        role: other.role,
      },
      unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderUserId: lastMessage.senderUserId,
          }
        : null,
      updatedAt: thread.lastMessageAt,
    };
  }

  private mapMessage(message: MessageWithSender): ChatMessageDto {
    return {
      id: message.id,
      threadId: message.threadId,
      senderUserId: message.senderUserId,
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        role: message.sender.role,
      },
    };
  }

  private async assertThreadAccess(threadId: number, currentUserId: number) {
    const db = this.getChatDb();
    const thread = await db.chatThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantAUserId: currentUserId }, { participantBUserId: currentUserId }],
      },
    });

    if (!thread) {
      throw new ForbiddenError('Accès refusé à cette conversation');
    }

    return thread;
  }

  async listContacts(currentUserId: number): Promise<ChatContactDto[]> {
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isArchived: false,
      },
      select: chatUserSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return users.map((user) => ({
      userId: user.id,
      name: resolveDisplayName(user),
      email: user.email,
      role: user.role,
    }));
  }

  async listThreads(currentUserId: number): Promise<ChatThreadDto[]> {
    const db = this.getChatDb();
    const threads: ThreadWithLastMessage[] = await db.chatThread.findMany({
      where: {
        OR: [{ participantAUserId: currentUserId }, { participantBUserId: currentUserId }],
      },
      include: threadWithLastMessageInclude,
      orderBy: { lastMessageAt: 'desc' },
    });

    if (threads.length === 0) return [];

    const threadIds = threads.map((thread) => thread.id);
    const unread: Array<{ threadId: number; _count: { _all: number } }> = await db.chatMessage.groupBy({
      by: ['threadId'],
      where: {
        threadId: { in: threadIds },
        senderUserId: { not: currentUserId },
        readAt: null,
      },
      _count: {
        _all: true,
      },
    });

    const unreadByThread = new Map<number, number>(
      unread.map((entry: { threadId: number; _count: { _all: number } }) => [entry.threadId, entry._count._all])
    );

    return threads.map((thread: ThreadWithLastMessage) =>
      this.mapThread(thread, currentUserId, unreadByThread.get(thread.id) ?? 0)
    );
  }

  async openDirectThread(currentUserId: number, otherUserId: number): Promise<ChatThreadDto> {
    const db = this.getChatDb();
    const otherUser = await prisma.user.findFirst({
      where: { id: otherUserId, isArchived: false },
    });

    if (!otherUser) {
      throw new NotFoundError('Utilisateur cible introuvable');
    }

    const [participantAUserId, participantBUserId] = normalizePair(currentUserId, otherUserId);

    const thread: ThreadWithLastMessage = await db.chatThread.upsert({
      where: {
        participantAUserId_participantBUserId: {
          participantAUserId,
          participantBUserId,
        },
      },
      create: {
        participantAUserId,
        participantBUserId,
        lastMessageAt: new Date(),
      },
      update: {},
      include: threadWithLastMessageInclude,
    });

    return this.mapThread(thread, currentUserId, 0);
  }

  async getMessages(
    threadId: number,
    currentUserId: number,
    options: {
      limit: number;
      beforeMessageId?: number;
    }
  ): Promise<ChatMessagesPageDto> {
    const db = this.getChatDb();
    await this.assertThreadAccess(threadId, currentUserId);

    const { limit, beforeMessageId } = options;
    const messages: MessageWithSender[] = await db.chatMessage.findMany({
      where: {
        threadId,
        ...(beforeMessageId ? { id: { lt: beforeMessageId } } : {}),
      },
      include: threadMessageInclude,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const currentPage = hasMore ? messages.slice(0, limit) : messages;
    const nextBeforeMessageId = hasMore ? currentPage[currentPage.length - 1]?.id ?? null : null;

    return {
      messages: currentPage.reverse().map((message: MessageWithSender) => this.mapMessage(message)),
      pageInfo: {
        hasMore,
        nextBeforeMessageId,
      },
    };
  }

  async sendMessage(threadId: number, currentUserId: number, rawContent: string): Promise<ChatMessageDto> {
    const db = this.getChatDb();
    await this.assertThreadAccess(threadId, currentUserId);

    const content = rawContent.trim();
    if (!content) {
      throw new AppError('Le message est vide', 400);
    }

    const now = new Date();
    const result: MessageWithSender = await db.$transaction(async (tx: any) => {
      const message = await tx.chatMessage.create({
        data: {
          threadId,
          senderUserId: currentUserId,
          content,
        },
        include: threadMessageInclude,
      });

      await tx.chatThread.update({
        where: { id: threadId },
        data: { lastMessageAt: now },
      });

      return message;
    });

    return this.mapMessage(result);
  }

  async markThreadAsRead(threadId: number, currentUserId: number): Promise<number> {
    const db = this.getChatDb();
    await this.assertThreadAccess(threadId, currentUserId);

    const result = await db.chatMessage.updateMany({
      where: {
        threadId,
        senderUserId: { not: currentUserId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return result.count;
  }
}
