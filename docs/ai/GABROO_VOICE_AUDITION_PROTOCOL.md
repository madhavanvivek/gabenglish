# Gabroo Canonical Voice — Audition and Approval Protocol

Status: voice direction approved; production voice/provider not selected.

## 1. Purpose

Select one consistent male-presenting voice for the approved Gabroo character. The voice must sound friendly, energetic, funny and patient, with natural Kerala Malayalam and comfortable Malayalam-English code-switching. The voice must be pleasant for repeated, extended learning sessions and clear when teaching English.

No provider's demo voice becomes Gabroo by default. No voice is production-approved until the owner explicitly approves the benchmark result.

## 2. Candidate requirements

Evaluate at least three commercially usable candidates using the same script, language, sample rate and comparable delivery settings wherever the provider allows.

Reject a candidate if it:
- sounds robotic, overly formal, bookish or like a generic announcer;
- exaggerates or caricatures a Kerala accent;
- pronounces Malayalam unnaturally or struggles with common code-switching;
- sounds childish, patronising, aggressive or tiring;
- cannot speak clearly at slower learner-selected speeds;
- lacks suitable commercial rights or has unacceptable data-retention/model-training terms.

## 3. Standard audition script

Use the exact same text and punctuation for each candidate. Replace only `[പേര്]` with the same test name for all candidates. Do not insert informal address such as “എടാ/എടീ”.

### A. Greeting and introduction

“ഹായ്, [പേര്]! ഞാൻ ഗബ്രൂ. ഇന്ന് നമുക്ക് ഇംഗ്ലീഷ് കുറച്ച് കുറച്ചായി, സുഖമായി പഠിക്കാം. തെറ്റുകൾ വന്നാലും പ്രശ്നമില്ല. ഞാൻ കൂടെയുണ്ട്!”

### B. Natural Malayalam-English code-switch

“നിങ്ങൾ ഇന്ന് എന്താണ് ചെയ്തത്? അത് ആദ്യം മലയാളത്തിൽ പറയാം. പിന്നെ നമുക്ക് അതേ കാര്യം simple English-ൽ പറയാൻ ശ്രമിക്കാം.”

### C. English teaching clarity

“Try this sentence: ‘I went to the market yesterday.’ Listen once, then say it in your own voice. Take your time.”

### D. Gentle correction

“നല്ല ശ്രമം! ചെറിയൊരു മാറ്റം മാത്രം മതി. ‘I go yesterday’ എന്നതിന് പകരം ‘I went yesterday’ എന്ന് പറയാം. കാരണം yesterday കഴിഞ്ഞുപോയ സമയമാണ്. ഒന്ന് കൂടി ശ്രമിക്കാമോ?”

### E. Friendly humour

“Grammar-നെ പേടിക്കണ്ട! അത് ഒരു വലിയ monster ഒന്നുമല്ല. നമുക്ക് ഓരോ ചെറിയ step ആയി പിടിച്ചെടുക്കാം.”

### F. Patient response

“സമയം എടുത്തോളൂ. വേഗത്തിൽ പറയേണ്ട കാര്യമില്ല. നിങ്ങൾക്ക് എളുപ്പമുള്ള രീതിയിൽ പറയൂ. ആവശ്യമെങ്കിൽ ഞാൻ പതുക്കെ വീണ്ടും പറയാം.”

### G. Follow-up question

“ഇപ്പോൾ നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഒരു ഭക്ഷണത്തെക്കുറിച്ച് രണ്ട് ചെറിയ English sentences പറയാമോ?”

## 4. Blind evaluation scorecard

Have at least three Kerala Malayalam-fluent listeners score anonymised candidates without seeing provider names. Use a 1–5 scale: 1 = unacceptable, 3 = acceptable with issues, 5 = excellent.

