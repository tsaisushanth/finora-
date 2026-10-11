import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

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

/** Local wall-clock now (yyyy-MM-ddTHH:mm) in the given timezone, for `<input type="datetime-local">`. */
export function nowToDatetimeLocal(timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd'T'HH:mm");
}

/** Convert a UTC ISO string into an `yyyy-MM-ddTHH:mm` value for `<input type="datetime-local">`. */
export function toDatetimeLocal(
  value: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return formatInTimeZone(new Date(value), timeZone, "yyyy-MM-dd'T'HH:mm");
}

/** Interpret a datetime-local value as wall time in `timeZone` and return UTC. */
export function datetimeLocalToUtc(
  value: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return fromZonedTime(new Date(value), timeZone).toISOString();
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