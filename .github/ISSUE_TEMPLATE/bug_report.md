name: Bug report
description: Something broken on Pages or localhost
body:
  - type: textarea
    id: what
    attributes: { label: "What broke?", placeholder: "URL + what you saw" }
    validations: { required: true }
  - type: input
    id: env
    attributes: { label: "Where?", placeholder: "Pages URL or localhost:8080" }
