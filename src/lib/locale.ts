// Arch A6 — Multi-currency & Multi-timezone presentation helpers.
//
// Pure and side-effect free, so it's unit-testable (Dev Rule 18). Storage stays
// canonical — money is raw numbers, timestamps are UTC TIMESTAMPTZ — and these
// helpers only FORMAT for display using a given institution's currency, locale,
// and timezone. Backed by the platform `Intl` APIs (no dependencies).

export type Localization = {
  currency: string; // ISO 4217, e.g. "INR", "USD"
  locale: string; // BCP 47, e.g. "en-IN", "en-US"
  timezone: string; // IANA, e.g. "Asia/Kolkata", "America/New_York"
};

/** India defaults — preserve the historical hardcoded behavior. */
export const DEFAULT_LOCALIZATION: Localization = {
  currency: "INR",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
};

export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "LKR", label: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "NPR", label: "Nepalese Rupee", symbol: "रू" },
] as const;

export const SUPPORTED_LOCALES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-AE", label: "English (UAE)" },
  { code: "en-SG", label: "English (Singapore)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-CA", label: "English (Canada)" },
] as const;

export const COMMON_TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Australia/Sydney", "Africa/Johannesburg", "UTC",
] as const;

/** Merge a partial localization over the India defaults. */
export function withLocalizationDefaults(loc?: Partial<Localization> | null): Localization {
  return {
    currency: loc?.currency || DEFAULT_LOCALIZATION.currency,
    locale: loc?.locale || DEFAULT_LOCALIZATION.locale,
    timezone: loc?.timezone || DEFAULT_LOCALIZATION.timezone,
  };
}

/** Best-effort currency symbol (curated list first, then Intl, then the code). */
export function currencySymbol(currency: string): string {
  const known = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  if (known) return known.symbol;
  try {
    const part = new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

type CurrencyOpts = { decimals?: number; nullDisplay?: string };

/**
 * Format a monetary amount in the institution's currency + locale.
 * Whole numbers by default (the app stores whole-unit amounts); pass
 * `decimals` for fractional display. `null`/`undefined` → `nullDisplay` ("—").
 */
export function formatCurrency(
  amount: number | null | undefined,
  loc?: Partial<Localization> | null,
  opts?: CurrencyOpts,
): string {
  if (amount == null || (typeof amount === "number" && !isFinite(amount))) {
    return opts?.nullDisplay ?? "—";
  }
  const { currency, locale } = withLocalizationDefaults(loc);
  const decimals = opts?.decimals ?? 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Unknown currency/locale — degrade gracefully rather than throw.
    return `${currencySymbol(currency)}${amount.toLocaleString()}`;
  }
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a date in the institution's timezone + locale (default: medium date). */
export function formatDate(
  value: string | number | Date | null | undefined,
  loc?: Partial<Localization> | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(value);
  if (!d) return "";
  const { locale, timezone } = withLocalizationDefaults(loc);
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: timezone,
      ...opts,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", ...opts }).format(d);
  }
}

/** Format a date+time in the institution's timezone + locale. */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  loc?: Partial<Localization> | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return formatDate(value, loc, { dateStyle: "medium", timeStyle: "short", ...opts });
}

/** True when a string is a valid IANA timezone the runtime accepts. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
