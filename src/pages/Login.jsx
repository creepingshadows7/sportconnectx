import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function Login() {
  const { login, isAuthenticated, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (location.state?.email) {
      setFormState((prev) => ({ ...prev, email: location.state.email }));
    }
  }, [location.state]);

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
    setErrorDetails(null);
    try {
      await login(formState.email, formState.password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
      setErrorDetails(err.details ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error ?? authError;
  const needsVerification = errorDetails?.reason === 'EMAIL_NOT_VERIFIED';

  return (
    <section className="section auth-section">
      <div className="section-header">
        <span className="section-eyebrow">Welcome back</span>
        <h3>Log in to SportConnect X</h3>
      </div>

      <article className="card form-card auth-card">
        <form className="auth-form" onSubmit={handleSubmit}>
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
          <label className="input-control">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={formState.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          {displayError && <p className="form-error">{displayError}</p>}
          {needsVerification && (
            <p className="form-hint">
              Check your inbox for the 6-digit code or{' '}
              <Link to="/verify-email" state={{ email: formState.email }} className="link">
                verify your email
              </Link>{' '}
              to continue.
            </p>
          )}

          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </article>

      <p className="form-footer">
        New to SportConnect X?{' '}
        <Link to="/signup" className="link">
          Create an account
        </Link>
      </p>
    </section>
  );
}
