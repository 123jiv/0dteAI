// Paywall math. Prices always come from StoreKit/RevenueCat at runtime; this
// only derives the badge and secondary figures from them.

/** "Save X%" of annual vs paying monthly for a year, rounded down. Null if not meaningful. */
export function savingsPercent(annualPrice: number, monthlyPrice: number): number | null {
  if (!(annualPrice > 0) || !(monthlyPrice > 0)) return null;
  const pct = Math.floor((1 - annualPrice / (monthlyPrice * 12)) * 100 + 1e-9);
  return pct > 0 ? pct : null;
}

export function perMonth(annualPrice: number): number {
  return Math.floor((annualPrice / 12) * 100) / 100;
}

export function formatMoney(amount: number, currencyCode = 'USD', locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
