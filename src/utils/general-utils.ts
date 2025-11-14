/**
 * Convert a value to a Date object
 * @param value - The value to convert
 * @returns The Date object or null if the value is not a valid date
 */
export const convertToDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};
