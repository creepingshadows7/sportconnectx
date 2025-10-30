import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import { createEvent, deleteEvent, listEvents } from '../data/eventDb.js';
import { formatDateTime, readFileAsDataUrl } from '../utils/media.js';
import { isAdminAccount } from '../utils/admin.js';

const INITIAL_FORM_STATE = {
  title: '',
  meta: '',
  description: '',
  tags: '',
  imageData: null,
  imagePreview: '',
};

export default function Activities() {
  const { currentAccount, isAuthenticated } = useAuth();
  const isAdmin = isAdminAccount(currentAccount);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load events', err);
      setError('Could not load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [events],
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
      setFormError('Log in to share events with the community.');
      return;
    }

    const title = formState.title.trim();
    const meta = formState.meta.trim();
    const description = formState.description.trim();
    const tagList = formState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!title || !meta) {
      setFormError('Please add an event title and schedule.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormMessage('');
    try {
      await createEvent({
        authorId: currentAccount.id,
        title,
        meta,
        description,
        tags: tagList,
        imageData: formState.imageData,
      });
      setFormState(INITIAL_FORM_STATE);
      setFormMessage('Event added to the line-up!');
      await fetchEvents();
    } catch (err) {
      console.error('Failed to create event', err);
      const message = err?.message ?? 'We could not save this event right now.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!currentAccount) {
      return;
    }
    const confirmDelete = window.confirm('Delete this event? This cannot be undone.');
    if (!confirmDelete) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteEvent(id, currentAccount.id);
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete event', err);
      const message = err?.message ?? 'We could not delete this event.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="section page-intro">
        <div className="section-header">
          <span className="section-eyebrow">Events</span>
          <h3>Craft the playbook for shared sporting moments</h3>
        </div>
        <p className="lead">
          Design the flows, tools, and rituals that keep the SportConnect community energised. Blend data-driven insights
          with playful storytelling so every meetup feels tailored and unforgettable.
        </p>
      </section>

      <section className="section create-activity">
        <div className="section-header">
          <span className="section-eyebrow">New concept</span>
          <h3>Spin up your next SportConnect event</h3>
        </div>
        <article className="card form-card">
          <form onSubmit={handleSubmit} className="activity-form">
            <div className="form-grid">
              <label className="input-control">
                <span>Event title</span>
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleChange}
                  placeholder="Night swim crew meet-up"
                  disabled={submitting}
                />
              </label>
              <label className="input-control">
                <span>Schedule & location</span>
                <input
                  type="text"
                  name="meta"
                  value={formState.meta}
                  onChange={handleChange}
                  placeholder="Thursdays | 20:15 | Tongelreep"
                  disabled={submitting}
                />
              </label>
            </div>
            <label className="input-control">
              <span>Experience highlight</span>
              <textarea
                name="description"
                rows="3"
                value={formState.description}
                onChange={handleChange}
                placeholder="Outline the vibe, goals, or the tools you want to prototype."
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
                placeholder="Swimming, Community, Nightlife"
                disabled={submitting}
              />
            </label>
            <label className="input-control">
              <span>Event image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={submitting}
              />
            </label>
            {formState.imagePreview && (
              <div className="image-preview">
                <img src={formState.imagePreview} alt="Event preview" />
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="button primary" disabled={submitting}>
                {submitting ? 'Posting...' : 'Add event'}
              </button>
              {formMessage && <span className="form-feedback">{formMessage}</span>}
              {formError && <span className="form-error">{formError}</span>}
              {!isAuthenticated && !formError && (
                <span className="form-hint">Log in to publish and manage your events.</span>
              )}
            </div>
          </form>
        </article>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">Featured line-up</span>
          <h3>Prototype events that beg to be joined</h3>
        </div>

        {loading ? (
          <p className="form-feedback">Loading events...</p>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : sortedEvents.length === 0 ? (
          <p className="empty-state">No events yet. Be the first to spark one!</p>
        ) : (
          <div className="card-grid">
            {sortedEvents.map((eventItem) => (
              <article key={eventItem.id} className="card media-card">
                {eventItem.imageData && (
                  <div className="card-media">
                    <img src={eventItem.imageData} alt={`${eventItem.title} visual`} />
                  </div>
                )}
                <div className="card-top">
                  <span className="card-meta">{eventItem.meta}</span>
                  <h4>{eventItem.title}</h4>
                </div>
                <p>{eventItem.description || 'Stay tuned for more details.'}</p>
                <div className="tag-row">
                  {eventItem.tags.length > 0 ? (
                    eventItem.tags.map((tag) => (
                      <span key={`${eventItem.id}-${tag}`} className="tag">{tag}</span>
                    ))
                  ) : (
                    <span className="tag muted">Fresh drop</span>
                  )}
                </div>
                <footer className="card-meta card-meta-footer">
                  <span>Hosted by {eventItem.authorName}</span>
                  <span>{formatDateTime(eventItem.createdAt)}</span>
                </footer>
                {(() => {
                  const isOwner = currentAccount?.id === eventItem.authorId;
                  const canDelete = isOwner || isAdmin;
                  if (!canDelete) {
                    return null;
                  }
                  return (
                    <button
                      type="button"
                      className="button ghost full"
                      onClick={() => handleDelete(eventItem.id)}
                      disabled={deletingId === eventItem.id}
                    >
                      {deletingId === eventItem.id ? 'Removing...' : 'Delete event'}
                    </button>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">Activity toolkit</span>
          <h3>Build the features that keep groups synchronised</h3>
        </div>
        <div className="card-grid">
          {[
            {
              title: 'Activity Templates',
              description: 'Spin up training plans with built-in messaging, RSVPs, and equipment checklists.',
            },
            {
              title: 'Group Insights',
              description: 'Understand participation trends, favourite sports, and invite responsiveness.',
            },
            {
              title: 'Smart Matching',
              description: 'Match sporters based on availability, goals, and intensity preferences.',
            },
            {
              title: 'Safety & Fair Play',
              description: 'Preset guidelines and quick-report flows keep activities respectful and fun.',
            },
          ].map((item) => (
            <article key={item.title} className="card">
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
