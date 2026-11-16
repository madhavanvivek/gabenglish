# Gabenglish B2C Freemium and Subscription Model

Status: Product decision baseline — 16 November 2026
Owner approval: Captured from product direction in the conversation; payment provider and legal terms remain open.

## 1. Commercial model

Gabenglish is a direct-to-consumer (B2C), freemium-to-paid English-learning product. There are exactly two paid subscription terms in the initial offer: monthly and yearly. Do not create Basic/Pro/Advanced tiers or a six-month plan unless the owner later approves a change.

The free experience is the acquisition and conversion funnel:
1. A visitor selects “Take Free English Analysis”.
2. The visitor must register for a free account using a verified email address or verified mobile number before the test can begin.
3. After successful OTP verification and sign-in, the learner takes the free English analysis/placement test.
3. The learner receives the free analysis result and a clear explanation of what Gabroo can help them improve.
4. The product presents monthly and yearly subscription options.
5. After the payment provider confirms payment, the server grants a time-bounded entitlement to the Gabroo learning companion, classes, learner assessment/profile and learning progress.

The free diagnostic is not a paid class. Keep the free diagnostic result available to the learner after the test; it is the value preview that helps them decide whether to subscribe. The ongoing learning assessment/profile (progress, class assessments and learner development history) is a paid feature.

## 2. Authentication and lead capture

Registration is mandatory before any analysis test begins. There is no anonymous or guest test path. Account creation and login must be passwordless OTP verification. Support either or both verified contact methods on one learner account:
- Email OTP: Gmail, Outlook, Yahoo or any other valid email address. This is email ownership verification, not Google OAuth and not restricted to Gmail.
- Mobile OTP: phone number in E.164 format, initially including Indian mobile numbers. A verified phone number can be used to sign in without email.

A learner may create an account with email or phone and later add and verify the other contact method. Link a newly verified contact to the currently authenticated account only after a secure challenge; never merge two existing accounts automatically based only on matching names or unverified details. One canonical learner account must be able to hold a verified email and a verified phone.

OTP security requirements:
- Generate cryptographically random numeric one-time codes; never store or log the plaintext OTP.
- Store a keyed hash/digest, purpose, destination, created/expiry/consumed timestamps, attempt count and delivery status.
- Short expiry (proposed 5 minutes), one-time use, limited verification attempts, resend cooldown, per-destination and per-IP rate limits, and abuse monitoring.
- Mask destinations in responses and UI. Avoid account enumeration in send/resend responses.
- Consume OTP atomically so concurrent/replayed verification cannot create multiple sessions.
- Do not issue an authenticated session until a contact method has been verified.
- Keep email and SMS provider adapters replaceable. Select providers after cost, delivery, regional coverage, privacy and reliability review; no provider is approved by this document.
- Do not use password login for the B2C learner experience. The current password-based account routes and screen are a foundation prototype and must be replaced by OTP flows before public beta. Admin authentication remains a separate security boundary.

## 3. Initial India pricing

All prices are in Indian rupees (INR), consumer-facing and tax-inclusive at checkout where applicable. The displayed list price and current launch offer must be shown clearly; payment amount and currency are confirmed by the server, not trusted from the client.

| Plan | Standard price | Current introductory price | Access duration |
|---|---:|---:|---:|
| Monthly | ₹99 | **₹69** (30.30% discount) | 30 days |
| Yearly | ₹1,188 | **₹799** (32.74% discount) | 360 days (12 × 30 days) |

- The introductory discount applies only to the learner's first-ever successful subscription purchase. All subsequent renewals/re-purchases are charged at the then-current standard plan price unless a new, explicitly approved promotion rule is introduced.
- The Superadmin must be able to configure the discount percentage independently for Monthly and Yearly plans from the admin portal, enable/disable each offer, and set an optional offer start/end time. The displayed offer price is calculated from the standard price and active percentage on the server; round to the nearest whole rupee and show the final amount before checkout.
- The initial configured percentages are 30.30% for Monthly (₹99 → ₹69) and 32.74% for Yearly (₹1,188 → ₹799). These are editable launch defaults, not hard-coded constants.
- The Superadmin can change future offer percentages, but changes must not alter a checkout already created, a verified purchase, or its stored invoice/transaction history. Store a snapshot of standard price, discount percentage, discount amount, final amount, currency, plan term and offer/version against each transaction.
- Do not let a learner repeatedly qualify for the first-purchase offer by cancelling, allowing expiry, or creating another checkout. Eligibility must be enforced server-side against the learner's purchase history. Define account-merger and abuse handling before launch.
- The yearly standard price is ₹99 × 12 = ₹1,188.
- The stated 30-day month convention means the initial yearly entitlement is 360 days, not a calendar-year anniversary. Display the exact expiry date/time before purchase and in the learner account.
- The discounted prices are introductory first-purchase offers, not renewal prices. Renewals and later re-purchases use the standard price unless an explicitly configured future promotion is approved. The admin-controlled offer must be time-bounded/enableable and server-authoritative.

