import { Router } from 'express';
import { httpKernel } from '../../../kernel';
import {
  ChatDirectUserParamSchema,
  ChatMessagesQuerySchema,
  ChatSendMessageSchema,
  ChatThreadIdParamSchema,
} from '../../../validations';
import chatController from '../controllers/chat.controller';

const router = Router();

router.use(...httpKernel.auth());

router.get('/contacts', (req, res, next) => chatController.listContacts(req, res, next));
router.get('/threads', (req, res, next) => chatController.listThreads(req, res, next));
router.post(
  '/threads/direct/:otherUserId',
  ...httpKernel.params(ChatDirectUserParamSchema),
  (req, res, next) => chatController.openDirectThread(req, res, next)
);
router.get(
  '/threads/:threadId/messages',
  ...httpKernel.params(ChatThreadIdParamSchema),
  ...httpKernel.query(ChatMessagesQuerySchema),
  (req, res, next) => chatController.getMessages(req, res, next)
);
router.post(
  '/threads/:threadId/messages',
  ...httpKernel.params(ChatThreadIdParamSchema),
  ...httpKernel.body(ChatSendMessageSchema),
  (req, res, next) => chatController.sendMessage(req, res, next)
);
router.put(
  '/threads/:threadId/read',
  ...httpKernel.params(ChatThreadIdParamSchema),
  (req, res, next) => chatController.markThreadAsRead(req, res, next)
);

export default router;
