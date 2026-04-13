import { NextFunction, Response } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { UnauthorizedError } from '../../../shared/utils/AppError';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import { ChatService } from '../services/chat.service';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  async listContacts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const contacts = await this.chatService.listContacts(userId);
      return res.status(200).json(ApiResponse.success(contacts, 'Contacts chat récupérés'));
    } catch (error) {
      return next(error);
    }
  }

  async listThreads(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const threads = await this.chatService.listThreads(userId);
      return res.status(200).json(ApiResponse.success(threads, 'Conversations récupérées'));
    } catch (error) {
      return next(error);
    }
  }

  async openDirectThread(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const otherUserId = Number(req.params.otherUserId);
      const thread = await this.chatService.openDirectThread(userId, otherUserId);
      const messagesPage = await this.chatService.getMessages(thread.threadId, userId, { limit: 20 });
      await this.chatService.markThreadAsRead(thread.threadId, userId);

      return res
        .status(200)
        .json(ApiResponse.success({ thread, messages: messagesPage.messages, pageInfo: messagesPage.pageInfo }, 'Conversation ouverte'));
    } catch (error) {
      return next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const threadId = Number(req.params.threadId);
      const limit = Number(req.query.limit || 50);
      const beforeMessageId = req.query.beforeMessageId ? Number(req.query.beforeMessageId) : undefined;

      const messagesPage = await this.chatService.getMessages(threadId, userId, {
        limit,
        beforeMessageId,
      });
      const readCount = await this.chatService.markThreadAsRead(threadId, userId);

      return res
        .status(200)
        .json(ApiResponse.success({ messages: messagesPage.messages, pageInfo: messagesPage.pageInfo, readCount }, 'Messages récupérés'));
    } catch (error) {
      return next(error);
    }
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const threadId = Number(req.params.threadId);
      const message = await this.chatService.sendMessage(threadId, userId, String(req.body.content || ''));

      return res.status(201).json(ApiResponse.created(message, 'Message envoyé'));
    } catch (error) {
      return next(error);
    }
  }

  async markThreadAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Non autorisé');

      const threadId = Number(req.params.threadId);
      const count = await this.chatService.markThreadAsRead(threadId, userId);

      return res.status(200).json(ApiResponse.success({ count }, 'Messages marqués comme lus'));
    } catch (error) {
      return next(error);
    }
  }
}

export default new ChatController();
