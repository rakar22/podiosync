export const POSITION_KEYS = ["RANK_1", "RANK_2", "RANK_3", "TOP_5", "FEATURED", "PREMIUM"] as const;
export type PositionKey = (typeof POSITION_KEYS)[number];

export function isPosition(value: string): value is PositionKey {
  return (POSITION_KEYS as readonly string[]).includes(value);
}

export const HOLD_MINUTES = 45;

export type PriceCandidate = {
  id?: string;
  position: string;
  categoryId: string | null;
  countryId: string | null;
  cityId: string | null;
  durationDays: number;
  priceCents: number;
  currency: string;
  active: boolean;
  example?: boolean;
};

export type PriceQuery = {
  position: string;
  categoryId: string | null;
  countryId: string | null;
  cityId: string | null;
  durationDays: number;
};

export function ruleSpecificity(rule: PriceCandidate, query: PriceQuery): number | null {
  if (!rule.active) return null;
  if (rule.position !== query.position) return null;
  if (rule.durationDays !== query.durationDays) return null;
  if (rule.categoryId && rule.categoryId !== query.categoryId) return null;
  if (rule.countryId && rule.countryId !== query.countryId) return null;
  if (rule.cityId && rule.cityId !== query.cityId) return null;
  let score = 0;
  if (rule.cityId) score += 4;
  if (rule.countryId) score += 2;
  if (rule.categoryId) score += 1;
  return score;
}

export function resolvePrice(rules: PriceCandidate[], query: PriceQuery): PriceCandidate | null {
  let best: PriceCandidate | null = null;
  let bestScore = -1;
  for (const rule of rules) {
    const score = ruleSpecificity(rule, query);
    if (score == null) continue;
    if (score > bestScore || (score === bestScore && best && rule.priceCents < best.priceCents)) {
      best = rule;
      bestScore = score;
    }
  }
  return best;
}

export type SlotView = {
  id: string;
  status: string;
  companyId: string | null;
  endDate: Date | null;
  holdUntil: Date | null;
};

export function isBlockingSlot(slot: SlotView, now: Date, ignoreId?: string) {
  if (ignoreId && slot.id === ignoreId) return false;
  if (slot.status === "ACTIVE" && slot.endDate && slot.endDate > now) return true;
  if (slot.status === "PENDING_PAYMENT" && slot.holdUntil && slot.holdUntil > now) return true;
  return false;
}

export function slotAvailability(slots: SlotView[], now: Date, ignoreId?: string) {
  const blocking = slots.find((slot) => isBlockingSlot(slot, now, ignoreId));
  return blocking ? { available: false as const, blocking } : { available: true as const, blocking: null };
}
