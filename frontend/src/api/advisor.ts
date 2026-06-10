import api from './client';
import { Conversation } from '../types';

export const advisorApi = {
  getConversations: () =>
    api.get<{ conversations: Conversation[] }>('/advisor/conversations').then((r) => r.data.conversations),

  getConversation: (id: string) =>
    api.get<{ conversation: Conversation }>(`/advisor/conversations/${id}`).then((r) => r.data.conversation),

  chat: (data: {
    message: string;
    conversationId?: string;
    farmId?: string;
    cropId?: string;
    attachments?: File[];
  }) => {
    const form = new FormData();
    form.append('message', data.message);
    if (data.conversationId) form.append('conversationId', data.conversationId);
    if (data.farmId) form.append('farmId', data.farmId);
    if (data.cropId) form.append('cropId', data.cropId);
    data.attachments?.forEach((f) => form.append('attachments', f));

    return api
      .post<{ conversationId: string; response: string }>('/advisor/chat', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
