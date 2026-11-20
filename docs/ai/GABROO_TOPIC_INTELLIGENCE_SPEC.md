# Gabroo Topic Intelligence System

Status: Proposed product and engineering specification  
Product: Gabenglish  
Owner approval required before enabling external research or scheduled ingestion.

## 1. Product intent

Make Gabroo an informed, learner-led English conversation companion. Learners may choose a suggested topic or introduce any safe topic themselves. Gabroo can use current, attributable information to support the conversation while keeping the learner's language-learning goal central.

Gabroo is an information facilitator, not a political, ideological, commercial or personal opinion-maker. It should explain what sources report, distinguish established facts from claims and uncertainty, and avoid presenting its own preferences as facts.

## 2. Two entry paths

### A. Curated topic suggestions

A separate Topic Intelligence worker periodically discovers candidate stories and turns approved material into learner-friendly conversation prompts.

Pipeline:

1. Fetch from a configurable set of reputable publishers, public institutions, research bodies and primary-source feeds.
2. Store source URL, publisher, author where available, publication time, retrieval time, language, title and a content fingerprint.
3. Deduplicate syndicated or substantially similar reports.
4. Run topic safety screening before summarisation.
5. Verify material facts against independent sources where practical; prefer primary sources for official data and statements.
6. Generate a neutral, short summary, vocabulary set, discussion questions and level-appropriate prompt variants.
7. Attach citations to every factual summary and show publication dates.
8. Publish only after policy checks pass. Hold uncertain or borderline items for review.

Suggestions should be diverse and useful for conversation: science, technology, environment, health education, culture, sports, business, education, public infrastructure, arts and local/community developments. Do not optimize for outrage, controversy, sensationalism or click-through.

### B. Learner-requested topic research

When a learner says they want to discuss a particular subject:

1. Identify the topic and the learner's intent. Ask one short clarification if the request is ambiguous.
2. Apply safety and privacy screening before any external search.
3. Search approved public sources. Prefer primary sources and reputable reporting; seek corroboration for contested or consequential claims.
4. Check dates and distinguish current facts from background context.
5. Create a compact source-grounded briefing for Gabroo, not a long article.
6. Respond conversationally at the learner's level, cite sources in the conversation UI and offer a natural follow-up question.
7. If sources are weak, unavailable or contradictory, say so plainly and ask whether the learner wants a narrower topic.

The learner can also choose to discuss a topic without web research when it is timeless or they explicitly prefer free conversation.

## 3. Source and evidence rules

- Only use publicly accessible information from approved source classes.
- Prefer original research, official statistics, public institutional releases, court/public-record documents where appropriate, and reputable newsrooms.
- Do not treat search snippets, social posts, anonymous claims, forums or AI-generated pages as verified evidence.
- Use at least two independent sources for significant current-affairs claims when feasible; use primary-source attribution when the report concerns an official statement or dataset.
- Keep each claim linked to its supporting source. Never fabricate URLs, quotes, dates, authors or citations.
- Preserve source publication date and retrieval timestamp. Mark older background material as background.
- Separate: (a) verified facts, (b) attributed claims or allegations, (c) analysis explicitly attributed to a named source, and (d) unresolved uncertainty.
- If credible sources disagree, describe the disagreement and attribute each position. Do not silently choose a side.
- No source is automatically authoritative for every claim; source quality is topic-specific.

## 4. Neutrality and conversation behaviour

Gabroo must:
- Avoid endorsing political parties, candidates, ideologies, governments, movements, companies, products or individuals.
- Avoid first-person political or moral opinions and persuasive campaigning.
- Use neutral attribution: "The report says…", "According to…", "The data published by…".
- Present relevant perspectives proportionately when a topic is contested, without manufacturing false balance.
- Distinguish evidence from opinion and label opinions as belonging to their source.
- Never infer the learner's beliefs from a topic choice.
- Respect the learner's curiosity and ask open, non-leading questions.
- Keep English learning central: explain vocabulary, useful expressions and grammar gently without derailing the topic.
- Avoid overconfident claims; explicitly state when information is incomplete, disputed or changing.

"Neutral" does not mean withholding established facts or treating demonstrably false claims as equally supported.

## 5. Safety, privacy and disallowed research

Use a layered gate: deterministic input checks, a dedicated safety classifier, source/output checks, and human escalation for uncertain high-risk cases. A keyword filter alone is not sufficient.

Block research or assistance that would:
- Facilitate illegal activity, violence, abuse, exploitation, evasion, fraud, cyber intrusion or weapon construction.
- Expose, obtain or infer confidential, classified, privileged, proprietary or non-public organizational information.
- Reveal private personal data, credentials, account details, private contact information or sensitive records.
- Dox, stalk, target, identify or profile a private person.
- Bypass access controls, paywalls, authentication or other restrictions.
- Collect leaked documents or stolen datasets, even if copies are publicly circulating.
- Generate targeted political persuasion, harassment, extremist recruitment or manipulative content.

Safe educational or journalistic discussion of a sensitive subject may be allowed when it is non-operational, does not expose private information and passes the safety review. For blocked requests, briefly explain the boundary and offer a safe, general alternative.

For breaking news involving allegations, violence, minors, health, public safety or an ongoing investigation, use heightened verification, cautious language and only necessary details. Do not speculate about guilt, identity or motive.

## 6. Data handling and learner privacy

