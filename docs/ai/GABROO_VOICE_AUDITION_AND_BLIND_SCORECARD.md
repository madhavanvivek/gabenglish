# Gabroo Voice Audition Script and Blind Scorecard

Status: evaluation instrument only. No provider, voice, sample or production identity is approved by this document.

## Purpose

Compare at least three commercially usable male voice candidates for Gabroo using the same text, language order, speaking-rate settings and recording conditions. The intended delivery is friendly, energetic, witty and patient, with natural Kerala Malayalam and clear Indian English. Avoid exaggerated comedy, caricatured accents, overly formal delivery and intimate forms of address.

Do not use a candidate's marketing demo as the scored sample. Generate every candidate from the same script and preserve the original unprocessed output.

## Recording protocol

1. Assign each candidate a random blind ID (A, B, C, ...). Keep provider and voice identity in a separate restricted key.
2. Use identical synthesis settings where supported. Record any unavoidable setting differences.
3. Generate one continuous sample and individual segment files. Do not post-process one candidate differently from another.
4. Capture provider, model, voice ID/version, language codes, speaking rate, pitch/style settings, generation date, latency and cost.
5. Record the source text and output file SHA-256. Keep audition files access-controlled and use them only for this evaluation.
6. Have at least three Kerala Malayalam-fluent listeners score independently before discussion. Include listeners familiar with everyday English teaching.
7. Have a fluent Kerala Malayalam educator verify the script, register and pronunciation before the first scored run. If the script is corrected, regenerate every candidate.

## Canonical audition script

Use the same text and punctuation for every candidate. Do not add expressive tags for one provider unless equivalent controls are applied to all candidates.

### 1. Greeting and identity

ഹായ്! ഞാൻ ഗബ്രൂ. നമുക്ക് ഇംഗ്ലീഷ് കുറച്ച് കുറച്ചായി, രസകരമായി പഠിക്കാം. തയ്യാറാണോ?

### 2. Natural Kerala Malayalam and respectful address

ഇന്ന് നമുക്ക് ഒരു ചെറിയ സംഭാഷണം തുടങ്ങാം. ആദ്യം, നിങ്ങളുടെ പേര് എന്താണ്? മറുപടി പറയാൻ സമയം എടുത്തോളൂ.

### 3. Malayalam-English code-switching

ഇത് നല്ലൊരു തുടക്കമാണ്. You don't have to be perfect. Just try one sentence at a time. തെറ്റുകൾ വന്നാലും കുഴപ്പമില്ല; നമുക്ക് പതുക്കെ മെച്ചപ്പെടുത്താം.

### 4. English teaching clarity

Could you please tell me where the bus stop is?

ഇതിന്റെ അർത്ഥം: ബസ് സ്റ്റോപ്പ് എവിടെയാണെന്ന് ദയവായി പറഞ്ഞുതരാമോ?

### 5. Encouragement after a mistake

തെറ്റുകൾ വരുന്നത് സ്വാഭാവികമാണ്. അതിലൂടെയാണ് നമ്മൾ പഠിക്കുന്നത്. Let's try that sentence once more. ഈ പ്രാവശ്യം കുറച്ചുകൂടി ആത്മവിശ്വാസത്തോടെ പറയാം.

### 6. Gentle humour without ridicule

അയ്യോ, ആ വാക്ക് ഒന്ന് വഴുതി പോയി! സാരമില്ല—വാക്കുകൾക്കും ചിലപ്പോൾ ചെറിയ വിശ്രമം വേണമല്ലോ. നമുക്ക് വീണ്ടും ശ്രമിക്കാം.

### 7. Patient response

സമയം എടുത്തോളൂ. ഞാൻ ഇവിടെ തന്നെയുണ്ട്. നിങ്ങൾ തയ്യാറാകുമ്പോൾ മറുപടി പറയാം. വേണമെങ്കിൽ മലയാളത്തിൽ ചോദിക്കാം; ഞാൻ സഹായിക്കാം.

### 8. Follow-up question and conversational turn

Now tell me one thing you enjoyed doing yesterday. You can start with just a few words.

## Blind scoring rubric

Score each dimension from 1 (unacceptable) to 5 (excellent). Evaluators should score the audible result, not the provider name or advertised voice description.

| Dimension | Weight | What to listen for |
|---|---:|---|
| Kerala Malayalam authenticity | 20% | Natural pronunciation, rhythm and contemporary Kerala usage; not bookish or caricatured |
| Malayalam-English code-switching | 15% | Smooth transitions without mispronunciation or awkward changes in accent |
| Clarity and intelligibility | 15% | Every word is easy to understand at normal phone-speaker volume |
| Warmth and encouragement | 10% | Friendly, patient and supportive without sounding patronising |
| Energy and personality | 10% | Engaging and lively, but comfortable over a long learning session |
| English intelligibility | 10% | Clear, natural Indian English suitable for learners to imitate |
| Prosody and expressiveness | 10% | Appropriate emphasis, pauses, question intonation and emotional range |
| Long-session comfort | 5% | Not shrill, tiring, overly dramatic or monotonous |
| Speed and pronunciation control | 5% | Consistent output and useful response to supported speaking-rate settings |

Calculate the weighted score as the sum of (dimension score ÷ 5 × dimension weight). Keep individual evaluator scores; do not hide disagreement behind an average.

## Hard rejection gates

Reject a candidate regardless of weighted score if any of these apply:

- Malayalam sounds synthetic, non-Kerala-specific in a distracting way, or materially mispronounces common words.
- Code-switching causes a noticeable loss of intelligibility.
- The voice mocks, shames, flirts with, intimidates or patronises the learner.
- Humour sounds insulting or exaggerated.
- English pronunciation is unclear enough to teach incorrect pronunciation.
- The candidate cannot meet commercial-use, privacy, retention or licensing requirements.
- Required rate control, reliability or latency is materially inadequate for the intended experience.

A high score does not override a hard rejection.

## Candidate record

Create one record per blind candidate:

| Field | Value |
|---|---|
| Blind candidate ID | |
| Provider / model | |
| Voice ID and version | |
| Language / locale settings | |
| Speaking rate / pitch / style | |
| Generation date and region | |
| Sample file references | |
| Sample SHA-256 | |
| First-audio latency / total generation time | |
| Estimated cost per 10 minutes of learner speech | |
| Commercial-use and retention terms reviewed by | |
| Evaluator scores and notes | |
| Hard rejection triggered? | |
| Follow-up test required | |

## Decision and approval

- Compare at least three candidates.
- Review score distribution, evaluator comments, pronunciation failures and long-session comfort.
- Run a second round on the strongest candidates using unseen Malayalam, code-switched and English teaching phrases.
- Record the trade-offs and provider terms in a decision note.
- Present blind samples and the completed scorecard to the product owner.
- Keep the selected provider and exact voice identity **pending** until the owner explicitly approves the candidate, sample and version.
- Keep provider integration disabled until the production asset-delivery, consent, retention and Android acceptance gates are independently satisfied.

This scorecard is an evaluation aid, not a claim of educator certification or proof that a voice is suitable for every learner.
