import { describe, it, expect } from "vitest";
import {
  formatPaise,
  formatPaiseCompact,
  numericToPaise,
  parseMoneyInput,
  paiseToNumeric,
  rupeesToPaise,
} from "@/lib/money";

describe("rupeesToPaise", () => {
  it("converts integer rupees to paise", () => {
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(1)).toBe(100);
    expect(rupeesToPaise(123.45)).toBe(12345);
  });

  it("never produces floating point drift", () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(19.99)).toBe(1999);
  });
});

describe("formatPaise", () => {
  it("groups in Indian style", () => {
    expect(formatPaise(12345678)).toBe("₹1,23,456.78");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("handles negatives", () => {
    expect(formatPaise(-123456)).toBe("-₹1,234.56");
  });

  it("drops the symbol when asked", () => {
    expect(formatPaise(100050, { withSymbol: false })).toBe("1,000.50");
  });
});

describe("formatPaiseCompact", () => {
  it("drops decimals", () => {
    expect(formatPaiseCompact(123400)).toBe("₹1,234");
    expect(formatPaiseCompact(-123400)).toBe("-₹1,234");
  });

  it("rounds to the nearest rupee", () => {
    expect(formatPaiseCompact(123450)).toBe("₹1,235");
    expect(formatPaiseCompact(123449)).toBe("₹1,234");
  });
});

describe("parseMoneyInput", () => {
  it("parses plain, grouped and symbol-prefixed input", () => {
    expect(parseMoneyInput("1234.56")).toBe(123456);
    expect(parseMoneyInput("1,234.56")).toBe(123456);
    expect(parseMoneyInput("₹1,234.5")).toBe(123450);
    expect(parseMoneyInput("0")).toBe(0);
  });

  it("returns null for junk", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("12.34.56")).toBeNull();
    expect(parseMoneyInput("-")).toBeNull();
  });
});

describe("paiseToNumeric / numericToPaise", () => {
  it("round-trips through a numeric(12,2) representation", () => {
    const paise = 123456;
    expect(numericToPaise(paiseToNumeric(paise))).toBe(paise);
    expect(paiseToNumeric(paise)).toBe("1234.56");
  });

  it("tolerates null / junk input", () => {
    expect(numericToPaise(null)).toBe(0);
    expect(numericToPaise(undefined)).toBe(0);
    expect(numericToPaise("not-a-number")).toBe(0);
  });
});