| Dimension | What reviewers should assess |
|---|---|
| Kerala Malayalam authenticity | Natural local pronunciation and intonation, without caricature |
| Malayalam pronunciation | Clear vowels, consonants, rhythm and familiar words |
| Code-switching | Smooth transitions between Malayalam and English |
| English clarity | Understandable teaching pronunciation without forced accent |
| Warmth and friendliness | Welcoming, respectful, encouraging |
| Energy and personality | Lively and playful without shouting or overacting |
| Humour | Gentle, situational, never insulting |
| Emotional range | Can sound curious, patient, encouraging and lightly amused |
| Long-session comfort | Pleasant and non-fatiguing over repeated listening |
| Slow-speed intelligibility | Remains natural and clear when slowed down |

Record each candidate's individual scores and reviewer comments. Do not hide a low score by averaging it with unrelated strengths. A candidate with a critical failure in Malayalam naturalness, respectfulness, long-session comfort or commercial rights is rejected even if its total score is high.

## 5. Technical evaluation

For each candidate, record:
- provider, model, voice identifier, model/version and exact synthesis settings;
- language and locale configuration;
- first-audio latency and full response latency over repeated trials;
- streaming support and behaviour under interrupted playback;
- actual learner-controlled playback-rate support and quality at slow settings;
- availability and accuracy of word/phoneme/viseme timestamps;
- failure rates, rate limits, availability and fallback behaviour;
- estimated cost at representative short and long daily usage;
- commercial usage rights, voice ownership/licensing restrictions, data retention and model-training terms.

Use the same network conditions and test device where possible. Distinguish provider-reported timings from measured client playback timings.

## 6. Approval and version lock

The owner-review packet must include anonymised audio samples, blind scores, reviewer comments, technical results, cost estimates and licensing/privacy findings.

After explicit owner approval, record:
- canonical provider and voice ID;
- exact model/version and synthesis settings;
- pronunciation/dictionary overrides, if any;
- approved speed range and default speed;
- sample reference and approval date;
- commercial terms and fallback policy.

Store provider credentials only in server-side secrets. Mobile clients call the Gabenglish backend and must not contain provider API keys.

A provider or model migration must be re-auditioned if it changes voice identity, pronunciation, emotional delivery or long-session comfort. Never silently substitute a different voice.

## 7. Current status

- Male, funny, energetic, friendly Kerala Malayalam voice direction: approved.
- Respectful address policy: required; no default “eda/edi”.
- Standard audition script and evaluation protocol: documented.
- Candidate samples and blind evaluation: pending.
- Canonical voice/provider/model: pending explicit owner approval.
- Production speech integration: pending selection and implementation.

This protocol is an evaluation plan, not evidence that any voice has passed or been selected.


## 8. Ready-to-run audition packet

### Candidate intake (complete before recording)

Create one restricted record per candidate. Keep provider identity in a separate evaluator-only key so reviewers receive only a random blind code.

| Field | Candidate A | Candidate B | Candidate C |
|---|---|---|---|
| Blind code | VOICE-01 | VOICE-02 | VOICE-03 |
| Provider / service | Pending | Pending | Pending |
| Voice ID / locale | Pending | Pending | Pending |
| Model and version | Pending | Pending | Pending |
| Commercial-use evidence | Pending | Pending | Pending |
| Data retention / training terms | Pending | Pending | Pending |
| Region / processing location | Pending | Pending | Pending |
| Synthesis settings hash | Pending | Pending | Pending |
| Sample reference | Pending | Pending | Pending |

Do not fill candidate identities by assumption. A candidate is eligible only after commercial rights, permitted use, retention, training opt-out/terms and processing region are documented.

### Recording protocol

- Use the exact seven-part script in Section 3, with the same test name, punctuation and text for all candidates.
- Use identical language/locale, sample rate, output format, speaking style controls and comparable synthesis settings wherever supported.
- Capture one normal-speed take and one slow-speed take for every section. Record actual playback-rate support separately from re-synthesizing at a slower speaking rate.
- Capture a continuous multi-turn sample to judge conversational consistency and a longer listening sample for fatigue.
- Keep raw audition files in restricted storage. Do not commit audio, provider credentials or provider-specific request payloads to Git.
- Assign blind codes only after all files are generated; randomise playback order for each reviewer.
- Do not normalize pitch, time-stretch, denoise or loudness-match in a way that conceals voice quality. If technical level matching is required, apply the same documented process to every candidate and preserve originals.

