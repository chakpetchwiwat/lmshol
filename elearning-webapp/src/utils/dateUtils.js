export const THAI_TIMEZONE = 'Asia/Bangkok';
export const THAI_OFFSET_HOURS = 7;
export const DEFAULT_REMINDER_TIME = '09:00';

const pad = (value) => String(value).padStart(2, '0');

const getDateFromValue = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getThailandDateParts = (value) => {
  const date = getDateFromValue(value);
  if (!date) return null;

  const thaiDate = new Date(date.getTime() + (THAI_OFFSET_HOURS * 60 * 60 * 1000));

  return {
    year: thaiDate.getUTCFullYear(),
    month: thaiDate.getUTCMonth() + 1,
    day: thaiDate.getUTCDate(),
    hour: thaiDate.getUTCHours(),
    minute: thaiDate.getUTCMinutes(),
    second: thaiDate.getUTCSeconds()
  };
};

const buildUtcDateFromThailandParts = ({ year, month, day, hour = 0, minute = 0, second = 0 }) => (
  new Date(Date.UTC(year, month - 1, day, hour - THAI_OFFSET_HOURS, minute, second, 0))
);

const formatPartsToInputValue = (parts, includeTime = true) => {
  if (!parts) return '';

  const datePart = `${pad(parts.year)}-${pad(parts.month)}-${pad(parts.day)}`;
  if (!includeTime) return datePart;

  return `${datePart}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

const parseInputValue = (value) => {
  if (!value) return null;

  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
    hour: Number.parseInt(match[4] || '0', 10),
    minute: Number.parseInt(match[5] || '0', 10),
    second: Number.parseInt(match[6] || '0', 10)
  };
};

export const normalizeReminderTime = (value) => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_REMINDER_TIME;
  }

  const match = String(value).trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return DEFAULT_REMINDER_TIME;

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return DEFAULT_REMINDER_TIME;
  }

  return `${pad(hour)}:${pad(minute)}`;
};

export const toUTCISOString = (localValue) => {
  if (!localValue) return null;

  const parsedValue = parseInputValue(localValue);
  if (!parsedValue) return null;

  return buildUtcDateFromThailandParts(parsedValue).toISOString();
};

export const toLocalInputValue = (utcValue) => {
  const parts = getThailandDateParts(utcValue);
  return formatPartsToInputValue(parts, true);
};

export const toThaiDateInputValue = (utcValue) => {
  const parts = getThailandDateParts(utcValue);
  return formatPartsToInputValue(parts, false);
};

export const toThailandCalendarDate = (value) => {
  const parts = getThailandDateParts(value);
  if (!parts) return null;

  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
};

const buildThaiFormatter = (options) => new Intl.DateTimeFormat('th-TH', {
  timeZone: THAI_TIMEZONE,
  ...options
});

export const formatThaiDateTime = (value, includeTime = false) => {
  const date = getDateFromValue(value);
  if (!date) return '-';

  const datePart = buildThaiFormatter({
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

  if (!includeTime) return datePart;

  const timePart = buildThaiFormatter({
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);

  return `${datePart} ${timePart}`;
};

export const formatThaiTime = (value) => {
  const date = getDateFromValue(value);
  if (!date) return '-';

  return buildThaiFormatter({
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

export const formatThaiFullDate = (value) => {
  const date = getDateFromValue(value);
  if (!date) return '-';

  const dateStr = buildThaiFormatter({
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);

  return `วันที่ ${dateStr}`;
};

export const toThaiYear = (value) => {
  const parts = getThailandDateParts(value);
  if (!parts) return '-';
  return parts.year + 543;
};

export const isExpiredAt = (value, referenceDate = new Date()) => {
  const date = getDateFromValue(value);
  const reference = getDateFromValue(referenceDate);
  if (!date || !reference) return false;
  return date <= reference;
};

export const filterVisibleTimedItems = (items, referenceDate = new Date()) => {
  if (!Array.isArray(items)) return [];

  return items.filter((item) => {
    if (!item) return false;
    if (item.isTemporary === true) return !isExpiredAt(item.expiredAt, referenceDate);
    if (item.isTemporary === false) return true;
    return !isExpiredAt(item.expiredAt, referenceDate);
  });
};

export const filterVisibleGoals = (goals, referenceDate = new Date()) => {
  if (!Array.isArray(goals)) return [];

  return goals.filter((goal) => !isExpiredAt(goal?.expiryDate, referenceDate));
};

export const REMINDER_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;
  const value = `${pad(hour)}:${pad(minute)}`;

  return {
    value,
    label: `${value} น.`
  };
});
