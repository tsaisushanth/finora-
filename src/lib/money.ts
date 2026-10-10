/**
 * Money handling for Finora.
 *
 * Rule (see AGENTS.md): money is `numeric(12,2)` in Postgres and always handled
 * as integer paise in TypeScript. Never use floating point for arithmetic.
 */

/** Minor unit of INR (1 rupee = 100 paise), stored as a plain integer. */
export type Paise = number;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterNoDecimals = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Convert an integer number of rupees into integer paise. */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** Convert integer paise into a (possibly fractional) rupee number. */
export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

/**
 * Format integer paise as an Indian-grouped currency string, e.g.
 * `12345678` -> `"₹1,23,456.78"`.
 */
export function formatPaise(paise: Paise, options?: { withSymbol?: boolean }): string {
  const withSymbol = options?.withSymbol ?? true;
  const negative = paise < 0;
  const body = inrFormatter.format(Math.abs(paise) / 100);
  const sign = negative ? "-" : "";
  return withSymbol ? `${sign}₹${body}` : `${sign}${body}`;
}

/** Format integer paise without the `.00` cents, e.g. `12345678` -> `"₹1,23,456"`. */
export function formatPaiseCompact(paise: Paise): string {
  const negative = paise < 0;
  const body = inrFormatterNoDecimals.format(Math.abs(paise) / 100);
  return `${negative ? "-" : ""}₹${body}`;
}

/**
 * Parse loose user input ("₹1,234.5", "1234", "1234.56") into integer paise.
 * Returns `null` when the value cannot be parsed.
 */
export function parseMoneyInput(input: string): Paise | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[₹,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Render integer paise as a plain decimal string for a `numeric(12,2)` column. */
export function paiseToNumeric(paise: Paise): string {
  return (paise / 100).toFixed(2);
}

/** Read a value coming back from a `numeric(12,2)` column into integer paise. */
export function numericToPaise(value: string | number | null | undefined): Paise {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}
