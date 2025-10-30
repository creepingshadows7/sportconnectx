import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import process from 'process';
import {
  changeAccountPassword,
  createAccount,
  deleteAccount,
  findAccountById,
  forceVerifyAccount,
  isAdminAccount,
  listAccounts,
  seedAccounts,
  updateAccount,
  verifyAccountEmail,
  verifyCredentials,
} from './accounts.js';
import {
  createEvent,
  deleteEvent,
  listEvents,
  seedEvents,
} from './events.js';
import {
  createBlogComment,
  createBlogPost,
  deleteBlogPost,
  listBlogPostComments,
  listBlogPosts,
  seedBlogPosts,
} from './blogPosts.js';
import { createMessage, listConversationMessages } from './messages.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  }),
);

const sanitiseAccount = (account) => {
  if (!account) {
    return null;
  }
  return { ...account };
};

seedAccounts();
seedEvents();
seedBlogPosts();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/accounts', (_req, res) => {
  res.json(listAccounts().map(sanitiseAccount));
});

app.get('/api/accounts/:id', (req, res) => {
  const account = findAccountById(req.params.id);
  if (!account) {
    res.sendStatus(404);
    return;
  }
  res.json(sanitiseAccount(account));
});

app.post('/api/accounts', async (req, res, next) => {
  const payload = req.body ?? {};
  try {
    const account = await createAccount(payload);
    res.status(201).json(sanitiseAccount(account));
  } catch (error) {
    if (error?.code === 'ACCOUNT_EXISTS') {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_VERIFICATION_EMAIL_FAILED') {
      res.status(503).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch('/api/accounts/:id', (req, res, next) => {
  const payload = req.body ?? {};
  try {
    const account = updateAccount(req.params.id, payload);
    if (!account) {
      res.sendStatus(204);
      return;
    }
    res.json(sanitiseAccount(account));
  } catch (error) {
    if (error?.code === 'ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_DELETE_FORBIDDEN') {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_PASSWORD_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_PASSWORD_UNSUPPORTED') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch('/api/accounts/:id/password', (req, res, next) => {
  const { currentPassword, newPassword } = req.body ?? {};
  try {
    const account = changeAccountPassword(req.params.id, currentPassword, newPassword);
    res.json(sanitiseAccount(account));
  } catch (error) {
    if (error?.code === 'ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error?.code === 'ACCOUNT_PASSWORD_REQUIRED' ||
      error?.code === 'ACCOUNT_PASSWORD_INVALID' ||
      error?.code === 'ACCOUNT_PASSWORD_MISMATCH'
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/accounts/verify-email', (req, res, next) => {
  const { email, code } = req.body ?? {};
  try {
    const account = verifyAccountEmail(email, code);
    res.json(sanitiseAccount(account));
  } catch (error) {
    if (error?.code === 'ACCOUNT_VERIFICATION_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_VERIFICATION_EXPIRED') {
      res.status(410).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_VERIFICATION_MISMATCH') {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/admin/accounts/:id/verify', (req, res, next) => {
  const { requesterId } = req.body ?? {};
  if (!req.params.id || !requesterId) {
    res.status(400).json({ message: 'Missing requester or account id.' });
    return;
  }

  const requester = findAccountById(requesterId);
  if (!requester || !isAdminAccount(requester)) {
    res.status(403).json({ message: 'Only the admin can verify accounts.' });
    return;
  }

  try {
    const account = forceVerifyAccount(req.params.id);
    res.json(sanitiseAccount(account));
  } catch (error) {
    if (error?.code === 'ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_VERIFY_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.delete('/api/admin/accounts/:id', (req, res, next) => {
  const { requesterId } = req.body ?? {};
  if (!req.params.id || !requesterId) {
    res.status(400).json({ message: 'Missing requester or account id.' });
    return;
  }

  const requester = findAccountById(requesterId);
  if (!requester || !isAdminAccount(requester)) {
    res.status(403).json({ message: 'Only the admin can remove accounts.' });
    return;
  }

  try {
    deleteAccount(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    if (error?.code === 'ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_DELETE_FORBIDDEN') {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error?.code === 'ACCOUNT_DELETE_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/events', (_req, res) => {
  res.json(listEvents());
});

app.post('/api/events', (req, res, next) => {
  const payload = req.body ?? {};
  try {
    const event = createEvent(payload);
    res.status(201).json(event);
  } catch (error) {
    if (error?.code === 'EVENT_AUTHOR_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.delete('/api/events/:id', (req, res, next) => {
  const { actorId } = req.body ?? {};
  try {
    deleteEvent(req.params.id, actorId);
    res.sendStatus(204);
  } catch (error) {
    if (error?.code === 'EVENT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'EVENT_DELETE_FORBIDDEN') {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error?.code === 'EVENT_DELETE_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/blog-posts', (_req, res) => {
  res.json(listBlogPosts());
});

app.post('/api/blog-posts', (req, res, next) => {
  const payload = req.body ?? {};
  try {
    const post = createBlogPost(payload);
    res.status(201).json(post);
  } catch (error) {
    if (error?.code === 'BLOG_AUTHOR_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.delete('/api/blog-posts/:id', (req, res, next) => {
  const { actorId } = req.body ?? {};
  try {
    deleteBlogPost(req.params.id, actorId);
    res.sendStatus(204);
  } catch (error) {
    if (error?.code === 'BLOG_POST_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'BLOG_DELETE_FORBIDDEN') {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error?.code === 'BLOG_DELETE_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/blog-posts/:id/comments', (req, res) => {
  res.json(listBlogPostComments(req.params.id));
});

app.post('/api/blog-posts/:id/comments', (req, res, next) => {
  const payload = req.body ?? {};
  try {
    const comment = createBlogComment({
      postId: req.params.id,
      authorId: payload.authorId,
      message: payload.message,
    });
    res.status(201).json(comment);
  } catch (error) {
    if (error?.code === 'BLOG_POST_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'BLOG_AUTHOR_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error?.code === 'BLOG_COMMENT_INVALID') {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: 'Please provide both email and password.' });
    return;
  }

  const account = verifyCredentials(email, password);
  if (!account) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  if (!account.emailVerified && !isAdminAccount(account)) {
    res.status(403).json({
      message: 'Please verify your email to continue.',
      reason: 'EMAIL_NOT_VERIFIED',
      email: account.email,
    });
    return;
  }

  res.json(sanitiseAccount(account));
});

app.get('/api/messages', (req, res, next) => {
  const actorId = req.query?.actorId;
  const contactId = req.query?.contactId;

  if (!actorId || !contactId) {
    res.status(400).json({ message: 'Specify both actorId and contactId.' });
    return;
  }

  try {
    const messages = listConversationMessages(actorId, contactId);
    res.json(messages);
  } catch (error) {
    if (error?.code === 'MESSAGE_ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error?.code === 'MESSAGE_ACTOR_REQUIRED' ||
      error?.code === 'MESSAGE_CONTACT_REQUIRED'
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/messages', (req, res, next) => {
  const payload = req.body ?? {};

  try {
    const message = createMessage({
      senderId: payload.senderId,
      recipientId: payload.recipientId,
      text: payload.text ?? payload.body ?? '',
    });
    res.status(201).json(message);
  } catch (error) {
    if (error?.code === 'MESSAGE_ACCOUNT_NOT_FOUND') {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error?.code === 'MESSAGE_SENDER_REQUIRED' ||
      error?.code === 'MESSAGE_RECIPIENT_REQUIRED' ||
      error?.code === 'MESSAGE_TEXT_REQUIRED' ||
      error?.code === 'MESSAGE_RECIPIENT_INVALID'
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.', method: req.method, path: req.originalUrl });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);


  if (process.env.NODE_ENV === 'debug_routes') {
    const stack = app?.router?.stack ?? app?._router?.stack ?? [];
    console.log('[Route stack length]', stack.length);
    const routes = stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
    console.log('[Route map]', routes);
    console.log('[App keys]', Object.keys(app));
  }
});
