import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Format an ISO/date value in a specific IANA timezone. */
export function formatDateInTimeZone(
  value: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  pattern = "d MMM yyyy",
): string {
  return formatInTimeZone(new Date(value), timeZone, pattern);
}

export function formatDateTimeInTimeZone(
  value: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return formatInTimeZone(new Date(value), timeZone, "d MMM yyyy, h:mm a");
}

/** Today's date (yyyy-MM-dd) as seen in the given timezone. */
export function todayInTimeZone(timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}

/** A best-effort list of IANA timezones for pickers. */
export function listTimeZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (typeof supported === "function") {
    try {
      return supported("timeZone");
    } catch {
      // fall through
    }
  }
  return [DEFAULT_TIMEZONE, "UTC"];
}