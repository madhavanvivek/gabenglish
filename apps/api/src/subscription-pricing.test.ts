import {describe,expect,it} from "vitest";
import {INITIAL_SUBSCRIPTION_OFFER_RULES,quoteSubscriptionPrice,type SubscriptionOfferRule} from "./subscription-pricing.js";

const now = new Date("2026-11-17T12:00:00.000Z");
const monthly = INITIAL_SUBSCRIPTION_OFFER_RULES[0]!;
const yearly = INITIAL_SUBSCRIPTION_OFFER_RULES[1]!;

describe("server-authoritative subscription pricing", () => {
  it("quotes the approved monthly launch price of ₹79 from ₹99", () => {
    const quote = quoteSubscriptionPrice(monthly, now);
    expect(quote).toMatchObject({
      planCode: "monthly",
      standardAmountMinor: 9900,
      discountAmountMinor: 2000,
      payableAmountMinor: 7900,
      discountBasisPoints: 2020,
      offerApplied: true,
      offerVersion: 1
    });
  });

  it("quotes the approved yearly launch price of ₹799 from ₹1,188", () => {
    const quote = quoteSubscriptionPrice(yearly, now);
    expect(quote).toMatchObject({
      planCode: "yearly",
      standardAmountMinor: 118800,
      discountAmountMinor: 38900,
      payableAmountMinor: 79900,
      discountBasisPoints: 3274,
      offerApplied: true
    });
  });

  it("applies an active offer consistently to renewals and re-purchases", () => {
    const renewal = quoteSubscriptionPrice(monthly, now);
    const repurchase = quoteSubscriptionPrice(monthly, new Date("2026-11-18T12:00:00.000Z"));
    expect(renewal.payableAmountMinor).toBe(7900);
    expect(repurchase.payableAmountMinor).toBe(7900);
  });

  it("uses standard price when the offer is disabled", () => {
    const rule: SubscriptionOfferRule = {...monthly, enabled: false};
    expect(quoteSubscriptionPrice(rule, now)).toMatchObject({
      standardAmountMinor: 9900,
      discountAmountMinor: 0,
      payableAmountMinor: 9900,
      discountBasisPoints: 0,
      offerApplied: false
    });
  });

  it("uses standard price before the start and at the exclusive end of the offer window", () => {
    const rule: SubscriptionOfferRule = {
      ...monthly,
      startsAt: new Date("2026-11-18T00:00:00.000Z"),
      endsAt: new Date("2026-11-20T00:00:00.000Z")
    };
    expect(quoteSubscriptionPrice(rule, now).payableAmountMinor).toBe(9900);
    expect(quoteSubscriptionPrice(rule, new Date("2026-11-19T00:00:00.000Z")).payableAmountMinor).toBe(7900);
    expect(quoteSubscriptionPrice(rule, new Date("2026-11-20T00:00:00.000Z")).payableAmountMinor).toBe(9900);
  });

  it("rounds discounts to the nearest whole rupee and snapshots the evaluation time", () => {
    const rule: SubscriptionOfferRule = {...monthly, discountBasisPoints: 1234};
    const quote = quoteSubscriptionPrice(rule, now);
    expect(quote.discountAmountMinor % 100).toBe(0);
    expect(quote.evaluatedAt).not.toBe(now);
    expect(quote.evaluatedAt.getTime()).toBe(now.getTime());
  });

  it("rejects client- or admin-supplied values outside approved plan prices", () => {
    expect(() => quoteSubscriptionPrice({...monthly, standardAmountMinor: 1000}, now)).toThrow("UNAPPROVED_STANDARD_AMOUNT");
    expect(() => quoteSubscriptionPrice({...monthly, discountBasisPoints: 10000}, now)).toThrow("INVALID_DISCOUNT");
    expect(() => quoteSubscriptionPrice({...monthly, version: 0}, now)).toThrow("INVALID_OFFER_VERSION");
  });

  it("rejects inverted offer windows and invalid dates", () => {
    expect(() => quoteSubscriptionPrice({
      ...monthly,
      startsAt: new Date("2026-11-20T00:00:00.000Z"),
      endsAt: new Date("2026-11-19T00:00:00.000Z")
    }, now)).toThrow("INVALID_OFFER_WINDOW");
    expect(() => quoteSubscriptionPrice({...monthly, startsAt: new Date("invalid")}, now)).toThrow("INVALID_OFFER_WINDOW");
  });
});
