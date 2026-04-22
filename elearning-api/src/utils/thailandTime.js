const THAI_TIMEZONE = 'Asia/Bangkok';
const THAI_OFFSET_HOURS = 7;
const DEFAULT_REMINDER_TIME = '09:00';

const pad = (value) => String(value).padStart(2, '0');

const getThailandDateParts = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date');
    }

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

const normalizeReminderTime = (value) => {
    if (value === undefined || value === null || value === '') {
        return DEFAULT_REMINDER_TIME;
    }

    const trimmedValue = String(value).trim();
    const match = trimmedValue.match(/^(\d{2}):(\d{2})$/);

    if (!match) {
        throw new Error('Reminder time must be in HH:mm format');
    }

    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Reminder time must be in HH:mm format');
    }

    return `${pad(hours)}:${pad(minutes)}`;
};

const parseReminderTime = (value) => {
    const normalizedValue = normalizeReminderTime(value);
    const [hour, minute] = normalizedValue.split(':').map((item) => Number.parseInt(item, 10));

    return { hour, minute, normalizedValue };
};

const buildUtcDateFromThailandParts = ({ year, month, day, hour = 0, minute = 0, second = 0 }) => (
    new Date(Date.UTC(year, month - 1, day, hour - THAI_OFFSET_HOURS, minute, second, 0))
);

const addThailandDays = (value, days, timeValue = DEFAULT_REMINDER_TIME) => {
    const baseParts = getThailandDateParts(value);
    const { hour, minute, normalizedValue } = parseReminderTime(timeValue);
    const shiftedDate = new Date(Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day + days, 0, 0, 0, 0));

    return {
        date: buildUtcDateFromThailandParts({
            year: shiftedDate.getUTCFullYear(),
            month: shiftedDate.getUTCMonth() + 1,
            day: shiftedDate.getUTCDate(),
            hour,
            minute,
            second: 0
        }),
        normalizedTime: normalizedValue
    };
};

const subtractThailandDays = (value, days, timeValue = DEFAULT_REMINDER_TIME) => addThailandDays(value, -days, timeValue);

module.exports = {
    THAI_TIMEZONE,
    DEFAULT_REMINDER_TIME,
    normalizeReminderTime,
    addThailandDays,
    subtractThailandDays
};
