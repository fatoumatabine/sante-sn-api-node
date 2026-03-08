import { ModuleRouteContract } from '../../../kernel/route-contract';

export const chatRouteContract: ModuleRouteContract = {
  module: 'chat',
  basePath: '/api/v1/chat',
  routes: [
    { method: 'GET', path: '/contacts', auth: 'auth' },
    { method: 'GET', path: '/threads', auth: 'auth' },
    {
      method: 'POST',
      path: '/threads/direct/:otherUserId',
      auth: 'auth',
      validations: { params: 'ChatDirectUserParamSchema' },
    },
    {
      method: 'GET',
      path: '/threads/:threadId/messages',
      auth: 'auth',
      validations: { params: 'ChatThreadIdParamSchema', query: 'ChatMessagesQuerySchema' },
    },
    {
      method: 'POST',
      path: '/threads/:threadId/messages',
      auth: 'auth',
      validations: { params: 'ChatThreadIdParamSchema', body: 'ChatSendMessageSchema' },
    },
    {
      method: 'PUT',
      path: '/threads/:threadId/read',
      auth: 'auth',
      validations: { params: 'ChatThreadIdParamSchema' },
    },
  ],
};
