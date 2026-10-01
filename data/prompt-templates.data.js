// prompt-templates.data.js — runtime mirror of data/prompt-templates.json (file://-safe, no fetch).
// Generated from prompt-templates.json — keep in sync (see AGENTS.md data conventions).
window.LIBER_DATA = window.LIBER_DATA || {};
window.LIBER_DATA.promptTemplates = {
  "_source": "authored template grammar v1 for src/prompt-engine.js. Mirrored at runtime by data/prompt-templates.data.js (the .data.js file is what the browser loads; keep the two in sync).",
  "_voice": "terse, haunted, lowercase. no exclamation marks. no therapeutic jargon. slots: {interpretation} {buddy} {artifact} {verb} {intention}.",
  "_families": "verbs are free-form user input; 'verbs' lists the keyword family a template responds to (matched as substring of the lowercased verb). 'any' matches all verbs.",
  "_gating": "'minBuddy' (optional int): the template only joins the pool once artifacts+relations reach that tier (WS5 'the buddy becomes louder'). Templates without minBuddy are always eligible.",
  "templates": [
    {
      "id": "challenge-buddy",
      "verbs": [
        "protect",
        "guard",
        "shield",
        "defend"
      ],
      "slots": [
        "interpretation",
        "buddy"
      ],
      "text": "if {interpretation} were challenged, what would {buddy} do?"
    },
    {
      "id": "protection-cost",
      "verbs": [
        "protect",
        "guard",
        "shield",
        "defend"
      ],
      "slots": [
        "buddy",
        "verb"
      ],
      "text": "{buddy} keeps this close because it {verb}. what has the keeping cost?"
    },
    {
      "id": "noble-flip",
      "verbs": [
        "protect",
        "guard",
        "shield",
        "defend"
      ],
      "slots": [
        "artifact",
        "buddy"
      ],
      "text": "what was exiled along with {artifact} that {buddy} still wants back?"
    },
    {
      "id": "threatens-aim",
      "verbs": [
        "threat",
        "harm",
        "attack",
        "hurt",
        "wound",
        "endanger"
      ],
      "slots": [
        "artifact",
        "verb",
        "buddy"
      ],
      "text": "{artifact} {verb} {buddy}. where does it aim, and who taught it to aim there?"
    },
    {
      "id": "threatens-warning",
      "verbs": [
        "threat",
        "harm",
        "attack",
        "hurt",
        "wound",
        "endanger"
      ],
      "slots": [
        "interpretation",
        "buddy"
      ],
      "text": "if {interpretation} is a warning, what is {buddy} being warned of?"
    },
    {
      "id": "mirror-look",
      "verbs": [
        "mirror",
        "reflect",
        "resemble"
      ],
      "slots": [
        "artifact",
        "verb",
        "buddy"
      ],
      "text": "{artifact} {verb} {buddy}. which one is looking?"
    },
    {
      "id": "mirror-away",
      "verbs": [
        "mirror",
        "reflect",
        "resemble"
      ],
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "if {buddy} looked away first, what would {interpretation} do?"
    },
    {
      "id": "carries-weight",
      "verbs": [
        "carry",
        "hold",
        "bear",
        "keep"
      ],
      "slots": [
        "buddy",
        "verb"
      ],
      "text": "{buddy} {verb} this. where did the weight come from?"
    },
    {
      "id": "carries-putdown",
      "verbs": [
        "carry",
        "hold",
        "bear",
        "keep"
      ],
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "what would {buddy} put down if {interpretation} allowed it?"
    },
    {
      "id": "refuses-door",
      "verbs": [
        "refuse",
        "deny",
        "reject",
        "block"
      ],
      "slots": [
        "buddy",
        "verb"
      ],
      "text": "{buddy} {verb} this. what door is it holding shut?"
    },
    {
      "id": "refuses-speak",
      "verbs": [
        "refuse",
        "deny",
        "reject",
        "block"
      ],
      "slots": [
        "interpretation",
        "buddy"
      ],
      "text": "if {interpretation} were allowed to speak, what would it say to {buddy}?"
    },
    {
      "id": "any-ask",
      "verbs": [
        "any"
      ],
      "slots": [
        "artifact",
        "buddy"
      ],
      "text": "{artifact} sits beside {buddy} now. ask them both why."
    },
    {
      "id": "any-origin",
      "verbs": [
        "any"
      ],
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "where was {buddy} the day {interpretation} first happened?"
    },
    {
      "id": "any-letter",
      "verbs": [
        "any"
      ],
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "write {buddy} a letter. let {interpretation} read it first."
    },
    {
      "id": "any-draw",
      "verbs": [
        "any"
      ],
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "draw {buddy} the moment before {interpretation}."
    },
    {
      "id": "any-intention",
      "verbs": [
        "any"
      ],
      "slots": [
        "buddy",
        "intention",
        "interpretation"
      ],
      "text": "{buddy} remembers: {intention}. does {interpretation} change that?"
    },
    {
      "id": "any-intimate-name",
      "verbs": [
        "any"
      ],
      "minBuddy": 2,
      "slots": [
        "buddy"
      ],
      "text": "you have said {buddy}'s name enough times that the room answers first. what does it answer?"
    },
    {
      "id": "any-intimate-weight",
      "verbs": [
        "any"
      ],
      "minBuddy": 2,
      "slots": [
        "buddy",
        "interpretation"
      ],
      "text": "{buddy} has carried {interpretation} beside you for a while. what would it set down if you asked?"
    },
    {
      "id": "any-intimate-witness",
      "verbs": [
        "any"
      ],
      "minBuddy": 2,
      "slots": [
        "buddy",
        "artifact"
      ],
      "text": "{buddy} watched you make {artifact}. ask it what it saw that you did not."
    },
    {
      "id": "tag-carry",
      "verbs": ["any"],
      "slots": ["buddy", "tags", "artifact"],
      "text": "{buddy} carries {tags}. what does {artifact} ask of that carrying?"
    },
    {
      "id": "tag-meet",
      "verbs": ["any"],
      "slots": ["buddy", "artifact", "tagphrase"],
      "text": "{buddy} meets {artifact} {tagphrase}. which one speaks first?"
    },
    {
      "id": "tag-road",
      "verbs": ["any"],
      "minBuddy": 1,
      "slots": ["buddy", "tagphrase", "interpretation"],
      "text": "{buddy} walks toward wholeness {tagphrase}. what has {interpretation} brought to the road?"
    },
    {
      "id": "tag-name",
      "verbs": ["any"],
      "slots": ["buddy", "tags"],
      "text": "you named {buddy}, and it holds {tags}. what part of you answered to that name today?"
    },
    {
      "id": "tag-verb",
      "verbs": ["protect", "carry", "mirror", "threat", "refuse"],
      "slots": ["buddy", "verb", "tags"],
      "text": "{buddy} {verb} this as {tags}. what does the keeping protect, and what does it refuse?"
    }
  ]
};
