const resolveDefaultApiBase = () => {
  // Always use your deployed backend on Render
  return 'https://sportconnectx-server.onrender.com/api';
};


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? resolveDefaultApiBase();
const SESSION_KEY = 'scx.session.v1';
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const buildUrl = (path) => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
};

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, headers = {} } = options;

const response = await fetch(buildUrl(path), {
  method,
  mode: 'cors',              // 👈 Add this line
  credentials: 'include',    // 👈 Add this line (important for cookies / auth)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  },
  body: body === null ? undefined : JSON.stringify(body),
});



  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
};

export const apiRequest = request;

export const listAccounts = () => request('/accounts');

export const getAccountById = (id) => {
  if (!id) {
    return Promise.resolve(null);
  }
  return request(`/accounts/${id}`);
};

export const createAccount = (payload) => request('/accounts', {
  method: 'POST',
  body: payload,
});

export const updateAccount = (id, updates) => request(`/accounts/${id}`, {
  method: 'PATCH',
  body: updates,
});

export const loginAccount = (email, password) => request('/login', {
  method: 'POST',
  body: { email, password },
});

export const deleteAccount = (accountId, requesterId) => request(`/admin/accounts/${accountId}`, {
  method: 'DELETE',
  body: { requesterId },
});

export const verifyAccountAsAdmin = (accountId, requesterId) => request(`/admin/accounts/${accountId}/verify`, {
  method: 'POST',
  body: { requesterId },
});

export const updateAccountPassword = (id, { currentPassword, newPassword }) => request(`/accounts/${id}/password`, {
  method: 'PATCH',
  body: { currentPassword, newPassword },
});

export const verifyEmailAddress = (email, code) => request('/accounts/verify-email', {
  method: 'POST',
  body: { email, code },
});

export const getActiveAccountId = () => {
  if (!isBrowser) {
    return null;
  }
  return window.localStorage.getItem(SESSION_KEY);
};

export const setActiveAccountId = (id) => {
  if (!isBrowser) {
    return;
  }
  if (!id) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, id);
};

export const clearActiveAccountId = () => {
  if (!isBrowser) {
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
};

