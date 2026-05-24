export const determinePortalAction = (pathname: string) => {
  const lowered = pathname.toLowerCase();
  if (lowered.includes('/edit')) return 'edit';
  if (lowered.includes('/create')) return 'create';
  if (lowered.includes('/print')) return 'print';
  return 'view';
};

export const normalisePortalPath = (path: string | undefined | null) => {
  if (!path) return '';
  let cleaned = path.trim().replace(/^\/+/g, '');
  const prefix = 'dashboardportal/';
  if (cleaned.toLowerCase().startsWith(prefix)) {
    cleaned = cleaned.substring(prefix.length);
  }
  cleaned = cleaned.replace(/\/+/g, '/');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned.toLowerCase();
};