## 4. Entitlements and access rules

Free account:
- Must register and sign in using verified email or mobile OTP before starting the analysis test.
- Can take the free analysis/placement test only after successful registration and OTP verification.
- Can view the resulting free analysis report and subscription offer.
- Can manage basic account/contact details and privacy/security settings.
- Cannot access paid classes, Gabroo's ongoing learning companion, paid practice, learner progress dashboard, or ongoing assessment/profile history.

Active paid subscription:
- Can access Gabroo learning companion and published classes.
- Can access paid learning modules, practice and class assessments.
- Can access the learner assessment/profile, progress history and personalised learning path.
- Access is granted only while the server-calculated subscription entitlement is valid.

Expired/cancelled/failed payment:
- Keep the free account and free diagnostic result.
- Immediately stop granting new paid class, companion, progress and assessment access after the paid-through end timestamp.
- Do not delete learner progress merely because a subscription expires. Preserve it securely so access can resume after a valid renewal, subject to the published retention policy.
- Never trust a client-side payment success screen, local flag or receipt alone. Grant or extend entitlements only after server-side provider verification (signed webhook and/or server-to-server payment verification).

The ordinary account profile (email, phone, display name, settings) is not the paid learner assessment/profile. Keep these concepts separate in the UI and API.

## 5. Subscription time calculation

Use a single server-side source of truth and UTC timestamps:
- Monthly: `period_end = period_start + 30 days`.
- Yearly: `period_end = period_start + 360 days`.
- Entitlement is active while `now() < period_end`; at the exact end instant it is expired.
- A successful renewal starts from the prior paid-through end when the existing entitlement is still active, avoiding loss of remaining time; if already expired, it starts at the verified new purchase time.
- Store the plan, price/version, currency, provider transaction reference, verified payment timestamp, period start/end and webhook event reference on the server.
- Use idempotent payment event processing and a unique provider event ID to prevent duplicate grants.
- Keep plan and price history immutable or versioned. Do not overwrite the historical amount used for an existing purchase.

Automatic recurring billing is not assumed by this specification. Until an explicit auto-renewal decision and mandate flow are approved, treat the plans as fixed-duration purchases that require a new confirmed payment to extend access.

## 6. Subscription lifecycle states

At minimum, distinguish:
- pending_payment — checkout initiated; no paid access yet.
- active — payment verified and paid-through period is in the future.
- expired — paid-through period has ended.
- cancelled — future renewal cancelled; preserve access until paid-through end if already paid.
- payment_failed — failed attempt; do not grant or extend access.
- refunded/revoked — entitlement adjusted/revoked according to verified provider event and documented refund policy.

A cancellation action must not prematurely remove already-paid access. A refund, chargeback and consumer cancellation policy must be defined with the payment provider and reviewed before public release.

## 7. Required product surfaces

1. Public welcome / product landing screen with a clear “Take Free English Analysis” CTA; selecting it opens mandatory registration.
2. Free sign-up screen with Email OTP and Phone OTP choices.
3. OTP entry, resend timer, change destination and verification success/error states.
4. Free analysis test introduction, test, provisional result and clear upgrade CTA.
5. Pricing page with only Monthly and Yearly options, standard price, first-purchase offer price, duration and savings; clearly disclose the standard renewal price.
5. Payment pending, success, failure, retry and already-processing states.
6. Paid learner home with Gabroo, classes, progress and assessments.
7. Expired-subscription screen that preserves the account and free diagnostic but gates paid features.
8. Subscription management showing plan, payment history, start/end/expiry and renewal/cancellation state.

## 8. Technical implementation sequence

1. Replace learner password registration/login with OTP challenge and verification for email and phone; add verified contact linking.
2. Keep free diagnostic access independent of paid subscription. Add authenticated ownership/persistence for free diagnostic reports.
3. Add subscription plan/price version records for exactly monthly and yearly terms, server-side first-purchase promotion eligibility and configurable per-plan discount percentages managed by Superadmin, plus an entitlement service that gates paid routes server-side.
4. Select and integrate a payment provider only after evaluating India support, UPI/cards/netbanking/wallet options, webhook reliability, refunds, settlement, fees and subscription/one-time payment capabilities.
5. Implement verified checkout, signed webhooks, idempotency, refunds/cancellation and subscription expiry jobs.
6. Add mobile sign-up, OTP, free diagnostic, paywall, checkout and entitlement-aware app navigation.
7. Test time boundaries, payment retries, duplicate webhooks, out-of-order events, expired subscriptions, renewal while active, refunds and access revocation.

## 9. Decisions still required before payment release

- Payment provider selection.
- Final admin permission/audit policy for changing promotional discounts and offer windows.
- Whether auto-renewal is enabled; current default assumption is manual renewal.
- Final GST/tax display, invoice, refund, cancellation and consumer terms after qualified review.
- Whether one free diagnostic is allowed per verified account, and anti-abuse policy for repeated free tests.
- Whether an active subscription can be upgraded or switched between monthly and yearly mid-cycle.
