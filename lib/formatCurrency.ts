/**
 * Currency formatting utilities for Indonesian Rupiah
 */

/**
 * Format a number as Indonesian Rupiah string
 * @example formatRupiah(500000) → "Rp 500.000"
 * @example formatRupiah(1250000) → "Rp 1.250.000"
 */
export function formatRupiah(value: number): string {
  if (!value && value !== 0) return "Rp 0";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * Format number with dots only (no "Rp" prefix)
 * @example formatNumber(500000) → "500.000"
 */
export function formatNumber(value: number): string {
  if (!value && value !== 0) return "0";
  return value.toLocaleString("id-ID");
}

/**
 * Parse a formatted currency string back to number
 * @example parseCurrency("Rp 500.000") → 500000
 * @example parseCurrency("1.250.000") → 1250000
 */
export function parseCurrency(str: string): number {
  if (!str) return 0;
  return parseInt(str.replace(/\D/g, "")) || 0;
}

/**
 * Format to compact form for display
 * @example formatCompact(1500000) → "1.5jt"
 * @example formatCompact(500000) → "500rb"
 * @example formatCompact(50000) → "50rb"
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}