### Blind reviewer scorecard

Three Kerala Malayalam-fluent reviewers should independently score every candidate. Use integer ratings 1–5 and add a short evidence note for any rating of 1, 2 or 5.

| Dimension | Weight | Candidate score |
|---|---:|---|
| Kerala Malayalam authenticity | 15% | Pending |
| Malayalam pronunciation and naturalness | 15% | Pending |
| Malayalam-English code-switching | 12% | Pending |
| English teaching clarity | 10% | Pending |
| Warmth, respect and friendliness | 10% | Pending |
| Energy and personality | 8% | Pending |
| Gentle humour without teasing harm | 6% | Pending |
| Emotional range and patience | 6% | Pending |
| Long-session comfort | 10% | Pending |
| Slow-speed intelligibility | 8% | Pending |
| **Total** | **100%** | **Pending** |

Weighted score formula: `sum((rating / 5) * weight)`. Calculate per reviewer first; show the individual scorecards and score spread, not only the mean. These weights support comparison but do not override rejection gates.

### Non-compensable rejection gates

Reject a candidate regardless of weighted score if any of these occurs:
- disrespectful, insulting, patronising or age-inappropriate address/delivery;
- “eda/edi” or similarly over-familiar address inserted into the standard script;
- caricatured or unnatural Kerala Malayalam;
- a critical Malayalam pronunciation or code-switch failure that changes meaning;
- tiring, harsh, childish or aggressive delivery;
- materially unintelligible output at the intended learner-controlled slow speed;
- unacceptable commercial rights, privacy, retention, training or regional processing terms.

### Technical and cost test record

For each blind code, capture repeated trials for first-audio latency, full response latency, interruption/cancellation, streaming stability, slow-speed quality, failure rate, rate limits and estimated monthly cost at realistic usage. Distinguish client playback-rate control from provider re-synthesis. Record exact device, network conditions, date, sample settings and measurement method. Do not infer technical pass from a marketing feature list.

### Owner decision record

No candidate is selected by the weighted score alone. The final owner packet must contain:
1. Three candidate audio sets with blind codes and identical script coverage.
2. Three independent scorecards per candidate and reviewer evidence notes.
3. Any critical rejection flags and adjudication notes.
4. Technical latency, stability, speed and cost results.
5. Commercial rights, privacy, retention, model-training and region evidence.
6. Recommended candidate and explicit unresolved risks.

**Decision status:** Pending audition samples and evidence. No canonical voice, provider or model is approved until the product owner explicitly selects one after reviewing the packet.


## 9. Machine-readable blind scorecards

The shared contract `@gabenglish/contracts` exports `gabrooVoiceAuditionReviewSchema` and `summarizeGabrooVoiceAuditions`. Each reviewer submits one independent scorecard per blind candidate using the fixed ten-dimension 1–5 rubric and the rejection-gate list. The weights are encoded once in the contract and sum to 100%.

The summary preserves each reviewer's weighted score and the score range. A candidate is marked `eligibleForOwnerReview` only when at least three distinct reviewers have submitted scorecards and no rejection gate has been recorded. This is an evidence-completeness gate, not a voice approval or ranking. A high weighted score never overrides a rejection gate.

Duplicate reviewer submissions for the same blind code are rejected. Ratings outside 1–5, unknown blind codes, unknown rejection gates and unexpected fields are rejected by schema validation. Keep provider identity separate from blind scorecards until independent scoring is complete.

The owner must still inspect the anonymised samples, individual scorecards, evidence notes, technical results and commercial/privacy evidence and explicitly approve the canonical voice. No automated score can make that decision.


## 10. Machine-readable technical evidence and latency report

The shared contract `@gabenglish/contracts` exports `gabrooVoiceTechnicalEvidenceSchema` and `summarizeGabrooVoiceTechnicalEvidence`. Store one technical evidence record per blind candidate. Do not place credentials, tokens, raw learner audio or private provider request payloads in this record.

