# Gabenglish Product Specification

Version 1.0 — Phase 0 baseline; review required.

## 1. Vision
Gabenglish helps Malayalam-speaking learners build practical English communication skills through structured learning and an AI tutor who explains patiently in natural Kerala Malayalam, then gradually shifts learners towards English-first communication.

**Promise:** Learn English in Malayalam. Build confidence. Gradually think and speak in English.

It should feel like learning with a witty, supportive friend—not conventional tuition and not an unstructured chatbot.

## 2. Initial audience
- Malayalam-speaking learners in Kerala and India.
- Beginners with limited spoken-English confidence.
- Learners who know some grammar but hesitate to speak.
- Students and early-career professionals.
- Adults seeking practical social, workplace and interview communication.

Additional Indian languages are future scope, after Malayalam quality is proven.

## 3. Product principles
1. Confidence and useful communication matter as much as grammar.
2. Start with the learner's strongest support language and reduce assistance progressively.
3. Explain natural English, not mechanical word-for-word translations.
4. Accept valid alternative answers.
5. Separate grammar correctness from naturalness and register.
6. Correct constructively; do not interrupt every utterance by default.
7. Adapt to demonstrated proficiency, not lesson count alone.
8. Allow Malayalam explanations at every stage.
9. Make practice entertaining without sacrificing accuracy.
10. Measure learning improvement, not only time spent.

## 4. Gabroo behaviour — locked
Male voice direction; funny, energetic and friendly. Natural Kerala Malayalam with casual slang. Humour is playful and gently teasing, never insulting, humiliating or discouraging. Gabroo is talkative, witty, patient and encouraging; understands Malayalam-English code-switching; uses relatable examples; and gradually shifts language mix as proficiency improves.

Physical design is not approved. Explore kid-style, bigger/adult-style and ageless stylised concepts. Select one canonical identity and document it before final 3D production.

## 5. Five learning stages
### Stage 1 — Malayalam Mode
Malayalam-led explanations; English words, meanings and pronunciation; basic sentence construction, greetings, questions and everyday expressions; short supported speaking attempts. Illustrative balance 90% Malayalam support / 10% English.

### Stage 2 — Malayalam + English Mix
Malayalam explanations with more English examples; everyday sentence patterns, tense basics, questions and negatives; natural translation; short answers and guided conversation. Illustrative balance 65/35.

### Stage 3 — English Practice Mode
Mostly English interaction with Malayalam support on demand; longer sentences, storytelling, listening comprehension, roleplay and feedback. Illustrative balance 35/65.

### Stage 4 — English Immersion
English-first social and workplace communication; opinions, interviews, idioms, phrasal verbs and spontaneous speaking. Illustrative balance 10/90.

### Stage 5 — Expert Communication
Spontaneous conversation, presentations, professional communication, debate, persuasion, nuance, register and advanced expression. English-first with Malayalam explanations available on request.

Ratios are guidance, not rigid quotas. Advancement requires evidence across relevant skills and a confidence check; lesson count or a single quiz is insufficient.

## 6. Core modules
Onboarding and placement; personalised path; Grammar Academy; Malayalam-to-English translation; Vocabulary Builder and spaced revision; Listening Academy; Pronunciation Coach; AI Speaking Tutor; real-life scenarios; daily challenges; progress analytics and recommendations.

## 7. Speaking tutor
Support free and guided conversation, roleplay (introductions, shopping, travel, office, customer interactions, meetings and interviews), transcript/replay, learner-controlled correction, corrected sentences, natural alternatives, Malayalam explanations and adaptive difficulty.

Feedback distinguishes grammar error, vocabulary issue, understandability, unnatural but valid phrasing and register mismatch. Do not overstate pronunciation precision without validation.

## 8. Progress model
Track grammar, vocabulary, listening, sentence construction, speaking fluency, pronunciation/intelligibility and confidence/participation separately. Explain scores and their evidence. Do not represent internal estimates as formal certification.

## 9. Monetisation — B2C freemium (current decision)
Gabenglish is a B2C freemium-to-paid product. The free account and free analysis/placement test are the acquisition funnel. A verified learner can take the free analysis test and view its free result; the result then introduces the paid Gabroo learning companion.

Only two paid plans are in the initial offer:
- Monthly: standard ₹99; current introductory first-purchase price ₹69 (30.30% discount); exactly 30 days of access.
- Yearly: standard ₹1,188; current introductory first-purchase price ₹799 (32.74% discount); exactly 360 days of access (12 × 30-day months).

Introductory discounts apply only to a learner's first-ever successful subscription purchase. Subsequent renewals/re-purchases use the standard price. Superadmin can independently change the Monthly and Yearly discount percentages, enable/disable each offer and configure an offer window in the admin portal. The server calculates and snapshots the final price; admin changes never rewrite existing checkouts or purchases.

No additional paid tiers or six-month plan. Paid entitlement unlocks Gabroo's ongoing learning companion, classes, paid practice, learner assessment/profile and progress history. The free analysis report remains available without a subscription. Basic account identity/profile settings are not the paid learner assessment/profile.

Registration is mandatory before the free analysis test; anonymous/guest testing is not offered. Sign-up and login are passwordless: verify either an email OTP (any valid email provider, including Gmail) or mobile OTP. A learner can link both verified contact methods to one account. Do not treat email OTP as Google OAuth. The current password-based account implementation is a prototype and must be replaced before public beta.

Paid access is granted only after server-side payment confirmation and expires at the server-recorded paid-through timestamp. Monthly = purchase/renewal start + 30 days; yearly = start + 360 days. Expiry gates paid features but does not delete account or progress. Current default assumption is manual renewal; auto-renewal is not approved. See `docs/product/B2C_FREEMIUM_SUBSCRIPTION_MODEL.md` for lifecycle, security, price, first-purchase promotion and payment requirements.

## 10. Initial Android public-release scope
Registration/profile, placement assessment, personalised beginner-to-intermediate path, grammar, vocabulary, translation, listening, AI speaking, validated pronunciation feedback, progress dashboard, daily challenges, subscription and content administration. iOS reuses shared mobile code after Android validation.

## 11. Phase 0 exclusions
Full lesson production, public launch, payment provider selection and checkout activation, auto-renewal until explicitly approved, unvalidated fluency/accent claims, additional Indian languages before Malayalam validation, and final Gabroo physical design before concept approval. The initial monthly/yearly price points and 30/360-day durations are product decisions; payment and tax implementation still require review.
