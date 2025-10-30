import crypto from 'crypto';
import { db } from './db.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { sendVerificationEmail } from './mailer.js';

const selectBase = `
  SELECT
    id,
    email,
    password_hash AS passwordHash,
    password_plain AS passwordPlain,
    email_verified AS emailVerified,
    email_verification_hash AS emailVerificationHash,
    email_verification_expires AS emailVerificationExpires,
    name,
    role,
    location,
    bio,
    stats,
    focus_areas AS focusAreas,
    upcoming,
    created_at AS createdAt
  FROM accounts
`;

const defaultAccount = {
  id: 'seed-001',
  email: 'mihailtsvetanov7@gmail.com',
  password: 'connect123',
  name: 'Mihail Tsvetanov',
  role: 'Experience Strategist',
  location: 'Eindhoven, NL',
  bio: 'Passionate about connecting runners, riders, and swimmers through meaningful community moments.',
  stats: [
    { label: 'Activities hosted', value: 12 },
    { label: 'Invites sent', value: 34 },
    { label: 'Training streak', value: '8 weeks' },
  ],
  focusAreas: ['Inclusive onboarding', 'Progress tracking', 'Community rituals'],
  upcoming: [
    { title: 'Sunset Interval Run', detail: 'Wed | 19:00 | Philips Stadion' },
    { title: 'Community Design Sprint', detail: 'Fri | 13:30 | Innovation Space' },
  ],
  createdAt: '2024-01-12T08:32:00.000Z',
};

export const ADMIN_EMAIL = defaultAccount.email.toLowerCase();

const createId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `acct_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

const parseJson = (value, fallback) => {
  try {
    const parsed = JSON.parse(value ?? 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const serialiseArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const mapRow = (row) => ({
  id: row.id,
  email: row.email,
  password: row.passwordPlain,
  passwordHash: row.passwordHash,
  emailVerified: Boolean(row.emailVerified),
  name: row.name,
  role: row.role,
  location: row.location,
  bio: row.bio,
  stats: parseJson(row.stats, []),
  focusAreas: parseJson(row.focusAreas, []),
  upcoming: parseJson(row.upcoming, []),
  createdAt: row.createdAt,
});

export const seedAccounts = () => {
  const { count } = db.prepare('SELECT COUNT(1) AS count FROM accounts').get();
  if (count > 0) {
    db.prepare(`
      UPDATE accounts
      SET password_plain = @passwordPlain
      WHERE id = @id AND (password_plain IS NULL OR password_plain = '')
    `).run({
      id: defaultAccount.id,
      passwordPlain: defaultAccount.password,
    });
    db.prepare(`
      UPDATE accounts
      SET email_verified = 1,
          email_verification_hash = '',
          email_verification_expires = ''
      WHERE id = @id
    `).run({ id: defaultAccount.id });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO accounts (
      id,
      email,
      password_hash,
      password_plain,
      email_verified,
      email_verification_hash,
      email_verification_expires,
      name,
      role,
      location,
      bio,
      stats,
      focus_areas,
      upcoming,
      created_at
    ) VALUES (@id, @email, @passwordHash, @passwordPlain, @emailVerified, @emailVerificationHash, @emailVerificationExpires, @name, @role, @location, @bio, @stats, @focusAreas, @upcoming, @createdAt)
  `);

  insert.run({
    id: defaultAccount.id,
    email: defaultAccount.email,
    passwordHash: hashPassword(defaultAccount.password),
    passwordPlain: defaultAccount.password,
    emailVerified: 1,
    emailVerificationHash: '',
    emailVerificationExpires: '',
    name: defaultAccount.name,
    role: defaultAccount.role,
    location: defaultAccount.location,
    bio: defaultAccount.bio,
    stats: serialiseArray(defaultAccount.stats),
    focusAreas: serialiseArray(defaultAccount.focusAreas),
    upcoming: serialiseArray(defaultAccount.upcoming),
    createdAt: defaultAccount.createdAt,
  });
};

export const listAccounts = () => {
  const rows = db.prepare(selectBase).all();
  return rows.map(mapRow);
};

