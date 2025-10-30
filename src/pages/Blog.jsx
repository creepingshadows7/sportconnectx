import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import {
  createBlogComment,
  createBlogPost,
  deleteBlogPost,
  listBlogPosts,
} from '../data/blogDb.js';
import { formatDateTime, readFileAsDataUrl } from '../utils/media.js';
import { isAdminAccount } from '../utils/admin.js';

const INITIAL_FORM_STATE = {
  title: '',
  sport: '',
  highlight: '',
  question: '',
  tags: '',
  imageData: null,
  imagePreview: '',
};

const IDEA_PROMPTS = [
  'Drop a behind-the-scenes sketch of your favourite drill.',
  'Share the metric or signal you chase before declaring an activity a win.',
  'Offer a remix of a classic sport ritual tailored for SportConnect X.',
  'Pose a "what if?" that you want the community to prototype with you.',
];

const RESOURCE_BLOCKS = [
  {
    title: 'Community Playbook',
    description: 'Working doc with tone-of-voice snippets, moderation cues, and buddy system pairings.',
  },
  {
    title: 'Signal Radar',
    description: 'Track the questions your club keeps repeating and tag them for future experiments.',
  },
  {
    title: 'Spotlight Toolkit',
    description: 'Template slides and social crops to amplify standout activities within minutes.',
  },
];

