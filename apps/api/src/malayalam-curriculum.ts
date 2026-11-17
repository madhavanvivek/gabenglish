/**
 * Draft curriculum map for English-speaking learners acquiring Malayalam.
 * These are lesson specifications only: no learner-facing lesson content,
 * audio, answer keys, or publication approval is included.
 */
export type MalayalamCurriculumUnit = {
  id: string;
  stage: 1 | 2 | 3;
  module: string;
  title: string;
  outcome: string;
  targetLanguage: "ml";
  supportLanguage: "en";
  scriptMode: "native_with_optional_romanisation";
  register: "polite_neutral" | "contextual_variants";
  dialectScope: "broadly_understandable_kerala";
  educatorReviewStatus: "not_reviewed";
  publicationStatus: "draft";
};
export const malayalamCurriculum = {
  id: "en_to_ml_foundation",
  version: 1,
  learningDirection: "en_to_ml",
  sourceLanguage: "en",
  targetLanguage: "ml",
  supportLanguage: "en",
  status: "draft_unreviewed",
  publicationEnabled: false,
  stages: [
    {number:1,title:"First conversations",goal:"Recognise and use safe, polite phrases in predictable everyday exchanges."},
    {number:2,title:"Everyday independence",goal:"Build short responses and handle common practical situations with less support."},
    {number:3,title:"Connected conversations",goal:"Understand context, respond naturally and choose an appropriate register."}
  ],
  units: [
    {id:"ml-hello-01",stage:1,module:"Greetings and introductions",title:"Hello, names and introductions",outcome:"Greet someone and introduce yourself using a context-appropriate neutral form."},
    {id:"ml-hello-02",stage:1,module:"Greetings and introductions",title:"How are you? Simple exchanges",outcome:"Understand and respond to a basic wellbeing question."},
    {id:"ml-polite-01",stage:1,module:"Polite everyday language",title:"Please, thank you and excuse me",outcome:"Use polite expressions in common public interactions."},
    {id:"ml-polite-02",stage:1,module:"Polite everyday language",title:"Making a simple request",outcome:"Make a short request while avoiding overly familiar forms of address."},
    {id:"ml-listen-01",stage:1,module:"Sound and listening foundations",title:"Hear familiar words in context",outcome:"Recognise familiar words in short, carefully paced spoken examples."},
    {id:"ml-script-01",stage:1,module:"Sound and listening foundations",title:"Meet the Malayalam script",outcome:"Recognise a small set of reviewed Malayalam characters with optional romanisation."},
    {id:"ml-food-01",stage:2,module:"Food and shopping",title:"Ordering food politely",outcome:"Order a familiar item and understand a simple follow-up question."},
    {id:"ml-shop-01",stage:2,module:"Food and shopping",title:"Prices and quantities",outcome:"Ask a price and understand basic quantity expressions."},
    {id:"ml-travel-01",stage:2,module:"Getting around",title:"Directions and places",outcome:"Ask for and understand simple directions to a nearby place."},
    {id:"ml-travel-02",stage:2,module:"Getting around",title:"Transport conversations",outcome:"Communicate a destination and ask a basic travel question."},
    {id:"ml-work-01",stage:3,module:"Work and social life",title:"Introductions at work",outcome:"Introduce yourself and your role in a polite workplace context."},
    {id:"ml-work-02",stage:3,module:"Work and social life",title:"Clarifying and following up",outcome:"Ask someone to repeat, clarify or explain a point."},
    {id:"ml-context-01",stage:3,module:"Context and natural speech",title:"Choosing the right level of politeness",outcome:"Recognise that address and phrasing vary by relationship, age and setting."},
    {id:"ml-context-02",stage:3,module:"Context and natural speech",title:"Understand common conversational variations",outcome:"Notice broadly used spoken variants without treating one dialect as the only correct form."}
  ].map(unit=>({...unit,targetLanguage:"ml" as const,supportLanguage:"en" as const,scriptMode:"native_with_optional_romanisation" as const,register:unit.id.includes("polite")||unit.id.includes("hello")?"polite_neutral" as const:"contextual_variants" as const,dialectScope:"broadly_understandable_kerala" as const,educatorReviewStatus:"not_reviewed" as const,publicationStatus:"draft" as const}))
} as const;
