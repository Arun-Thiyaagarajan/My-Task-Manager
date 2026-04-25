export type StartPagePreference = {
  path: string;
  label: string;
  setAt: string;
};

const DISALLOWED_START_PAGE_PREFIXES = ['/share/', '/s/'];
const DISALLOWED_START_PAGE_PATHS = ['/auth'];

export function normalizeStartPagePath(path: string | null | undefined) {
  if (!path) return '/';

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const [pathname] = normalized.split(/[?#]/);

  if (
    DISALLOWED_START_PAGE_PATHS.includes(pathname) ||
    DISALLOWED_START_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return '/';
  }

  return pathname || '/';
}

export function getStartPageLabel(path: string | null | undefined) {
  const normalized = normalizeStartPagePath(path);

  if (normalized === '/') return 'Tasks';
  if (normalized === '/dashboard') return 'Dashboard';
  if (normalized === '/notes') return 'Notes';
  if (normalized === '/reminders') return 'Reminders';
  if (normalized === '/profile') return 'Profile';
  if (normalized === '/settings') return 'Settings';
  if (normalized === '/logs') return 'Activity Logs';
  if (normalized === '/bin') return 'Bin';
  if (normalized === '/releases') return "What's New";
  if (normalized === '/help-center') return 'Help Center';
  if (normalized === '/about') return 'Help & About';
  if (normalized === '/insights') return 'Recent Activity';
  if (normalized === '/tasks/templates') return 'Templates';
  if (normalized === '/tasks/import/excel') return 'Excel Import';
  if (normalized.startsWith('/tasks/')) return 'Task Detail';
  if (normalized.startsWith('/notes/')) return 'Note Detail';
  if (normalized.startsWith('/feedback')) return 'Feedback';

  return normalized
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[-_]/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ') || 'Tasks';
}

export function buildStartPagePreference(path: string): StartPagePreference {
  const normalized = normalizeStartPagePath(path);

  return {
    path: normalized,
    label: getStartPageLabel(normalized),
    setAt: new Date().toISOString(),
  };
}
