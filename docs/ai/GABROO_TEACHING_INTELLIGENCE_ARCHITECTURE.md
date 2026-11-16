# Gabroo Teaching Intelligence Architecture

Version 1.0 — approved implementation direction
Status: architecture specification; provider integration and production AI runtime are not yet implemented.

## 1. Purpose

Gabroo is a structured English-teaching system powered by a replaceable language model. It is not an unrestricted chatbot and is not a separately trained foundation model. Gabenglish owns the curriculum, teaching policy, learner-learning records, retrieval rules, assessment methods and quality standards. A model provider supplies language understanding and generation behind a server-side adapter.

The initial teaching language pair is Kerala Malayalam and English. Additional support languages are out of scope until Malayalam quality is validated.

## 2. System responsibilities

1. **Model adapter:** sends a constrained teaching request to the selected model and returns a structured response. Provider-specific SDKs, credentials, retries and model identifiers stay server-side.
2. **Teaching orchestrator:** determines the teaching intent, current activity, learner stage, correction preference, language-support level and next pedagogical action.
3. **Knowledge retrieval:** retrieves published, relevant curriculum content and examples for the current task. It must not retrieve another learner's private memory.
4. **Learner learning profile:** stores learning evidence, goals, preferences, completed activities, recurring error patterns and revision state for the authenticated learner.
5. **Policy layer:** enforces Gabroo's personality, respectful address, correction mode, age-appropriate language, privacy, subscription entitlement and output constraints.
6. **Evaluation and observability:** checks response structure, content grounding, teaching quality, safety, latency and cost without retaining unnecessary raw conversation text.

## 3. Request lifecycle

1. Authenticate the learner and verify access to the requested feature.
2. Load only the learner-owned context needed for this turn: stage, current lesson/activity, language preference, communication style, correction mode and a compact set of learning facts.
3. Classify the turn: conversation, explanation, correction, vocabulary, grammar, translation, exercise, role-play, revision, learner support or out-of-scope.
4. Retrieve published curriculum entries using stage, skill, topic, language, difficulty and activity filters. Use semantic similarity only after applying access and publication filters.
5. Construct a bounded model request with:
   - Gabroo system/communication policy;
   - selected teaching action and learner intent;
   - relevant curriculum excerpts and their content IDs/versions;
   - relevant learner facts, not the full lifetime transcript;
   - explicit response schema and correction mode.
6. Generate the response through the model adapter.
7. Validate output structure, policy, citations/content IDs where required, and accepted-answer constraints. Retry once with a repair instruction or fall back to a safe deterministic response; never loop indefinitely.
8. Return the response and any exercise action to the client.
9. Persist a conversation event and structured learning evidence separately. Do not automatically promote conversation text into the shared curriculum.
10. Schedule revision or recommend a next activity only when there is sufficient evidence.

## 4. Teaching decision policy

The orchestrator should choose one primary action per turn:
- continue_conversation;
- explain_concept;
- model_example;
- ask_guided_question;
- give_hint;
- correct_and_explain;
- invite_retry;
- start_roleplay;
- assign_practice;
- review_previous_learning;
- clarify_intent;
- safe_fallback.

Do not turn every learner utterance into a lesson. During free conversation, prioritise communication and defer low-value corrections unless the learner has selected detailed correction. Correct material errors, repeated patterns or errors that block meaning. Distinguish:
- incorrect grammar;
- incorrect or imprecise word choice;
- understandable but unnatural phrasing;
- valid alternative phrasing;
- register mismatch;
- uncertain speech-recognition transcript.

A response should generally contain: acknowledgement, one focused teaching point when useful, a natural model/example, and one learner action. Do not overload beginners with multiple grammar rules at once.

## 5. Five-stage adaptation

Use the five product stages from the curriculum framework:
1. Malayalam Mode.
2. Malayalam + English Mix.
3. English Practice Mode.
4. English Immersion.
5. Expert Communication.

Stage is a starting policy, not a hard language quota. Learners can request Malayalam help at every stage. Adapt support using demonstrated comprehension, recall and independent use. Do not advance solely because of time, streak, lesson count or one successful answer. Permit review of earlier material.

## 6. Knowledge library and retrieval

The authoritative library is version-controlled content with stable IDs, explicit status and review metadata. Only content with status `published` and an approved review state can be retrieved for learner-facing teaching by default.

