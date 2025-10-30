export const getInitials = (name = '') => {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
};
