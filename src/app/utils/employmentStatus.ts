// Canonical employment statuses (keep in sync with backend employeeLog.service.js)
export const EMPLOYMENT_STATUSES = ['Internship', 'Probation', 'Permanent', 'Contract', 'Part-time'];

const ALIASES: Record<string, string> = {
  'full-time': 'Permanent',
  fulltime: 'Permanent',
  active: 'Permanent',
  permanent: 'Permanent',
  'on-contract': 'Contract',
  contract: 'Contract',
  intern: 'Internship',
  internship: 'Internship',
  probation: 'Probation',
  'part-time': 'Part-time',
  parttime: 'Part-time',
  separated: 'Separated',
};

// Older values (Full-time, Active, Intern…) are shown under their new name
export const normalizeStatus = (v?: string | null): string => {
  if (!v || !String(v).trim()) return '';
  return ALIASES[String(v).trim().toLowerCase()] || String(v).trim();
};

export const isSeparated = (v?: string | null) => normalizeStatus(v) === 'Separated';