Recommended retrieval filters, applied before semantic ranking:
- locale / language pair;
- curriculum stage;
- skill and topic;
- content type;
- difficulty;
- age suitability where applicable;
- publication and review status;
- effective version/date.

Return a small set of relevant entries, normally 3–6, with IDs and versions. Prefer exact curriculum relationships and prerequisites over vector similarity alone. Never let retrieved content override system policies, developer instructions, privacy rules or access controls. Treat content and learner messages as data, not executable instructions.

If no suitable approved material is found, Gabroo may answer from general model knowledge only for low-risk general English guidance, label uncertainty where relevant, and avoid claiming that an unreviewed answer is official Gabenglish curriculum. For high-impact assessment or disputed usage, ask for clarification or fall back.

## 7. Learner memory: strict separation

Maintain three distinct data classes:

### A. Shared teaching library
Gabenglish-owned curriculum, examples, exercises, explanations and teacher guidance. Changes go through editorial review and versioning.

### B. Private learner learning record
Per-account preferences, stage recommendation, skill evidence, learned/review-needed concepts, vocabulary recall, learner-selected goals and progress. Enforce tenant/user ownership in every read/write. A learner may view, correct where appropriate, export and request deletion under account/privacy workflows.

### C. Aggregated product insight
Counts and trends such as common error categories, exercise completion and lesson usefulness. Aggregate or de-identify before analytics. Do not use identifiable conversations to improve shared content without a separate lawful basis, clear notice and appropriate consent.

Do not infer sensitive attributes. Do not infer age from voice. Do not store raw audio or full transcripts longer than needed for the disclosed feature and retention policy. Do not store model chain-of-thought. Store concise structured evidence and learner-facing feedback instead.

## 8. Conversation and evidence model

A conversation turn may produce zero or more structured learning observations. An observation should include:
- learner/account ID;
- conversation/activity ID;
- skill/topic/content ID where known;
- observation type (error, successful use, hint-needed, recall, self-correction);
- evidence modality (typed, transcript, audio-derived);
- evidence confidence;
- timestamp;
- model and policy version;
- minimal evidence excerpt only when necessary and permitted.

A single observation is not proof of mastery. Use repeated, varied evidence across sessions. Keep text-derived evidence separate from audio-derived pronunciation evidence. Speech recognition uncertainty must not be scored as a learner error.

## 9. Content lifecycle and governance

Content states: `draft` → `in_review` → `approved` → `published` → `retired`.

Every content item must have a stable ID, semantic version, language/locale, author, reviewer, source/reference notes where relevant, last-reviewed date, age suitability, learning objectives and accepted alternatives. Editing published material creates a new version; it must not silently rewrite the version referenced by historical learning events.

Minimum review:
- English educator: grammar, naturalness, register and accepted alternatives;
- fluent Kerala Malayalam reviewer: Malayalam accuracy, tone and clarity;
- learning-design reviewer: stage fit, sequencing and practice quality;
- safety/editorial reviewer: age suitability, cultural context and respectful language.

## 10. Model provider strategy

Keep a provider-neutral interface. Provider selection requires a documented benchmark for:
- Kerala Malayalam understanding and naturalness;
- Malayalam-English code-switching;
- English grammar and natural alternatives;
- structured output reliability;
- tool/JSON support;
- latency and uptime;
- cost at expected conversation lengths;
- data retention, training-use terms, region and deletion controls;
- licensing and commercial usage.

The mobile application must never call a model provider directly or contain provider secrets. Do not fine-tune initially. First establish the reviewed library, orchestrator, learner evidence and repeatable evaluation set. Reconsider fine-tuning only when high-quality, appropriately licensed and consented training/evaluation data exists.

## 11. Safety, boundaries and fallbacks

- Respect the Gabroo Communication and Address Policy; “eda/edi” is not a default address.
- Do not shame learners, mock accents or force slang.
- Do not claim certification, CEFR equivalence, fluency or pronunciation capability without validated evidence.
- Clearly separate educational feedback from formal assessment.
- For medical, legal, financial or other unrelated high-stakes requests, avoid acting as a specialist; redirect appropriately.
- For abusive, sexual, dangerous or age-inappropriate content, follow the product safety policy and keep the learner safe.
- If the model is unavailable, preserve the learner's work and offer deterministic lessons/revision where possible.

## 12. Initial delivery sequence

