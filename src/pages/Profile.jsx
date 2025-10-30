import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { getInitials } from '../utils/name.js';

const toFormState = (account) => ({
  name: account?.name ?? '',
  role: account?.role ?? '',
  location: account?.location ?? '',
  bio: account?.bio ?? '',
  focusAreas: (account?.focusAreas ?? []).join(', '),
  upcoming: (account?.upcoming ?? [])
    .map((item) => `${item.title} | ${item.detail}`)
    .join('\n'),
});

const parseFocusAreas = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseUpcoming = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, detail] = line.split('|').map((part) => part.trim());
      return { title, detail: detail ?? '' };
    });

export default function Profile() {
  const {
    currentAccount,
    isAuthenticated,
    logout,
    updateProfile,
    changePassword,
  } = useAuth();

  const [formState, setFormState] = useState(toFormState(currentAccount));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    setFormState(toFormState(currentAccount));
    setStatus(null);
    setError(null);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordStatus(null);
    setPasswordError(null);
  }, [currentAccount]);

  const initials = useMemo(() => getInitials(currentAccount?.name ?? ''), [currentAccount]);
  const stats = currentAccount?.stats ?? [];
  const focusAreas = currentAccount?.focusAreas ?? [];
  const upcoming = currentAccount?.upcoming ?? [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      await updateProfile({
        name: formState.name.trim(),
        role: formState.role.trim(),
        location: formState.location.trim(),
        bio: formState.bio.trim(),
        focusAreas: parseFocusAreas(formState.focusAreas),
        upcoming: parseUpcoming(formState.upcoming),
      });
      setStatus('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordStatus(null);
    setPasswordError(null);

    const trimmed = {
      currentPassword: passwordForm.currentPassword.trim(),
      newPassword: passwordForm.newPassword.trim(),
      confirmPassword: passwordForm.confirmPassword.trim(),
    };

    if (!trimmed.currentPassword || !trimmed.newPassword || !trimmed.confirmPassword) {
      setPasswordError('Fill in all password fields.');
      setChangingPassword(false);
      return;
    }

    if (trimmed.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      setChangingPassword(false);
      return;
    }

    if (trimmed.newPassword !== trimmed.confirmPassword) {
      setPasswordError('Password confirmation does not match.');
      setChangingPassword(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: trimmed.currentPassword,
        newPassword: trimmed.newPassword,
      });
      setPasswordStatus('Password updated successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err?.message ?? 'Could not update password right now.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isAuthenticated || !currentAccount) {
    return (
      <section className="section profile">
        <div className="section-header">
          <span className="section-eyebrow">Profile</span>
          <h3>Spotlight the sporters powering your platform</h3>
        </div>
        <div className="profile-empty panel">
          <h4>Welcome to SportConnect X</h4>
          <p>Log in or create an account to unlock personalised stats, focus areas, and upcoming activities tailored to you.</p>
          <div className="profile-empty-actions">
            <Link to="/login" className="button primary">
              Log in
            </Link>
            <Link to="/signup" className="button ghost">
              Sign up
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section profile">
      <div className="section-header">
        <span className="section-eyebrow">Profile</span>
        <h3>Spotlight the sporters powering your platform</h3>
      </div>

      <div className="profile-grid">
        <div className="profile-main">
          <article className="profile-card card">
            <div className="profile-card-header">
              <span className="profile-avatar" aria-hidden="true">{initials}</span>
              <div>
                <h2>{currentAccount.name}</h2>
                <p className="profile-meta">
                  {currentAccount.role || 'Role not set'} | {currentAccount.location || 'Location not set'}
                </p>
              </div>
            </div>
            <p className="profile-bio">{currentAccount.bio || 'Share your story to engage the community.'}</p>
            <button type="button" className="button ghost full" onClick={logout}>
              Log out
            </button>
          </article>

          <div className="profile-stats">
            {stats.length > 0 ? (
              stats.map((stat) => (
                <article key={stat.label} className="card stat-card">
                  <h4>{stat.value}</h4>
                  <p>{stat.label}</p>
                </article>
              ))
            ) : (
              <p className="empty-state">Add stats to highlight your impact.</p>
            )}
          </div>
        </div>

        <div className="profile-side">
          <div className="panel profile-panel">
            <span className="panel-label">Focus areas</span>
            {focusAreas.length > 0 ? (
              <ul className="profile-list">
                {focusAreas.map((focus) => (
                  <li key={focus}>{focus}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Add focus areas to share what energises you.</p>
            )}
          </div>

          <div className="panel profile-panel">
            <span className="panel-label">Upcoming commitments</span>
            {upcoming.length > 0 ? (
              <ul className="profile-list">
                {upcoming.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Keep your community in the loop with upcoming sessions.</p>
            )}
          </div>

          <div className="panel profile-panel">
            <span className="panel-label">Update profile</span>
            <form className="profile-edit-form" onSubmit={handleSubmit}>
              <label className="input-control">
                <span>Full name</span>
                <input
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleChange}
                  required
                />
              </label>
              <div className="form-grid">
                <label className="input-control">
                  <span>Role</span>
                  <input
                    name="role"
                    type="text"
                    value={formState.role}
                    onChange={handleChange}
                    placeholder="Coach, Strategist..."
                  />
                </label>
                <label className="input-control">
                  <span>Location</span>
                  <input
                    name="location"
                    type="text"
                    value={formState.location}
                    onChange={handleChange}
                    placeholder="City, Country"
                  />
                </label>
              </div>
              <label className="input-control">
                <span>Bio</span>
                <textarea
                  name="bio"
                  rows={3}
                  value={formState.bio}
                  onChange={handleChange}
                  placeholder="Share your story to inspire others."
                />
              </label>
              <label className="input-control">
                <span>Focus areas</span>
                <input
                  name="focusAreas"
                  type="text"
                  value={formState.focusAreas}
                  onChange={handleChange}
                  placeholder="Comma separated e.g. Inclusive onboarding, Training"
                />
              </label>
              <label className="input-control">
                <span>Upcoming commitments</span>
                <textarea
                  name="upcoming"
                  rows={3}
                  value={formState.upcoming}
                  onChange={handleChange}
                  placeholder="One per line, e.g. Sunset Run | Wed 19:00 | Stadium"
                />
              </label>
              {status && <p className="form-success">{status}</p>}
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="button primary full" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          <div className="panel profile-panel">
            <span className="panel-label">Change password</span>
            <form className="profile-edit-form" onSubmit={handlePasswordSubmit}>
              <label className="input-control">
                <span>Current password</span>
                <input
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFieldChange}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="input-control">
                <span>New password</span>
                <input
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFieldChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="input-control">
                <span>Confirm new password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFieldChange}
                  autoComplete="new-password"
                  required
                />
              </label>
              {passwordStatus && <p className="form-success">{passwordStatus}</p>}
              {passwordError && <p className="form-error">{passwordError}</p>}
              <button type="submit" className="button primary full" disabled={changingPassword}>
                {changingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
