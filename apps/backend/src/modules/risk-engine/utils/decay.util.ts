// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/utils/decay.util.ts
//
// Exponential time decay for risk signals.
// Older signals carry less weight — prevents permanent flagging.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exponential decay function.
 *
 * decayed = value × e^(−ageHours / halfLifeHours)
 *
 * At t=0:           decayed = value        (full weight)
 * At t=halfLife:    decayed = value × 0.37 (36.8% of original)
 * At t=2×halfLife:  decayed = value × 0.14 (13.5% of original)
 *
 * @param value       - original signal value (e.g. risk score contribution)
 * @param ageHours    - how many hours ago this signal was observed
 * @param halfLifeHours - decay half-life in hours (higher = slower decay)
 * @returns decayed value, floored to 0
 */
export function applyDecay(value: number, ageHours: number, halfLifeHours: number): number {
  if (ageHours <= 0 || halfLifeHours <= 0) return value;
  const decayed = value * Math.exp(-ageHours / halfLifeHours);
  return Math.max(0, decayed);
}

/**
 * Calculate age in hours between a past date and now.
 */
export function ageInHours(date: Date | null | undefined): number {
  if (!date) return Infinity;  // unknown age = treat as very old
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

/**
 * Calculate wallet age in days from first transaction.
 */
export function walletAgeDays(firstSeenAt: Date | null): number {
  if (!firstSeenAt) return 0;
  const diffMs = Date.now() - firstSeenAt.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to 2 decimal places.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
