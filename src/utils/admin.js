export const ADMIN_EMAIL = 'mihailtsvetanov7@gmail.com';

export const isAdminAccount = (account) => {
  if (!account) {
    return false;
  }
  return (account.email ?? '').toLowerCase() === ADMIN_EMAIL;
};