export default function Blog() {
  const { currentAccount, isAuthenticated } = useAuth();
  const isAdmin = isAdminAccount(currentAccount);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteSubmitting, setDeleteSubmitting] = useState({});

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBlogPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load blog posts', err);
      setError('Could not load community posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const uniqueTags = useMemo(() => {
    const collected = new Set();
    posts.forEach((post) => {
      (post.tags ?? []).forEach((tag) => collected.add(tag));
    });
    return Array.from(collected);
  }, [posts]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [posts],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (formError) {
      setFormError('');
    }
    if (formMessage) {
      setFormMessage('');
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormState((prev) => ({ ...prev, imageData: null, imagePreview: '' }));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormState((prev) => ({ ...prev, imageData: dataUrl, imagePreview: dataUrl }));
    } catch (err) {
      console.error(err);
      setFormError('We could not process that image. Try a different file.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated || !currentAccount) {
      setFormError('Log in to publish to the blog.');
      return;
    }

    const title = formState.title.trim();
    const sport = formState.sport.trim();
    const highlight = formState.highlight.trim();
    const question = formState.question.trim();
    const tags = formState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!title || (!highlight && !question)) {
      setFormError('Add a headline plus a story or question for the crew.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormMessage('');
    try {
      await createBlogPost({
        authorId: currentAccount.id,
        title,
        sport,
        highlight,
        question,
        tags,
        imageData: formState.imageData,
      });
      setFormState(INITIAL_FORM_STATE);
      setFormMessage('Story shared with the community!');
      await fetchPosts();
    } catch (err) {
      console.error('Failed to create blog post', err);
      const message = err?.message ?? 'We could not publish this post right now.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCommentDraft = (postId) => commentDrafts[postId] ?? '';

  const clearCommentError = (postId) => {
    setCommentErrors((prev) => {
      if (!prev[postId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }));
    clearCommentError(postId);
  };

  const handleCommentSubmit = async (event, postId) => {
    event.preventDefault();
    if (!isAuthenticated || !currentAccount) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'Log in to join the thread.',
      }));
      return;
    }

    const draft = getCommentDraft(postId).trim();
    if (!draft) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'Add a thought before posting.',
      }));
      return;
    }

    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    clearCommentError(postId);
    try {
      const comment = await createBlogComment(postId, {
        authorId: currentAccount.id,
        message: draft,
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments ?? []), comment] }
            : post,
        ),
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to create comment', err);
      const message = err?.message ?? 'Could not post your comment. Please try again.';
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: message,
      }));
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!isAuthenticated || !currentAccount) {
      setDeleteErrors((prev) => ({
        ...prev,
        [postId]: 'Log in to manage your posts.',
      }));
      return;
    }

    const post = posts.find((item) => item.id === postId);
    const isAuthor = post?.authorId === currentAccount.id;
    if (!post) {
      setDeleteErrors((prev) => ({
        ...prev,
        [postId]: 'We could not find that post.',
      }));
      return;
    }
    if (!isAuthor && !isAdmin) {
      setDeleteErrors((prev) => ({
        ...prev,
        [postId]: 'Only the author or an admin can remove this thread.',
      }));
      return;
    }

    setDeleteSubmitting((prev) => ({ ...prev, [postId]: true }));
    setDeleteErrors((prev) => {
      if (!prev[postId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    try {
      await deleteBlogPost(postId, currentAccount.id);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      console.error('Failed to delete blog post', err);
      const message = err?.message ?? 'Could not delete this thread. Please try again.';
      setDeleteErrors((prev) => ({
        ...prev,
        [postId]: message,
      }));
    } finally {
      setDeleteSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <>
      <section className="section page-intro">
        <div className="section-header">
          <span className="section-eyebrow">Blog</span>
          <h3>Collect the brightest SportConnect stories</h3>
        </div>
        <p className="lead">
          Share the experiments, rituals, and insights that energise your crews. Capture the learnings while they&rsquo;re
          fresh so the community can remix them.
        </p>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">Add your perspective</span>
          <h3>Publish a spotlight for the community</h3>
        </div>
        <div className="card-grid">
          <article className="card form-card">
            <form onSubmit={handleSubmit} className="activity-form">
              <label className="input-control">
                <span>Headline</span>
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleChange}
                  placeholder="How do you onboard first-time futsal keepers?"
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>Sport / context</span>
                <input
                  type="text"
                  name="sport"
                  value={formState.sport}
                  onChange={handleChange}
                  placeholder="Futsal | Beginner friendly"
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>What happened?</span>
                <textarea
                  name="highlight"
                  rows="3"
                  value={formState.highlight}
                  onChange={handleChange}
                  placeholder="Share the insight, experiment, or story moment worth unpacking."
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>Question for the crew</span>
                <textarea
                  name="question"
                  rows="2"
                  value={formState.question}
                  onChange={handleChange}
                  placeholder="What do you want feedback on?"
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  name="tags"
                  value={formState.tags}
                  onChange={handleChange}
                  placeholder="Retention, Accessibility, Team rituals"
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>Cover image (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={submitting}
                />
              </label>
              {formState.imagePreview && (
                <div className="image-preview">
                  <img src={formState.imagePreview} alt="Blog post preview" />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish thread'}
                </button>
                {formMessage && <span className="form-feedback">{formMessage}</span>}
                {formError && <span className="form-error">{formError}</span>}
                {!isAuthenticated && !formError && (
                  <span className="form-hint">Log in to publish under your name.</span>
                )}
              </div>
            </form>
          </article>

          <article className="card">
            <h4>Conversation sparks</h4>
            <ul className="playlist-points">
              {IDEA_PROMPTS.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
            <div className="tag-row">
              {uniqueTags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">Latest threads</span>
          <h3>See what the SportConnect community is riffing on</h3>
        </div>

        {loading ? (
          <p className="form-feedback">Loading stories...</p>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : sortedPosts.length === 0 ? (
          <p className="empty-state">No posts yet. Start the first conversation!</p>
        ) : (
          <div className="card-grid">
            {sortedPosts.map((post) => {
              const questions = post.question
                ? post.question
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                : [];
              const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : ['Fresh drop'];
              const comments = Array.isArray(post.comments) ? post.comments : [];
              const isAuthor = currentAccount?.id === post.authorId;
              const canManagePost = isAuthor || isAdmin;
              return (
                <article key={post.id} className="card media-card">
                  {post.imageData && (
                    <div className="card-media">
                      <img src={post.imageData} alt={`${post.title} cover`} />
                    </div>
                  )}
                  <div className="card-top">
                    <span className="card-meta">{post.sport || 'Multi-sport'}</span>
                    <div className="card-title-bar">
                      <h4>{post.title}</h4>
                      {canManagePost && (
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={Boolean(deleteSubmitting[post.id])}
                        >
                          {deleteSubmitting[post.id] ? 'Removing...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                  {deleteErrors[post.id] && <p className="form-error">{deleteErrors[post.id]}</p>}
                  {post.highlight && <p>{post.highlight}</p>}
                  {questions.length > 0 && (
                    <div className="blog-questions">
                      <span className="card-meta">Questions for you</span>
                      <ul className="playlist-points">
                        {questions.map((questionLine) => (
                          <li key={questionLine}>{questionLine}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="tag-row">
                    {tags.map((tag) => (
                      <span key={`${post.id}-${tag}`} className="tag">{tag}</span>
                    ))}
                  </div>
                  {comments.length > 0 && (
                    <div className="comment-thread">
                      <span className="card-meta">Thread replies</span>
                      <ul className="comment-list">
                        {comments.map((comment) => (
                          <li key={comment.id} className="comment-item">
                            <div className="comment-header">
                              <span className="comment-author">{comment.authorName}</span>
                              <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
                            </div>
                            <p>{comment.message}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <form className="comment-form" onSubmit={(event) => handleCommentSubmit(event, post.id)}>
                    <label className="input-control">
                      <span>Add your reply</span>
                      <textarea
                        rows="2"
                        value={getCommentDraft(post.id)}
                        onChange={(event) => handleCommentChange(post.id, event.target.value)}
                        placeholder={isAuthenticated ? 'Keep the conversation going...' : 'Log in to reply'}
                        disabled={Boolean(commentSubmitting[post.id])}
                      />
                    </label>
                    <div className="comment-form-actions">
                      <button
                        type="submit"
                        className="button ghost"
                        disabled={Boolean(commentSubmitting[post.id])}
                      >
                        {commentSubmitting[post.id] ? 'Posting...' : 'Reply'}
                      </button>
                      {commentErrors[post.id] ? (
                        <p className="form-error">{commentErrors[post.id]}</p>
                      ) : (
                        !isAuthenticated && <span className="form-hint">Log in to add your reply.</span>
                      )}
                    </div>
                  </form>
                  <footer className="card-meta card-meta-footer">
                    <span>Shared by {post.authorName}</span>
                    <span>{formatDateTime(post.createdAt)}</span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">Co-create resources</span>
          <h3>Turn the smartest takes into reusable assets</h3>
        </div>
        <div className="card-grid compact">
          {RESOURCE_BLOCKS.map((resource) => (
            <article key={resource.title} className="card">
              <h4>{resource.title}</h4>
              <p>{resource.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
