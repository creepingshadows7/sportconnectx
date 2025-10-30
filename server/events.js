import crypto from 'crypto';
import { db } from './db.js';
import { findAccountById, isAdminAccount } from './accounts.js';

const selectBase = `
  SELECT
    e.id,
    e.author_id AS authorId,
    a.name AS authorName,
    e.title,
    e.meta,
    e.description,
    e.tags,
    e.image_data AS imageData,
    e.created_at AS createdAt
  FROM events e
  LEFT JOIN accounts a ON a.id = e.author_id
`;

const createId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
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
  authorId: row.authorId,
  authorName: row.authorName ?? 'SportConnect member',
  title: row.title,
  meta: row.meta,
  description: row.description,
  tags: parseJson(row.tags, []),
  imageData: row.imageData ?? null,
  createdAt: row.createdAt,
});

export const seedEvents = () => {
  const { count } = db.prepare('SELECT COUNT(1) AS count FROM events').get();
  if (count > 0) {
    return;
  }

  const defaultAuthor = findAccountById('seed-001');
  if (!defaultAuthor) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO events (
      id,
      author_id,
      title,
      meta,
      description,
      tags,
      image_data,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const sampleEvents = [
    {
      title: 'Sunrise Run Crew',
      meta: 'Mondays | 06:45 | Genneper Parken',
      description: 'Kickstart the week with interval bursts and pacing partners for every level.',
      tags: ['Running', 'Endurance'],
    },
    {
      title: 'Court Connect Basketball',
      meta: 'Wednesdays | 19:30 | Fontys Sports Centre',
      description: 'Pick-up games with dynamic drills that mix strategy, skill, and community.',
      tags: ['Team Play', 'Agility'],
    },
    {
      title: 'Night Ride Collective',
      meta: 'Fridays | 21:00 | Eindhoven City Loop',
      description: 'A guided cycling experience with cadence tracking and live route sharing.',
      tags: ['Cycling', 'Tracking'],
    },
  ];

  sampleEvents.forEach((event, index) => {
    insert.run(
      createId(),
      defaultAuthor.id,
      event.title,
      event.meta,
      event.description,
      serialiseArray(event.tags),
      null,
      new Date(now.getTime() - index * 60 * 60 * 1000).toISOString(),
    );
  });
};

export const listEvents = () => {
  const rows = db.prepare(`${selectBase} ORDER BY datetime(e.created_at) DESC`).all();
  return rows.map(mapRow);
};

export const createEvent = ({
  authorId,
  title,
  meta,
  description,
  tags = [],
  imageData = null,
}) => {
  if (!authorId) {
    throw new Error('Missing author id.');
  }
  if (!title || !meta) {
    throw new Error('Missing required event fields.');
  }

  const author = findAccountById(authorId);
  if (!author) {
    const error = new Error('Author account not found.');
    error.code = 'EVENT_AUTHOR_NOT_FOUND';
    throw error;
  }

  const id = createId();
  const createdAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO events (
      id,
      author_id,
      title,
      meta,
      description,
      tags,
      image_data,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    authorId,
    title,
    meta,
    description ?? '',
    serialiseArray(tags),
    imageData,
    createdAt,
  );

  return findEventById(id);
};

export const findEventById = (id) => {
  if (!id) {
    return null;
  }
  const row = db.prepare(`${selectBase} WHERE e.id = ?`).get(id);
  return row ? mapRow(row) : null;
};

export const deleteEvent = (id, actorId) => {
  if (!id || !actorId) {
    const error = new Error('Missing event or actor id.');
    error.code = 'EVENT_DELETE_INVALID';
    throw error;
  }

  const existing = findEventById(id);
  if (!existing) {
    const error = new Error('Event not found.');
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }
  const actor = findAccountById(actorId);
  if (!actor) {
    const error = new Error('Requesting account not found.');
    error.code = 'EVENT_DELETE_INVALID';
    throw error;
  }
  const isAdmin = isAdminAccount(actor);

  if (!isAdmin && existing.authorId !== actorId) {
    const error = new Error('Only the creator or an admin can delete this event.');
    error.code = 'EVENT_DELETE_FORBIDDEN';
    throw error;
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(id);
};
