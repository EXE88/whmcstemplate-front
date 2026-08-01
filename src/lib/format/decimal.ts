/**
 * Decimal arithmetic on strings.
 *
 * Money arrives from the bridge as `"1250000.00"`. Passing that through
 * `Number` is fine for small values and silently lossy for large ones, so every
 * transformation in this file works on the digits themselves. Nothing here ever
 * constructs a `number` from an amount.
 */

export interface ParsedDecimal {
  negative: boolean;
  int: string;
  frac: string;
}

const DIGITS = /^[0-9]*$/;

/** Split a decimal string into sign / integer / fraction, tolerating junk. */
export function parseDecimal(raw: string | null | undefined): ParsedDecimal {
  const text = String(raw ?? "").trim();
  if (!text) return { negative: false, int: "0", frac: "" };

  const negative = text.startsWith("-");
  const body = text.replace(/^[+-]/, "").replace(/[,٬،\s]/g, "");
  const [intPart = "", fracPart = ""] = body.split(".");

  const int = intPart.replace(/[^0-9]/g, "") || "0";
  const frac = fracPart.replace(/[^0-9]/g, "");
  if (!DIGITS.test(int) || !DIGITS.test(frac)) {
    return { negative: false, int: "0", frac: "" };
  }
  return { negative, int: stripLeadingZeros(int), frac };
}

function stripLeadingZeros(value: string): string {
  const trimmed = value.replace(/^0+/, "");
  return trimmed === "" ? "0" : trimmed;
}

/**
 * Move the decimal point `places` positions to the left (positive) or right
 * (negative). Rial -> Toman is `shiftDecimal(value, 1)`.
 */
export function shiftDecimal(value: ParsedDecimal, places: number): ParsedDecimal {
  if (places === 0) return value;

  if (places > 0) {
    const padded = value.int.padStart(places + 1, "0");
    const cut = padded.length - places;
    return {
      negative: value.negative,
      int: stripLeadingZeros(padded.slice(0, cut)),
      frac: padded.slice(cut) + value.frac,
    };
  }

  const take = -places;
  const padded = value.frac.padEnd(take, "0");
  return {
    negative: value.negative,
    int: stripLeadingZeros(value.int + padded.slice(0, take)),
    frac: padded.slice(take),
  };
}

/** Half-up rounding to at most `places` fraction digits. */
export function roundDecimal(value: ParsedDecimal, places: number): ParsedDecimal {
  if (value.frac.length <= places) return value;

  const keep = value.frac.slice(0, places);
  const nextDigit = value.frac.charCodeAt(places) - 48;
  if (nextDigit < 5) return { ...value, frac: keep };

  // Carry: add one unit at the last kept position, digit by digit.
  const digits = (value.int + keep).split("");
  let index = digits.length - 1;
  let carry = 1;
  while (index >= 0 && carry) {
    const sum = digits[index].charCodeAt(0) - 48 + carry;
    digits[index] = String(sum % 10);
    carry = sum >= 10 ? 1 : 0;
    index -= 1;
  }
  const combined = (carry ? "1" : "") + digits.join("");
  const cut = combined.length - places;
  return {
    negative: value.negative,
    int: stripLeadingZeros(combined.slice(0, cut) || "0"),
    frac: places > 0 ? combined.slice(cut) : "",
  };
}

/** Drop trailing zeros from the fraction (`"12.50"` -> `"12.5"`, `"12.00"` -> `"12"`). */
export function trimFraction(value: ParsedDecimal): ParsedDecimal {
  return { ...value, frac: value.frac.replace(/0+$/, "") };
}

export function isZero(value: ParsedDecimal): boolean {
  return value.int === "0" && /^0*$/.test(value.frac);
}

/** Compare two decimal strings. Returns -1 / 0 / 1. */
export function compareDecimal(a: string, b: string): number {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  if (left.negative !== right.negative) return left.negative ? -1 : 1;

  const sign = left.negative ? -1 : 1;
  if (left.int.length !== right.int.length) {
    return left.int.length > right.int.length ? sign : -sign;
  }
  if (left.int !== right.int) return left.int > right.int ? sign : -sign;

  const width = Math.max(left.frac.length, right.frac.length);
  const lf = left.frac.padEnd(width, "0");
  const rf = right.frac.padEnd(width, "0");
  if (lf === rf) return 0;
  return lf > rf ? sign : -sign;
}

/** Group the integer part in threes with the given separator. */
export function groupThousands(int: string, separator: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function toPlainString(value: ParsedDecimal): string {
  const body = value.frac ? `${value.int}.${value.frac}` : value.int;
  return value.negative && !isZero(value) ? `-${body}` : body;
}