export const findAccountById = (id) => {
  if (!id) return null;
  const row = db.prepare(`${selectBase} WHERE id = ?`).get(id);
  return row ? mapRow(row) : null;
};

export const isAdminAccount = (account) => {
  if (!account) {
    return false;
  }
  return (account.email ?? '').toLowerCase() === ADMIN_EMAIL;
};

export const findAccountWithSecretByEmail = (email) => {
  if (!email) return null;
  const row = db.prepare(`${selectBase} WHERE lower(email) = lower(?)`).get(email);
  if (!row) {
    return null;
  }
  return {
    account: mapRow(row),
    passwordHash: row.passwordHash,
    emailVerificationHash: row.emailVerificationHash,
    emailVerificationExpires: row.emailVerificationExpires,
  };
};

export const findAccountWithSecretById = (id) => {
  if (!id) return null;
  const row = db.prepare(`${selectBase} WHERE id = ?`).get(id);
  if (!row) {
    return null;
  }
  return {
    account: mapRow(row),
    passwordHash: row.passwordHash,
    emailVerificationHash: row.emailVerificationHash,
    emailVerificationExpires: row.emailVerificationExpires,
  };
};

const generateVerificationCode = () => {
  return String(100000 + Math.floor(Math.random() * 900000));
};

// Limit verification codes to a 10 minute window.
const calculateVerificationExpiry = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();

