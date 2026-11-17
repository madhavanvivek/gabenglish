# Gabenglish Teaching Content — Authoring Schema and Editorial Rules

Version 1.0 — content contract
Status: schema and authoring standard; sample entries are drafts awaiting educator review.

## 1. Content principles

- Teach natural, useful English in real contexts, with Malayalam support for the initial audience.
- Never teach word-for-word translation when it produces unnatural English.
- Explain why an expression works and when it is appropriate.
- Include more than one valid answer where usage permits.
- Distinguish grammar errors from style, register and naturalness.
- Keep one main learning objective per beginner lesson.
- Make practice require learner retrieval or production, not passive reading alone.
- Provide a source/reviewer trail for claims about grammar or usage.

## 2. Content types

| Type | Purpose |
|---|---|
| curriculum_unit | Ordered pathway or module |
| lesson | Structured teaching session |
| concept | Grammar, vocabulary or communication knowledge |
| example | Model sentence or dialogue |
| exercise | Learner task with rubric and feedback |
| scenario | Role-play or real-world context |
| vocabulary_item | Word, phrase, collocation or expression |
| listening_script | Script and metadata for listening practice |
| pronunciation_item | Sound/stress/rhythm teaching content |
| teaching_rule | Orchestrator guidance for how to teach |

## 3. Required metadata

Every published item must include:
- `id`: stable, globally unique, human-readable identifier;
- `version`: semantic version;
- `type`: one content type above;
- `title` and `summary`;
- `locale` and `language_pair`;
- `stage` and `difficulty`;
- `skills` and `topic_tags`;
- `learning_objectives`;
- `prerequisites` (possibly empty);
- `body`: type-specific learning content;
- `accepted_alternatives` where relevant;
- `common_errors` and teaching notes where relevant;
- `age_suitability`;
- `status`;
- `editorial`: author, reviewer roles, review dates and source notes.

## 4. Lesson structure

A lesson should normally include:
1. Why the learner needs this.
2. A short, plain-language explanation.
3. Malayalam support appropriate to the stage.
4. Clear English examples in context.
5. A contrast or common mistake.
6. Guided practice with a hint.
7. Independent attempt.
8. Feedback with a reason, not only right/wrong.
9. A short retrieval/revision prompt.
10. Completion criteria and next-step recommendation.

## 5. Exercise and answer policy

- Store accepted answers as a set or rubric, not one brittle exact string.
- Normalise punctuation/case only where it does not alter meaning.
- Use semantic evaluation for open responses only with a rubric and uncertainty handling.
- Do not mark a valid regional or conversational form wrong merely because a textbook example differs.
- If multiple answers are valid but differ in formality or meaning, explain the distinction.
- A hint should reveal less than the full answer.
- Do not show the answer before the learner has had a reasonable attempt unless they request it.

## 6. Malayalam editorial rules

- Use natural, understandable Kerala Malayalam, not unnecessarily literary prose.
- Preserve English target phrases exactly when teaching them.
- Use Malayalam script for learner-facing explanations by default; romanisation is optional support, not a replacement.
- Have a fluent Kerala Malayalam educator review every published explanation and example.
- Avoid overconfident claims that one Malayalam expression maps exactly to one English phrase in every context.
- Check politeness, dialect neutrality, age suitability and clarity.

## 7. Publication workflow

`draft` → `in_review` → `approved` → `published` → `retired`.

Draft content is not eligible for production retrieval. Approval requires English, Malayalam and learning-design review as applicable. A published edit creates a new version. Keep historical content versions available for audit and reproducibility.

## 8. Review checklist

- [ ] Learning objective is clear and observable.
- [ ] Stage and prerequisites are appropriate.
- [ ] English grammar and naturalness reviewed.
- [ ] Accepted alternatives and register differences documented.
- [ ] Malayalam explanation reviewed by fluent Kerala Malayalam editor.
- [ ] Examples are culturally and age appropriate.
- [ ] Exercises have tested answer keys/rubrics and useful feedback.
- [ ] Content is original or properly licensed.
- [ ] Audio/transcript checked if included.
- [ ] Version, author, reviewer and review date recorded.

## 9. Draft status and safety

All starter examples in `content/seed` are `draft` and `review_status: pending`. They are design examples, not a published curriculum. They must not be served to learners as approved teaching material until review is complete.
