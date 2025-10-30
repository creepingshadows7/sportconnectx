export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to process file.'));
    reader.readAsDataURL(file);
  });

export const formatDateTime = (value) => {
  if (!value) {
    return '';
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
};