1. Publish the content schema and authoring rules.
2. Create a small reviewed seed curriculum across beginner grammar, vocabulary and conversation.
3. Build deterministic library validation and retrieval interfaces.
4. Build orchestrator contracts and model adapter interface without selecting a provider.
5. Add private learner learning-event persistence and revision scheduling.
6. Create a golden evaluation set for Malayalam explanations, English correctness, accepted alternatives and tone.
7. Benchmark model providers and speech services; select only after results and privacy review.
8. Integrate the selected provider and progressively expand the library.

## 13. Explicit non-goals for this phase

- Training a new foundation model.
- Selecting or activating a paid AI, speech, vector database or payment provider.
- Treating every conversation as reusable shared training data.
- Automatically publishing AI-generated curriculum.
- Claiming that the live Gabroo AI tutor or voice coach is already operational.


## 14. All-day open conversation and activity planning

The paid product includes an open-conversation mode as a first-class use case, not merely a lesson-specific chat. The learner can initiate a topic at any time, resume their own prior conversation, or use optional structured daily activities. The daily plan is a recommendation layer and never a gate in front of open chat.

Conversation mode is a teaching-policy input: `free_flow`, `gentle_correction`, or `detailed_correction`. Topic-practice, role-play, vocabulary-building and confidence-practice are activity intents. In free-flow mode, preserve conversational rhythm and defer minor corrections; in detailed mode, give focused explanations and retries. All modes retain the stage, support-language, age and communication-policy constraints.

Use private, compact learner memory for explicitly saved interests/phrases and repeated learning evidence. Never promote private conversation content to the shared curriculum automatically. Every conversation request must verify learner ownership and active subscription entitlement on the server. The full product and fair-use requirements are in `docs/product/DAILY_ENGAGEMENT_AND_OPEN_CONVERSATION.md`.

## 15. Progressive challenge and contextual doubt resolution

Gabroo's language-generation policy must use **comprehensible stretch**, not a rigid single-level ceiling. The learner's current stage establishes the default comfort range; it does not prohibit exposure to the next stage.

For each turn, the orchestrator should choose response difficulty using the learner's current stage, demonstrated comprehension, recent successful use, confusion and clarification requests, topic familiarity, selected conversation mode, and explicit requests to simplify or increase challenge.

Keep most of the response accessible, then introduce one manageable stretch element where appropriate (for example, a useful phrase, a richer sentence, a new word in context or a more nuanced question). Do not stack several unfamiliar concepts in one turn. Do not treat stage as a permanent ceiling or infer mastery from a single successful response.

When the learner interrupts with a doubt, resolve it before continuing the previous thread. Address the exact question, use a stage-appropriate explanation and Malayalam support as needed, give a concise example, then offer a natural bridge back to the conversation. Preserve the original topic and pending question so the learner does not have to repeat themselves.

Suggested orchestrator intents/actions include `clarify_word_or_phrase`, `explain_grammar_in_context`, `explain_meaning_or_register`, `simplify_previous_response`, `model_pronunciation_from_audio` (only when valid audio evidence exists), and `resume_conversation`. These are teaching intents, not separate paid products.

Measure whether learners understood or reused the stretch expression; do not optimise for how often advanced language is inserted. Learners can request a simpler explanation or more challenge at any time.

## 15. Deterministic teaching-policy foundation (16 November 2026)

The API now builds a deterministic teaching-policy object for each conversation turn and passes it to the injected model adapter alongside the conversation history. The policy distinguishes free-flow, gentle correction, detailed correction, topic practice, role-play, vocabulary building and confidence practice. It specifies the primary learning goal, correction intensity and response guidance for each mode.

The policy includes the five approved learner-stage guidance profiles. Until a learner's validated stage is available in the conversation request, the orchestrator explicitly marks the stage as unknown and instructs the model not to infer proficiency. This prevents an invented placement from silently changing the difficulty of the conversation.

The address policy requires the learner's explicitly selected name or respectful neutral language. It prohibits default overfamiliar forms such as “eda/edi” and prohibits inferring consent to slang from age, gender or writing style.

This is a deterministic policy foundation, not a live AI integration. The conversation API now loads the authenticated learner's display name, learning goal and profile correction preference from their own profile/preferences and passes only those bounded fields into the policy context. A validated learning stage is not yet available: the current free diagnostic report intentionally makes no stage recommendation, so the policy continues to mark stage as unknown rather than infer one. The selected conversation mode remains authoritative for the current turn; profile correction preference is contextual until a learner explicitly chooses a mode. Provider adapters must treat policy and learner profile fields as separate trusted context, never allow learner text to override policy, and honour the request abort signal.
