import { paiseToNumeric } from "@/lib/money";

/** First human-readable message from a zod error, for server-side rejection. */
export function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check the form and try again";
}

/**
 * Integer paise → transport value for a `numeric(12,2)` RPC argument.
 * PostgREST expects a string body for numeric params, so cast through unknown.
 */
export function toRpcAmount(paise: number): number {
  return paiseToNumeric(paise) as unknown as number;
}

/** Trim a value and return `undefined` when it is blank (maps to SQL null). */
export function optional(value: string | undefined): string | undefined {
  return value && value.trim() !== "" ? value.trim() : undefined;
}

/** Read a FormData entry as a string (never throws on missing values). */
export function readFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}