export const createAccount = async ({
  email,
  password,
  name,
  role = '',
  location = '',
  bio = '',
}) => {
  if (!email || !password || !name) {
    throw new Error('Missing required account fields.');
  }

  const existing = db.prepare('SELECT 1 FROM accounts WHERE lower(email) = lower(?)').get(email);
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.code = 'ACCOUNT_EXISTS';
    throw error;
  }

  const id = createId();
  const createdAt = new Date().toISOString();
  const verificationCode = generateVerificationCode();
  const verificationHash = hashPassword(verificationCode);
  const verificationExpires = calculateVerificationExpiry();

  const insert = db.prepare(`
    INSERT INTO accounts (
      id,
      email,
      password_hash,
      password_plain,
      email_verified,
      email_verification_hash,
      email_verification_expires,
      name,
      role,
      location,
      bio,
      stats,
      focus_areas,
      upcoming,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    email,
    hashPassword(password),
    password,
    0,
    verificationHash,
    verificationExpires,
    name,
    role,
    location,
    bio,
    serialiseArray([]),
    serialiseArray([]),
    serialiseArray([]),
    createdAt,
  );

  const account = findAccountById(id);

  try {
    await sendVerificationEmail({
      to: account.email,
      name: account.name,
      code: verificationCode,
    });
  } catch (error) {
    console.error('Failed to send verification email', error);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    const emailError = new Error('We could not send your verification email. Please try again.');
    emailError.code = 'ACCOUNT_VERIFICATION_EMAIL_FAILED';
    emailError.cause = error;
    throw emailError;
  }

  return account;
};

export const updateAccount = (id, updates = {}) => {
  if (!id) {
    throw new Error('Missing account id.');
  }

  const existing = findAccountById(id);
  if (!existing) {
    const error = new Error('Account not found.');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
    const error = new Error('Use the password endpoint to update credentials.');
    error.code = 'ACCOUNT_PASSWORD_UNSUPPORTED';
    throw error;
  }

  const next = {
    email: updates.email ?? existing.email,
    name: updates.name ?? existing.name,
    role: updates.role ?? existing.role,
    location: updates.location ?? existing.location,
    bio: updates.bio ?? existing.bio,
    stats: serialiseArray(updates.stats ?? existing.stats ?? []),
    focusAreas: serialiseArray(updates.focusAreas ?? existing.focusAreas ?? []),
    upcoming: serialiseArray(updates.upcoming ?? existing.upcoming ?? []),
  };

  const updateStmt = db.prepare(`
    UPDATE accounts SET
      email = @email,
      name = @name,
      role = @role,
      location = @location,
      bio = @bio,
      stats = @stats,
      focus_areas = @focusAreas,
      upcoming = @upcoming
    WHERE id = @id
  `);

  updateStmt.run({
    id,
    ...next,
  });

  return findAccountById(id);
};

export const deleteAccount = (id) => {
  if (!id) {
    const error = new Error('Missing account id.');
    error.code = 'ACCOUNT_DELETE_INVALID';
    throw error;
  }

  const target = findAccountById(id);
  if (!target) {
    const error = new Error('Account not found.');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (isAdminAccount(target)) {
    const error = new Error('Admin account cannot be deleted.');
    error.code = 'ACCOUNT_DELETE_FORBIDDEN';
    throw error;
  }

  db.prepare('DELETE FROM events WHERE author_id = ?').run(id);
  db.prepare('DELETE FROM blog_posts WHERE author_id = ?').run(id);
  db.prepare('DELETE FROM blog_comments WHERE author_id = ?').run(id);

  const statement = db.prepare('DELETE FROM accounts WHERE id = ?');
  statement.run(id);
};

export const forceVerifyAccount = (id) => {
  if (!id) {
    const error = new Error('Missing account id.');
    error.code = 'ACCOUNT_VERIFY_INVALID';
    throw error;
  }

  const account = findAccountById(id);
  if (!account) {
    const error = new Error('Account not found.');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  db.prepare(`
    UPDATE accounts
    SET email_verified = 1,
        email_verification_hash = '',
        email_verification_expires = ''
    WHERE id = ?
  `).run(id);

  return findAccountById(id);
};

export const verifyCredentials = (email, password) => {
  const record = findAccountWithSecretByEmail(email);
  if (!record) {
    return null;
  }
  const { account, passwordHash } = record;
  if (!verifyPassword(password, passwordHash)) {
    return null;
  }
  return account;
};

export const changeAccountPassword = (id, currentPassword, newPassword) => {
  if (!id) {
    const error = new Error('Missing account id.');
    error.code = 'ACCOUNT_PASSWORD_INVALID';
    throw error;
  }

  const record = findAccountWithSecretById(id);
  if (!record) {
    const error = new Error('Account not found.');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    const error = new Error('Please provide your current password.');
    error.code = 'ACCOUNT_PASSWORD_REQUIRED';
    throw error;
  }

  if (!verifyPassword(currentPassword, record.passwordHash)) {
    const error = new Error('Current password is incorrect.');
    error.code = 'ACCOUNT_PASSWORD_MISMATCH';
    throw error;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.code = 'ACCOUNT_PASSWORD_INVALID';
    throw error;
  }

  if (newPassword === currentPassword) {
    const error = new Error('New password must be different from the current password.');
    error.code = 'ACCOUNT_PASSWORD_INVALID';
    throw error;
  }

  const passwordHash = hashPassword(newPassword);

  db.prepare('UPDATE accounts SET password_hash = ?, password_plain = ? WHERE id = ?').run(
    passwordHash,
    newPassword,
    id,
  );

  return findAccountById(id);
};

export const verifyAccountEmail = (email, code) => {
  if (!email || !code) {
    const error = new Error('Specify email and verification code.');
    error.code = 'ACCOUNT_VERIFICATION_INVALID';
    throw error;
  }

  const record = findAccountWithSecretByEmail(email);
  if (!record) {
    const error = new Error('Account not found.');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (record.account.emailVerified) {
    return record.account;
  }

  if (!record.emailVerificationHash) {
    const error = new Error('No verification request found for this account.');
    error.code = 'ACCOUNT_VERIFICATION_INVALID';
    throw error;
  }

  if (record.emailVerificationExpires) {
    const expiresAt = new Date(record.emailVerificationExpires).getTime();
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      const error = new Error('Verification code has expired. Request a new code.');
      error.code = 'ACCOUNT_VERIFICATION_EXPIRED';
      throw error;
    }
  }

  if (!verifyPassword(code, record.emailVerificationHash)) {
    const error = new Error('Verification code is incorrect.');
    error.code = 'ACCOUNT_VERIFICATION_MISMATCH';
    throw error;
  }

  db.prepare(`
    UPDATE accounts
    SET email_verified = 1,
        email_verification_hash = '',
        email_verification_expires = ''
    WHERE id = ?
  `).run(record.account.id);

  return findAccountById(record.account.id);
};