Each measured trial records the blind code, device, network profile, first-audio latency, full-response latency, interruption recovery, streaming stability, playback rate, slow-playback naturalness (1–5) and whether the trial failed. Full-response latency must not be lower than first-audio latency.

The summary reports:
- Trial count and failure percentage.
- Median and P95 first-audio latency.
- Median and P95 full-response latency.
- Interruption recovery and streaming stability percentages.
- Mean slow-playback naturalness.
- Estimated cost per audio minute and representative daily audio minutes, when supplied.

Latency percentiles are computed from recorded trial values; keep the original trial rows with the report so results can be audited. Run candidates on the same test device/network conditions wherever possible. The summary does not normalize away different conditions.

### Evidence-completeness gate

Technical evidence is marked complete only when at least five trials exist, supporting evidence references are supplied, commercial rights, data-retention terms and model-training terms are verified, and every recorded slow-playback naturalness rating is at least 3/5. This is a minimum evidence gate, not a claim that a candidate meets a latency target or is suitable for production. The owner must still inspect the actual measurements, licensing documents, privacy terms and blind listener scorecards.

No latency threshold is silently treated as an approved product requirement. Compare observed values and make an explicit owner decision before selecting a provider.


## 11. Unified candidate comparison and owner decision record

The shared contract `@gabenglish/contracts` exports `buildGabrooVoiceAuditionComparison` and `gabrooVoiceOwnerDecisionSchema`. The comparison packet always contains VOICE-01, VOICE-02 and VOICE-03, including candidates for which evidence has not yet been collected. Missing values remain explicitly empty; they are never treated as zero scores or successful tests.

The combined report places side by side:
- Independent reviewer count, mean weighted score, reviewer score range and human rejection gates.
- Technical trial count, median/P95 first-audio and full-response latency, failure rate, streaming stability and slow-playback score.
- Estimated cost per audio minute.
- Commercial rights, data-retention and model-training evidence status.
- Separate human and technical evidence-completeness flags.

A candidate is eligible for owner review only when it has at least three independent blind reviews with no recorded rejection gates and complete technical/commercial evidence. This is not a ranking, recommendation or production enablement.

### Owner decision record

The owner decision schema supports `pending`, `approved` and `rejected`. An approved or rejected decision must identify one blind candidate, the decision owner, a rationale of at least 20 characters, reviewed evidence references and an offset-aware decision timestamp. A pending decision cannot carry a decision timestamp.

Do not create an approved decision until the owner has personally reviewed the audition packet and explicitly chosen a candidate. The application must not infer consent or convert eligibility into approval. Keep the mapping from blind code to provider/voice identity restricted until the blind evaluation is complete.


## 12. Learner-controlled playback-speed quality benchmark

The shared contract `@gabenglish/contracts` exports `gabrooPlaybackRateTrialSchema` and `summarizeGabrooPlaybackRateTrials`. The learner playback range is 0.75×–1.50× in 0.05× increments, matching the existing Gabroo speech preference contract. The benchmark includes representative checkpoints at 0.75×, 0.85×, 1.00×, 1.15×, 1.30× and 1.50×.

For each blind candidate, record repeated trials with the device, network profile, requested and actually applied rate, playback method, learner intelligibility (1–5), naturalness (1–5), audible artifacts and completion status. Record artifacts such as pitch distortion, robotic artifacts, choppy/clipped audio and volume pumping.

**Important distinction:** a client-side rate adjustment applied to the same audio is the evidence for learner-controlled playback speed. A separately re-synthesized slower recording is a different test and must be reported separately; it does not prove the in-player speed control works.

The schema rejects requested/applied rate mismatches, unsupported speeds and duplicate trial IDs. Reports keep intelligibility, naturalness, artifact count and completion count separate rather than collapsing them into one score. Use the same source audio, device and network profile when comparing playback methods. Do not infer that all speeds sound acceptable from a single successful rate.

No production speed-quality threshold has been invented. Review the observed results and set an explicit product acceptance threshold before release.