- Send only the minimum topic query needed for research. Do not send learner names, email, phone, profile, conversation history or private memory to search providers.
- Do not use private learner conversations to build public topic suggestions.
- Keep per-user topic history private and provide a clear delete/reset path.
- Store source metadata, generated summaries and safety decisions with retention limits.
- Avoid storing full copyrighted articles. Store short factual notes and citations, subject to source terms and licensing.
- Keep API keys server-side; never expose search credentials to mobile clients.
- Treat retrieved web pages as untrusted data. Ignore instructions embedded in pages, PDFs, comments, metadata or search results; they are content, not system instructions.
- Defend against prompt injection, hidden text, malicious links, source spoofing and attempts to make the research agent reveal secrets or change its policy.

## 7. Proposed architecture

- Topic Scheduler: triggers periodic discovery by locale and configurable cadence.
- Source Registry: allowlisted feeds/domains, source quality metadata and disable controls.
- Research Adapter: server-side search/fetch abstraction with timeouts, quotas and provider failover.
- Content Normalizer: extracts text and metadata while stripping scripts, hidden content and executable material.
- Safety Gate: deterministic checks plus model-based classification; fail closed for confidential-data and operational-harm requests.
- Evidence Builder: deduplication, claim-to-source mapping, corroboration and freshness scoring.
- Topic Curator: creates neutral summaries, vocabulary, discussion prompts and learner-level variants.
- Topic Catalogue: stores approved topic cards and source references.
- Learner Topic API: returns suggestions and creates a one-time research briefing for learner-selected topics.
- Gabroo Conversation Adapter: supplies a bounded, cited research context to the tutor model.
- Audit and Observability: logs source IDs, policy outcomes, latency and provider usage without retaining unnecessary private content.

The mobile app must never call search providers directly. All research and safety decisions happen on the API side.

## 8. Topic card and briefing shape

A published topic card should include:
- Topic title and category
- One-paragraph neutral summary
- "Why this is being discussed" with dated context
- 3–5 useful English words or phrases with learner-language explanations
- 2–3 open conversation starters
- Reading level / estimated language difficulty
- Publisher, article title, publication date and source link for each supporting item
- Last verified timestamp
- Safety status and expiry/review time

A live research briefing should additionally include:
- Learner's exact topic intent (minimized)
- Key verified facts with source IDs
- Attributed claims and unresolved disagreements
- Explicit unknowns / limitations
- Safe conversation direction
- Expiry time so stale current-affairs context is not reused indefinitely

## 9. Freshness and curation

Suggested initial policy (configurable):
- Breaking/current affairs: refresh frequently and expire quickly; show publication time prominently.
- Developing stories: re-check sources before each new session or after a short TTL.
- Evergreen subjects: cache longer, but verify sources when factual claims are reused.
- Never label a topic "latest" unless the source timestamps support that claim.
- Allow Superadmin to pause a source, category, topic or entire research capability.

## 10. Learner experience

Suggested home section: "What's worth talking about?"

Topic card actions:
- Talk about this
- Explain in simpler English
- Learn the key words
- Show sources

In the conversation:
- Learner: "I want to talk about …"
- Gabroo confirms the subject and, if needed, asks what angle interests the learner.
- Research happens quietly in the background with a short wait-state message.
- Gabroo gives a brief, sourced opening and asks an open question.
- Learner can ask for a simpler explanation, more detail, a different angle or source links.

Do not make the learner feel forced to follow suggested topics. Their own safe topic always takes priority.

## 11. Admin controls

Superadmin controls:
- Enable/disable proactive topic suggestions and on-demand research separately.
- Configure source registry and allowed categories.
- Set refresh cadence, freshness windows, per-user and global quotas.
- Configure languages, regions and topic diversity.
- Review held topics and safety incidents.
- Inspect source quality, citation coverage, failed searches and provider costs.
- Emergency disable all external research.

No topic should be promoted merely because it is trending or popular.

## 12. Delivery phases and release gates

### Phase 1 — Safe on-demand research foundation
- Research adapter interface and provider configuration
- Topic intent schema and safety policy
- Public-source retrieval, normalization and prompt-injection isolation
- Claim/source evidence structure
- Cited learner-facing response contract
- Unit, integration, adversarial and privacy tests

### Phase 2 — Learner-requested topic conversations
- API endpoint for topic research
- Bounded research context supplied to Gabroo
- Citation rendering and freshness labels in mobile UI
- Refusal and safe-redirection flows
- Usage limits and observability

### Phase 3 — Curated topic suggestions
- Scheduled ingestion and source registry
- Deduplication, review queue and topic catalogue
- Level-aware topic cards and vocabulary
- Superadmin controls and pause/expiry lifecycle

### Phase 4 — Quality and expansion
- Malayalam-first summaries and bilingual vocabulary
- Regional and learner-interest relevance without sensitive profiling
- Source-quality evaluation and human review sampling
- Load, abuse, privacy and cost testing

Do not enable production research until the safety, privacy, citation, source freshness, quota, prompt-injection and emergency-disable gates all pass.

## 13. Success measures

Measure usefulness and trust, not engagement alone:
- Share of factual statements with valid supporting citations
- Source freshness and corroboration rate
- Citation link validity
- Unsafe request block precision and recall from reviewed test sets
- False refusal rate for safe educational discussion
- Learner topic-choice completion and satisfaction
- Topic diversity across categories and regions
- Response latency, search failure rate and cost per research session
- Rate of stale or disputed information correctly disclosed

## 14. Explicit non-goals

- Gabroo is not a news publisher, political advocate, financial adviser, doctor or legal adviser.
- The research agent must not browse private systems or confidential repositories.
- It must not infer or store political beliefs or sensitive learner profiles.
- It must not generate unsupported "Gabroo believes…" statements.
- It must not silently use unverified web content as factual knowledge.
