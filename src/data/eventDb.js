import { apiRequest } from './accountDb.js';

export const listEvents = () => apiRequest('/events');

export const createEvent = (payload) => apiRequest('/events', {
  method: 'POST',
  body: payload,
});

export const deleteEvent = (id, actorId) => apiRequest(`/events/${id}`, {
  method: 'DELETE',
  body: { actorId },
});
