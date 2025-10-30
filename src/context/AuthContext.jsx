import {
  clearActiveAccountId,
  createAccount,
  getActiveAccountId,
  listAccounts,
  loginAccount,
  setActiveAccountId,
  updateAccount,
  updateAccountPassword,
  verifyEmailAddress,
} from '../data/accountDb.js';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext.js';

const sanitiseAccount = (account) => (account ? { ...account } : null);

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsLoadError, setAccountsLoadError] = useState(null);
  const [currentAccountId, setCurrentAccountId] = useState(() => getActiveAccountId());
  const [authError, setAuthError] = useState(null);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoaded(false);
    setAccountsLoadError(null);
    try {
      const data = await listAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load accounts', error);
      setAccounts([]);
      setAccountsLoadError(error);
    } finally {
      setAccountsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    if (!accountsLoaded || accountsLoadError || !currentAccountId) {
      return;
    }
    const exists = accounts.some((account) => account.id === currentAccountId);
    if (!exists) {
      clearActiveAccountId();
      setCurrentAccountId(null);
    }
  }, [accounts, accountsLoaded, accountsLoadError, currentAccountId]);

  const currentAccount = useMemo(
    () => sanitiseAccount(accounts.find((account) => account.id === currentAccountId)),
    [accounts, currentAccountId],
  );
  const hasActiveAccount = Boolean(currentAccount);

  const login = useCallback(
    async (email, password) => {
      if (!email || !password) {
        throw new Error('Please provide both email and password.');
      }

      setAuthError(null);
      try {
        const account = await loginAccount(email.trim(), password);
        setActiveAccountId(account.id);
        setCurrentAccountId(account.id);
        await refreshAccounts();
        return sanitiseAccount(account);
      } catch (error) {
        const message = error?.message ?? 'Invalid email or password.';
        setAuthError(message);
        throw error;
      }
    },
    [refreshAccounts],
  );

  const signup = useCallback(
    async (payload) => {
      const { email, password, name } = payload || {};
      if (!email || !password || !name) {
        throw new Error('Please fill in all required fields.');
      }

      setAuthError(null);
      const account = await createAccount(payload);
      await refreshAccounts();
      return sanitiseAccount(account);
    },
    [refreshAccounts],
  );

  const logout = useCallback(() => {
    clearActiveAccountId();
    setCurrentAccountId(null);
    void refreshAccounts();
  }, [refreshAccounts]);

  const updateProfile = useCallback(
    async (updates) => {
      if (!currentAccountId) {
        throw new Error('No active account.');
      }
      const updated = await updateAccount(currentAccountId, updates);
      await refreshAccounts();
      return sanitiseAccount(updated);
    },
    [currentAccountId, refreshAccounts],
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      if (!currentAccountId) {
        throw new Error('No active account.');
      }
      const updated = await updateAccountPassword(currentAccountId, {
        currentPassword,
        newPassword,
      });
      await refreshAccounts();
      return sanitiseAccount(updated);
    },
    [currentAccountId, refreshAccounts],
  );

  const verifyEmail = useCallback(
    async ({ email, code }) => {
      const account = await verifyEmailAddress(email, code);
      await refreshAccounts();
      return sanitiseAccount(account);
    },
    [refreshAccounts],
  );

  const value = useMemo(
    () => ({
      accounts: accounts.map(sanitiseAccount),
      currentAccount,
      currentAccountId,
      isAuthenticated: hasActiveAccount,
      authError,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      verifyEmail,
    }),
    [
      accounts,
      currentAccount,
      currentAccountId,
      hasActiveAccount,
      authError,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
