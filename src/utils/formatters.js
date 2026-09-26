/**
 * Shared formatting and date utility helpers for Locora.
 */

/**
 * Format activity duration in minutes to human-readable format.
 * Examples:
 *   0, null, undefined, <=0 -> "0 min"
 *   30 -> "30 min"
 *   45 -> "45 min"
 *   60 -> "1 hr"
 *   90 -> "1 hr 30 min"
 *   120 -> "2 hrs"
 *   150 -> "2 hrs 30 min"
 *   180 -> "3 hrs"
 *
 * @param {number|string} durationInput - Duration in minutes or numeric string
 * @returns {string} Formatted duration string
 */
export const formatDuration = (durationInput) => {
  if (durationInput === null || durationInput === undefined || durationInput === '') {
    return '0 min';
  }

  let mins = typeof durationInput === 'number'
    ? durationInput
    : parseInt(String(durationInput).replace(/[^0-9]/g, ''), 10);

  if (isNaN(mins) || mins <= 0) {
    return '0 min';
  }

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours === 0) {
    return `${remainingMins} min`;
  }

  const hrUnit = hours === 1 ? 'hr' : 'hrs';

  if (remainingMins === 0) {
    return `${hours} ${hrUnit}`;
  }

  return `${hours} ${hrUnit} ${remainingMins} min`;
};

/**
 * Get the current local calendar date string (YYYY-MM-DD).
 * Prevents UTC timezone rollover bugs.
 *
 * @param {Date} [dateObj] - Optional Date object (defaults to now)
 * @returns {string} YYYY-MM-DD in local time
 */
export const getTodayLocalDateString = (dateObj = new Date()) => {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
