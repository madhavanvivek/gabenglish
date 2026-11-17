export type SubscriptionPlanCode = "monthly" | "yearly";

export type SubscriptionOfferRule = {
  planCode: SubscriptionPlanCode;
  currency: "INR";
  standardAmountMinor: number;
  discountBasisPoints: number;
  enabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  version: number;
};

export type SubscriptionPriceQuote = {
  planCode: SubscriptionPlanCode;
  currency: "INR";
  standardAmountMinor: number;
  discountAmountMinor: number;
  payableAmountMinor: number;
  discountBasisPoints: number;
  offerApplied: boolean;
  offerVersion: number;
  evaluatedAt: Date;
};

const EXPECTED_STANDARD_AMOUNTS: Record<SubscriptionPlanCode, number> = {
  monthly: 9900,
  yearly: 118800
};

function isValidDate(value: Date | null): value is Date {
  return value === null || (value instanceof Date && Number.isFinite(value.getTime()));
}

/**
 * Calculate a server-authoritative quote for any purchase, renewal or
 * re-purchase. Callers must persist the returned amounts and offer version
 * with the checkout/payment transaction; never recalculate old purchases.
 */
export function quoteSubscriptionPrice(
  rule: SubscriptionOfferRule,
  evaluatedAt: Date = new Date()
): SubscriptionPriceQuote {
  if (!Number.isSafeInteger(rule.standardAmountMinor) || rule.standardAmountMinor <= 0) {
    throw new Error("INVALID_STANDARD_AMOUNT");
  }
  if (rule.standardAmountMinor !== EXPECTED_STANDARD_AMOUNTS[rule.planCode]) {
    throw new Error("UNAPPROVED_STANDARD_AMOUNT");
  }
  if (!Number.isInteger(rule.discountBasisPoints) || rule.discountBasisPoints < 0 || rule.discountBasisPoints >= 10000) {
    throw new Error("INVALID_DISCOUNT");
  }
  if (!Number.isSafeInteger(rule.version) || rule.version < 1) {
    throw new Error("INVALID_OFFER_VERSION");
  }
  if (!isValidDate(rule.startsAt) || !isValidDate(rule.endsAt)) {
    throw new Error("INVALID_OFFER_WINDOW");
  }
  if (!(evaluatedAt instanceof Date) || !Number.isFinite(evaluatedAt.getTime())) {
    throw new Error("INVALID_EVALUATION_TIME");
  }
  if (rule.startsAt && rule.endsAt && rule.endsAt.getTime() <= rule.startsAt.getTime()) {
    throw new Error("INVALID_OFFER_WINDOW");
  }

  const now = evaluatedAt.getTime();
  const insideStart = !rule.startsAt || now >= rule.startsAt.getTime();
  const insideEnd = !rule.endsAt || now < rule.endsAt.getTime();
  const offerApplied = rule.enabled && rule.discountBasisPoints > 0 && insideStart && insideEnd;

  // Round the discount to the nearest whole rupee (100 paise), then derive
  // the payable amount. Integer arithmetic keeps the snapshot deterministic.
  const discountAmountMinor = offerApplied
    ? Math.round((rule.standardAmountMinor * rule.discountBasisPoints) / 10000 / 100) * 100
    : 0;
  const payableAmountMinor = rule.standardAmountMinor - discountAmountMinor;

  if (payableAmountMinor <= 0) {
    throw new Error("INVALID_PAYABLE_AMOUNT");
  }

  return {
    planCode: rule.planCode,
    currency: "INR",
    standardAmountMinor: rule.standardAmountMinor,
    discountAmountMinor,
    payableAmountMinor,
    discountBasisPoints: offerApplied ? rule.discountBasisPoints : 0,
    offerApplied,
    offerVersion: rule.version,
    evaluatedAt: new Date(evaluatedAt.getTime())
  };
}

export const INITIAL_SUBSCRIPTION_OFFER_RULES: readonly SubscriptionOfferRule[] = [
  {
    planCode: "monthly",
    currency: "INR",
    standardAmountMinor: 9900,
    discountBasisPoints: 2020,
    enabled: true,
    startsAt: null,
    endsAt: null,
    version: 1
  },
  {
    planCode: "yearly",
    currency: "INR",
    standardAmountMinor: 118800,
    discountBasisPoints: 3274,
    enabled: true,
    startsAt: null,
    endsAt: null,
    version: 1
  }
];
