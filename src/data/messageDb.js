import { apiRequest } from './accountDb.js';

export const listMessages = (actorId, contactId) => {
  const params = new URLSearchParams({ actorId, contactId });
  return apiRequest(`/messages?${params.toString()}`);
};

export const sendMessage = ({ senderId, recipientId, text }) =>
  apiRequest('/messages', {
    method: 'POST',
    body: { senderId, recipientId, text },
  });
