import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const initialState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
  location: '',
  bio: '',
};

export default function Signup() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      const email = formState.email.trim();
      await signup({
        name: formState.name.trim(),
        email,
        password: formState.password,
        role: formState.role.trim(),
        location: formState.location.trim(),
        bio: formState.bio.trim(),
      });
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section auth-section">
      <div className="section-header">
        <span className="section-eyebrow">Join the movement</span>
        <h3>Create your SportConnect X account</h3>
      </div>

      <article className="card form-card auth-card">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="input-control">
            <span>Full name</span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              value={formState.name}
              onChange={handleChange}
              required
              minLength={2}
            />
          </label>

          <label className="input-control">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={formState.email}
              onChange={handleChange}
              required
            />
          </label>

          <div className="form-grid">
            <label className="input-control">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                value={formState.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </label>
            <label className="input-control">
              <span>Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formState.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="input-control">
              <span>Role</span>
              <input
                name="role"
                type="text"
                value={formState.role}
                onChange={handleChange}
                placeholder="Coach, Trainer, Strategist..."
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
              placeholder="Tell the community about your focus areas."
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
          <p className="form-hint">We&apos;ll email you a 6-digit verification code right after you sign up.</p>
        </form>
      </article>

      <p className="form-footer">
        Already have an account?{' '}
        <Link to="/login" className="link">
          Log in
        </Link>
      </p>
    </section>
  );
}
