/**
 * Date utility functions with timezone handling
 */

/**
 * Get current date in YYYY-MM-DD format (UTC)
 */
export function getCurrentDateUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get current date in YYYY-MM-DD format (local timezone)
 */
export function getCurrentDateLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object (assumes UTC if no timezone specified)
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  return new Date(dateStr);
}

/**
 * Format date to YYYY-MM-DD (UTC)
 */
export function formatDateUTC(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date to YYYY-MM-DD (local timezone)
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date to DD/MM/YYYY (French format)
 */
export function formatDateFrench(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date to DD/MM/YYYY (Arabic format)
 */
export function formatDateArabic(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format time to HH:MM (24-hour format)
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Combine date and time strings into a Date object
 */
export function combineDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  return date;
}

/**
 * Check if date is in the past
 */
export function isPastDate(dateStr: string): boolean {
  const date = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if date is in the future
 */
export function isFutureDate(dateStr: string): boolean {
  const date = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  const date = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1Str: string, date2Str: string): number {
  const date1 = parseDate(date1Str);
  const date2 = parseDate(date2Str);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateUTC(date);
}

/**
 * Get start of month
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Format date to locale string based on current language
 */
export function formatDateLocale(date: Date, locale: "fr" | "ar" = "fr"): string {
  if (locale === "ar") {
    return formatDateArabic(date);
  }
  return formatDateFrench(date);
}
