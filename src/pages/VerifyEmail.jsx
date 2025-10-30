import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function VerifyEmail() {
  const { isAuthenticated, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email ?? '';
  const [formState, setFormState] = useState({
    email: initialEmail,
    code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

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
    setStatus('');
    setError('');

    const email = formState.email.trim();
    const code = formState.code.trim();

    if (!email || !code) {
      setError('Fill in both your email and the verification code.');
      setSubmitting(false);
      return;
    }

    try {
      await verifyEmail({ email, code });
      setStatus('Email verified successfully! You can now log in.');
      setTimeout(() => {
        navigate('/login', { state: { email } });
      }, 1200);
    } catch (err) {
      setError(err?.message ?? 'We could not verify that code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section auth-section">
      <div className="section-header">
        <span className="section-eyebrow">Secure your spot</span>
        <h3>Verify your SportConnect X email</h3>
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
            <span>Verification code</span>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="6-digit code"
              value={formState.code}
              onChange={handleChange}
              required
              minLength={4}
            />
          </label>

          {status && <p className="form-success">{status}</p>}
          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Verifying...' : 'Verify email'}
          </button>
        </form>
      </article>

      <p className="form-footer">
        Didn&apos;t get the email? Check your spam folder or{' '}
        <Link to="/signup" className="link">
          register again
        </Link>
        .
      </p>
    </section>
  );
}
