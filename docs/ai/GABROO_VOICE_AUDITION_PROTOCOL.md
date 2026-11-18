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
