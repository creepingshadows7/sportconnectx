import crypto from 'crypto';
import { db } from './db.js';
import { findAccountById, isAdminAccount } from './accounts.js';

const selectBase = `
  SELECT
    b.id,
    b.author_id AS authorId,
    a.name AS authorName,
    b.title,
    b.sport,
    b.highlight,
    b.question,
    b.tags,
    b.image_data AS imageData,
    b.created_at AS createdAt
  FROM blog_posts b
  LEFT JOIN accounts a ON a.id = b.author_id
`;

const commentSelectBase = `
  SELECT
    c.id,
    c.post_id AS postId,
    c.author_id AS authorId,
    ca.name AS authorName,
    c.message,
    c.created_at AS createdAt
  FROM blog_comments c
  LEFT JOIN accounts ca ON ca.id = c.author_id
`;

const createId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `blog_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

const createCommentId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `comment_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
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
  sport: row.sport,
  highlight: row.highlight,
  question: row.question,
  tags: parseJson(row.tags, []),
  imageData: row.imageData ?? null,
  createdAt: row.createdAt,
  comments: [],
});

const mapCommentRow = (row) => ({
  id: row.id,
  postId: row.postId,
  authorId: row.authorId,
  authorName: row.authorName ?? 'SportConnect member',
  message: row.message,
  createdAt: row.createdAt,
});

export const seedBlogPosts = () => {
  const { count } = db.prepare('SELECT COUNT(1) AS count FROM blog_posts').get();
  if (count > 0) {
    return;
  }

  const defaultAuthor = findAccountById('seed-001');
  if (!defaultAuthor) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO blog_posts (
      id,
      author_id,
      title,
      sport,
      highlight,
      question,
      tags,
      image_data,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const samplePosts = [
    {
      title: 'Designing inclusive warm-ups for mixed sport groups',
      sport: 'Multi-sport',
      highlight:
        'How do you keep seasoned triathletes and brand-new members energised without losing pace? Here is the template our crew iterated on.',
      question: 'What rituals help late-joiners feel caught up fast?',
      tags: ['Community building', 'Warm-ups', 'Inclusion'],
    },
    {
      title: 'Best ways to capture post-activity stories on the go',
      sport: 'Cycling',
      highlight:
        'We experimented with voice-note recaps straight after the Night Ride Collective. Curious how others turn raw energy into reusable content.',
      question: 'Any lightweight editing stacks you swear by?',
      tags: ['Storytelling', 'Clubs', 'Content ops'],
    },
  ];

  samplePosts.forEach((post, index) => {
    insert.run(
      createId(),
      defaultAuthor.id,
      post.title,
      post.sport,
      post.highlight,
      post.question,
      serialiseArray(post.tags),
      null,
      new Date(now.getTime() - index * 2 * 60 * 60 * 1000).toISOString(),
    );
  });
};

const listCommentsForPostIds = (postIds) => {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    return new Map();
  }
  const placeholders = postIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `${commentSelectBase} WHERE c.post_id IN (${placeholders}) ORDER BY datetime(c.created_at) ASC`,
    )
    .all(...postIds);

  const grouped = new Map();
  rows.forEach((row) => {
    const comment = mapCommentRow(row);
    if (!grouped.has(comment.postId)) {
      grouped.set(comment.postId, []);
    }
    grouped.get(comment.postId).push(comment);
  });
  return grouped;
};

const attachCommentsToPosts = (posts) => {
  if (!Array.isArray(posts) || posts.length === 0) {
    return posts ?? [];
  }
  const grouped = listCommentsForPostIds(posts.map((post) => post.id));
  posts.forEach((post) => {
    post.comments = grouped.get(post.id) ?? [];
  });
  return posts;
};

export const listBlogPosts = () => {
  const rows = db.prepare(`${selectBase} ORDER BY datetime(b.created_at) DESC`).all();
  const posts = rows.map(mapRow);
  return attachCommentsToPosts(posts);
};

export const createBlogPost = ({
  authorId,
  title,
  sport = '',
  highlight = '',
  question = '',
  tags = [],
  imageData = null,
}) => {
  if (!authorId) {
    throw new Error('Missing author id.');
  }
  if (!title || (!highlight && !question)) {
    throw new Error('Missing required blog content.');
  }

  const author = findAccountById(authorId);
  if (!author) {
    const error = new Error('Author account not found.');
    error.code = 'BLOG_AUTHOR_NOT_FOUND';
    throw error;
  }

  const id = createId();
  const createdAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO blog_posts (
      id,
      author_id,
      title,
      sport,
      highlight,
      question,
      tags,
      image_data,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    authorId,
    title,
    sport,
    highlight,
    question,
    serialiseArray(tags),
    imageData,
    createdAt,
  );

  return findBlogPostById(id);
};

export const findBlogPostById = (id) => {
  if (!id) {
    return null;
  }
  const row = db.prepare(`${selectBase} WHERE b.id = ?`).get(id);
  if (!row) {
    return null;
  }
  const [post] = attachCommentsToPosts([mapRow(row)]);
  return post ?? null;
};

export const deleteBlogPost = (id, actorId) => {
  if (!id || !actorId) {
    const error = new Error('Missing blog post or actor id.');
    error.code = 'BLOG_DELETE_INVALID';
    throw error;
  }

  const existing = findBlogPostById(id);
  if (!existing) {
    const error = new Error('Blog post not found.');
    error.code = 'BLOG_POST_NOT_FOUND';
    throw error;
  }
  const actor = findAccountById(actorId);
  if (!actor) {
    const error = new Error('Requesting account not found.');
    error.code = 'BLOG_DELETE_INVALID';
    throw error;
  }
  const isAdmin = isAdminAccount(actor);

  if (!isAdmin && existing.authorId !== actorId) {
    const error = new Error('Only the author or an admin can delete this post.');
    error.code = 'BLOG_DELETE_FORBIDDEN';
    throw error;
  }

  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
};

const findBlogCommentById = (id) => {
  if (!id) {
    return null;
  }
  const row = db.prepare(`${commentSelectBase} WHERE c.id = ?`).get(id);
  return row ? mapCommentRow(row) : null;
};

export const listBlogPostComments = (postId) => {
  if (!postId) {
    return [];
  }
  const grouped = listCommentsForPostIds([postId]);
  return grouped.get(postId) ?? [];
};

export const createBlogComment = ({ postId, authorId, message }) => {
  if (!postId || !authorId || !message?.trim()) {
    const error = new Error('Missing required comment fields.');
    error.code = 'BLOG_COMMENT_INVALID';
    throw error;
  }

  const existingPost = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(postId);
  if (!existingPost) {
    const error = new Error('Blog post not found.');
    error.code = 'BLOG_POST_NOT_FOUND';
    throw error;
  }

  const author = findAccountById(authorId);
  if (!author) {
    const error = new Error('Author account not found.');
    error.code = 'BLOG_AUTHOR_NOT_FOUND';
    throw error;
  }

  const id = createCommentId();
  const createdAt = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO blog_comments (
      id,
      post_id,
      author_id,
      message,
      created_at
    ) VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, postId, authorId, message.trim(), createdAt);

  return findBlogCommentById(id);
};
