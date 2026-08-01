import type { Locale } from "@/lib/i18n/config";
import {
  groupThousands,
  isZero,
  parseDecimal,
  roundDecimal,
  shiftDecimal,
  trimFraction,
} from "./decimal";
import { JALALI_MONTHS_EN, JALALI_MONTHS_FA, toJalali } from "./jalali";

export { compareDecimal, parseDecimal } from "./decimal";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Latin -> Persian digits. Applied last, after all arithmetic is done. */
export function toPersianDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Persian/Arabic -> Latin digits. For anything the user typed. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function localizeDigits(value: string, locale: Locale): string {
  return locale === "fa" ? toPersianDigits(value) : value;
}

/* -- money ---------------------------------------------------------------- */

/**
 * The bridge always reports the WHMCS currency, which on this install is IRR.
 * Iranians quote prices in Toman, and Iranian WHMCS installs are inconsistent
 * about which unit the *stored numbers* are in — so the mapping is a deployment
 * setting applied in exactly one place:
 *
 *   `toman`        amounts are Rial, divide by ten, label "تومان"  (default)
 *   `rial`         amounts are Rial, show as-is,     label "ریال"
 *   `toman_direct` amounts are already Toman,        label "تومان"
 *
 * Check one product price against the WHMCS admin before going live; the wrong
 * choice is off by a factor of ten in either direction.
 */
export type CurrencyDisplay = "toman" | "rial" | "toman_direct";

export const CURRENCY_DISPLAY: CurrencyDisplay =
  process.env.NEXT_PUBLIC_CURRENCY_DISPLAY === "rial"
    ? "rial"
    : process.env.NEXT_PUBLIC_CURRENCY_DISPLAY === "toman_direct"
      ? "toman_direct"
      : "toman";

const UNIT_LABEL: Record<CurrencyDisplay, Record<Locale, string>> = {
  toman: { fa: "تومان", en: "Toman" },
  toman_direct: { fa: "تومان", en: "Toman" },
  rial: { fa: "ریال", en: "Rial" },
};

export interface MoneyParts {
  /** Grouped, locale-digit amount without the unit. */
  amount: string;
  /** "تومان" / "Toman". */
  unit: string;
  /** `true` when the source string was zero or unparseable. */
  zero: boolean;
}

export function moneyParts(
  raw: string | null | undefined,
  locale: Locale,
  options: { currencyCode?: string | null } = {},
): MoneyParts {
  const unit =
    options.currencyCode && options.currencyCode.toUpperCase() !== "IRR"
      ? options.currencyCode.toUpperCase()
      : UNIT_LABEL[CURRENCY_DISPLAY][locale];

  let value = parseDecimal(raw);
  const foreign = Boolean(
    options.currencyCode && options.currencyCode.toUpperCase() !== "IRR",
  );
  if (!foreign && CURRENCY_DISPLAY === "toman") {
    value = shiftDecimal(value, 1);
  }
  value = trimFraction(roundDecimal(value, 2));

  const separator = locale === "fa" ? "٬" : ",";
  const decimalPoint = locale === "fa" ? "٫" : ".";
  const body =
    groupThousands(value.int, separator) + (value.frac ? decimalPoint + value.frac : "");

  return {
    amount: localizeDigits((value.negative && !isZero(value) ? "−" : "") + body, locale),
    unit,
    zero: isZero(value),
  };
}

/** `"1250000.00"` -> `"۱۲۵٬۰۰۰ تومان"`. */
export function formatMoney(
  raw: string | null | undefined,
  locale: Locale,
  options: { currencyCode?: string | null } = {},
): string {
  const parts = moneyParts(raw, locale, options);
  return `${parts.amount} ${parts.unit}`;
}

/* -- numbers -------------------------------------------------------------- */

export function formatNumber(value: number, locale: Locale): string {
  const separator = locale === "fa" ? "٬" : ",";
  return localizeDigits(groupThousands(String(Math.trunc(value)), separator), locale);
}

export function formatBytes(value: string | number | null | undefined, locale: Locale): string {
  const num = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return "—";
  const units = locale === "fa" ? ["مگابایت", "گیگابایت", "ترابایت"] : ["MB", "GB", "TB"];
  let index = 0;
  let size = num;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${localizeDigits(String(rounded), locale)} ${units[index]}`;
}

/* -- dates ---------------------------------------------------------------- */

const GREGORIAN_MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** WHMCS uses `0000-00-00` for "never". */
function parseIso(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text || text.startsWith("0000")) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh ?? 0), Number(mm ?? 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  raw: string | null | undefined,
  locale: Locale,
  options: { withTime?: boolean } = {},
): string {
  const date = parseIso(raw);
  if (!date) return "—";

  let body: string;
  if (locale === "fa") {
    const j = toJalali(date);
    body = `${j.day} ${JALALI_MONTHS_FA[j.month - 1]} ${j.year}`;
  } else {
    body = `${date.getDate()} ${GREGORIAN_MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`;
  }

  if (options.withTime) {
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
    body = `${body} — ${time}`;
  }
  return localizeDigits(body, locale);
}

export function formatDateShort(raw: string | null | undefined, locale: Locale): string {
  const date = parseIso(raw);
  if (!date) return "—";
  if (locale === "fa") {
    const j = toJalali(date);
    return localizeDigits(
      `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`,
      locale,
    );
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Whole days from today; negative means the date has passed. */
export function daysFromNow(raw: string | null | undefined): number | null {
  const date = parseIso(raw);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatRelative(raw: string | null | undefined, locale: Locale): string {
  const date = parseIso(raw);
  if (!date) return "—";
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000);

  const units: Array<[number, string, string]> =
    locale === "fa"
      ? [
          [1, "همین حالا", ""],
          [60, "دقیقه پیش", "min"],
          [1440, "ساعت پیش", "hour"],
          [43200, "روز پیش", "day"],
        ]
      : [
          [1, "just now", ""],
          [60, "minutes ago", "min"],
          [1440, "hours ago", "hour"],
          [43200, "days ago", "day"],
        ];

  if (diffMinutes < 1) return units[0][1];
  if (diffMinutes < 60) return localizeDigits(`${diffMinutes} ${units[1][1]}`, locale);
  if (diffMinutes < 1440)
    return localizeDigits(`${Math.floor(diffMinutes / 60)} ${units[2][1]}`, locale);
  if (diffMinutes < 43200)
    return localizeDigits(`${Math.floor(diffMinutes / 1440)} ${units[3][1]}`, locale);
  return formatDate(raw, locale);
}

export function formatFileSize(bytes: number, locale: Locale): string {
  if (bytes < 1024) return localizeDigits(`${bytes} B`, locale);
  if (bytes < 1024 * 1024)
    return localizeDigits(`${Math.round(bytes / 1024)} KB`, locale);
  return localizeDigits(`${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`, locale);
}
