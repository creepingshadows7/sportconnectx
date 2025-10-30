import crypto from 'crypto';
import { db } from './db.js';
import { findAccountById } from './accounts.js';

const createId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

const mapRow = (row) => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  text: row.body,
  createdAt: row.created_at,
});

const ensureAccountExists = (id, errorCode) => {
  if (!id) {
    const error = new Error('Missing account id.');
    error.code = errorCode;
    throw error;
  }
  const account = findAccountById(id);
  if (!account) {
    const error = new Error('Account not found.');
    error.code = 'MESSAGE_ACCOUNT_NOT_FOUND';
    throw error;
  }
  return account;
};

export const listConversationMessages = (actorId, contactId) => {
  ensureAccountExists(actorId, 'MESSAGE_ACTOR_REQUIRED');
  ensureAccountExists(contactId, 'MESSAGE_CONTACT_REQUIRED');

  const rows = db
    .prepare(
      `
        SELECT
          id,
          sender_id,
          recipient_id,
          body,
          created_at
        FROM messages
        WHERE (sender_id = @actorId AND recipient_id = @contactId)
           OR (sender_id = @contactId AND recipient_id = @actorId)
        ORDER BY datetime(created_at) ASC
      `,
    )
    .all({ actorId, contactId });

  return rows.map(mapRow);
};

export const createMessage = ({ senderId, recipientId, text }) => {
  ensureAccountExists(senderId, 'MESSAGE_SENDER_REQUIRED');
  ensureAccountExists(recipientId, 'MESSAGE_RECIPIENT_REQUIRED');

  if (senderId === recipientId) {
    const error = new Error('Cannot send a message to yourself.');
    error.code = 'MESSAGE_RECIPIENT_INVALID';
    throw error;
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    const error = new Error('Message must include some text.');
    error.code = 'MESSAGE_TEXT_REQUIRED';
    throw error;
  }

  const trimmed = text.trim();
  const message = {
    id: createId(),
    sender_id: senderId,
    recipient_id: recipientId,
    body: trimmed,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `
      INSERT INTO messages (id, sender_id, recipient_id, body, created_at)
      VALUES (@id, @sender_id, @recipient_id, @body, @created_at)
    `,
  ).run(message);

  return mapRow(message);
};
