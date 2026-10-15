const money = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });
const date = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatMoney = (amount) => money.format(amount ?? 0);
export const formatDate = (value) => date.format(new Date(value));

export const UNITS = [
  { value: 'project', label: 'per project', noun: 'project' },
  { value: 'month', label: 'per month', noun: 'month' },
  { value: 'day', label: 'per day', noun: 'day' },
];

export const unitLabel = (unit) => UNITS.find((u) => u.value === unit)?.label ?? '';

// "3 months", "1 project"
export function quantityLabel(quantity, unit) {
  const noun = UNITS.find((u) => u.value === unit)?.noun ?? 'item';
  return `${quantity} ${noun}${quantity === 1 ? '' : 's'}`;
}

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Images that ship with the site; the admin form offers them in a list.
export const IMAGES = [
  { value: '/img/security-audit.svg', label: 'Security audit' },
  { value: '/img/security-monitor.svg', label: 'Security monitoring' },
  { value: '/img/devops-pipeline.svg', label: 'DevOps pipeline' },
  { value: '/img/devops-cloud.svg', label: 'DevOps cloud' },
  { value: '/img/bi-dashboard.svg', label: 'BI dashboard' },
  { value: '/img/bi-warehouse.svg', label: 'BI data warehouse' },
];

export const FALLBACK_IMAGE = '/img/placeholder.svg';
