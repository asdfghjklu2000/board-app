export const AVATAR_COLORS = [
  '#0078d4', '#5c2d91', '#00b294', '#d83b01',
  '#e3008c', '#107c41', '#b4009e', '#004e8c',
];

export function getAvatarColor(name) {
  if (!name) return '#0078d4';
  let hash = 0;
  for (const c of name) hash = (hash << 5) - hash + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
