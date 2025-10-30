import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { deleteAccount as deleteAccountRequest, listAccounts, verifyAccountAsAdmin } from '../data/accountDb.js';
import { isAdminAccount } from '../utils/admin.js';

const formatPlainPassword = (value) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return 'Not available';
};

const formatPasswordHashPreview = (hash) => {
  if (!hash) {
    return 'Hash unavailable';
  }
  if (hash.length <= 40) {
    return hash;
  }
  return `${hash.slice(0, 28)}…${hash.slice(-10)}`;
};

const VerificationBadge = ({ verified }) => {
  if (verified) {
    return <span className="admin-status is-verified">Verified</span>;
  }
  return <span className="admin-status is-pending">Pending</span>;
};

export default function Admin() {
  const { currentAccount, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const isAdmin = useMemo(() => isAdminAccount(currentAccount), [currentAccount]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts', err);
      setError('We could not fetch the account directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void fetchAccounts();
  }, [fetchAccounts, isAdmin]);

  const handleDelete = async (id) => {
    if (!id || id === currentAccount?.id) {
      return;
    }
    const confirmDelete = window.confirm('Remove this account? This action cannot be undone.');
    if (!confirmDelete) {
      return;
    }
    setDeletingId(id);
    setError('');
    try {
      await deleteAccountRequest(id, currentAccount.id);
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
      setError(err?.message ?? 'We could not delete that account.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerify = async (id, alreadyVerified) => {
    if (!id || alreadyVerified || !currentAccount?.id) {
      return;
    }
    setVerifyingId(id);
    setError('');
    try {
      await verifyAccountAsAdmin(id, currentAccount.id);
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to verify account', err);
      setError(err?.message ?? 'We could not verify that account.');
    } finally {
      setVerifyingId(null);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="section">
      <div className="section-header">
        <span className="section-eyebrow">Admin access</span>
        <h3>Manage SportConnect accounts</h3>
        <p>Review registered profiles, inspect credentials, and remove accounts that should not be active.</p>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="form-feedback">Loading account directory...</p>
      ) : accounts.length === 0 ? (
        <p className="empty-state">No accounts are registered right now.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
            <span>Passwords</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          {accounts.map((account) => (
            <div key={account.id} className="admin-table__row">
              <span title={account.name}>{account.name}</span>
              <span title={account.email}>{account.email}</span>
              <span>
                <VerificationBadge verified={Boolean(account.emailVerified)} />
              </span>
              <span className="admin-table__password" title={account.passwordHash || account.password || 'No password data'}>
                <strong>{formatPlainPassword(account.password)}</strong>
                <small>
                  <span className="admin-table__password-label">Hash</span>
                  <span className="admin-table__password-hash">
                    {account.passwordHash ? formatPasswordHashPreview(account.passwordHash) : '—'}
                  </span>
                </small>
              </span>
              <span>{new Date(account.createdAt).toLocaleString()}</span>
              <span className="admin-table__actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => handleVerify(account.id, account.emailVerified)}
                  disabled={account.emailVerified || verifyingId === account.id}
                >
                  {account.emailVerified
                    ? 'Verified'
                    : verifyingId === account.id
                      ? 'Verifying...'
                      : 'Verify user'}
                </button>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => handleDelete(account.id)}
                  disabled={deletingId === account.id || account.id === currentAccount.id}
                >
                  {deletingId === account.id ? 'Removing...' : 'Delete'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="form-hint">Default admin account cannot be deleted from this panel.</p>
    </section>
  );
}
