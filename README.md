# Sovereign Design Intelligence Auditor — Prototype v0.1

**An evidence-grounded, consent-led business design assessment. The complete report is free. No email, sign-up, or paywall.**

This is an **independent working prototype**, not a modification to the Sovereign Atlas production website.

## Run locally (zero package installation)

Requires Node.js **20+**. There are no npm package dependencies.

```bash
cd sovereign-design-intelligence-auditor
npm start
```

Open **http://localhost:4178**.

An optional AI model enables richer assessment language, screenshot interpretation, and open-ended discussion:

```bash
export OPENAI_API_KEY='your-api-key'
export OPENAI_MODEL='gpt-4.1-mini'  # optional
npm start
```

Never put your API key in the browser. `.env.example` documents configurable variables; this zero-dependency version reads process environment variables rather than loading dotenv automatically.

## Functioning features

- Public website URL inspection. Fetches up to 900 KB of returned HTML with manual redirect limits and blocks obvious private/internal URLs.
- Deterministic **source-grounded** inspection of page title, headings, call-to-action labels, visual asset alt attributes, proof language and document structure.
- Optional LLM enhancement of the URL report **constrained to existing evidence IDs**. Falls back to structural review if provider is unavailable.
- Screenshot upload (PNG/JPEG/WebP under 6 MB), with vision assessment **when** an API key is configured. If no key exists, the interface says so and returns a clear limitation rather than inventing image findings.
- Guided discovery: submit a business challenge with no visual evidence and receive a hypothesis worksheet (not a fabricated audit).
- Context refinement: change audience focus without changing observations.
- Follow-up dialogue: AI-assisted with a key; transparent limited rule-based interpretation without one.
- Complete report, evidence register, limitations, prioritized next steps, optional voluntary email inquiry, Markdown export, and print/save to PDF.
- Fictional sample report labeled as illustrative for UI exploration without using API calls.
- Session-only browser report persistence (`sessionStorage`). No mailing list, analytics, server-side user database, or stored assessment history.
- Mobile responsive layout, keyboard focus, reduced-motion support, semantic labels.

## Important limitations

This is a **functional prototype**, not a comprehensive site audit or proof of business outcomes:

- HTML retrieval is not a rendered browser screenshot. JavaScript-rendered content can be missing; responsive behavior, interactions, accessibility compliance, and conversion rates are **not** verified.
- Heuristic findings are qualified as observed, potential, or hypotheses. They do not assert lost revenue or measured impact.
- Only a **curated, versioned Sovereign knowledge pack** is integrated. The full Atlas knowledge synchronization and indexed case-study retrieval remain future work.
- For hosted public deployment, add defense-in-depth: keep DNS-pinned fetching and add network egress/firewall rules, outbound request isolation, resilient rate limiting, limits on concurrency/model spend, abuse prevention, malware inspection, and privacy/retention policies. The current URL checker is a prototype safety layer, not a final SSRF solution.
- Browser storage is tab-scoped, not an account system. Export the report if you want to keep it.
- The optional `mailto:` link opens a draft in the user's mail app. It never emails or stores anything automatically.
- This project intentionally uses dependency-free ES modules and Node.js to provide a verifiable prototype that runs without npm installation; a later production implementation can migrate the frontend to React/TypeScript while retaining the assessment contracts.

## Behavior and evidence contract

Findings carry a stable ID (`F1`), status (`observed`, `potential`, `hypothesis`), supporting evidence references (`E1...`), applicable framework references, recommendations and validation requirements. Observations **must not be changed** by a conversation about the audience; only contextual priority changes.

Knowledge references are design reasoning aids, never evidence of what the inspected company does.

AI responses are kept separate from tool actions. The auditor never changes websites, fetches private business systems, requests passwords, sends outreach, or books a sales call without deliberate action.

## Project layout

```
public/       Minimal responsive UI, light theme
src/engine.mjs    Deterministic evidence + report contracts
src/knowledge.mjs Versioned curated Sovereign knowledge pack
src/security.mjs  URL validation and restricted public HTTP capture
src/ai.mjs        Optional provider inference with constrained sources
server.mjs       API endpoints and static serving
tests/           Node native regression tests
```

## Relevant source-of-truth references

- [Sovereign Design System](https://github.com/wchiu111/sovereign-design-system)
- [System invariants](https://github.com/wchiu111/sovereign-design-system/blob/main/docs/governance/system-invariants.md)
- [Information choreography](https://github.com/wchiu111/sovereign-design-system/blob/main/docs/choreography/information-choreography.md)
- [Atlas content registry](https://github.com/wchiu111/sovereign-ux-atlas-staging/blob/main/src/app/content/registry.ts)
- [Atlas Assist grounding pattern](https://github.com/wchiu111/sovereign-ux-atlas-staging/blob/main/server/atlas-assist/instructions.ts)

## Run tests

```bash
npm test
```

## Open the preview without running the server

Open `offline-preview.html` directly in a browser. Click **Explore a fictional example** to inspect the complete interface, change audience focus, use the local question flow, review the action plan, and export the sample. This file has embedded fictional data and deliberately does **not** inspect real websites or transmit API calls.

## GitHub and eventual Atlas integration

This is intentionally a standalone repository. CI runs the native Node test suite on pushes and pull requests. See [`docs/ATLAS-INTEGRATION.md`](docs/ATLAS-INTEGRATION.md) for the proposed read-only linking path and the security/release gates before any future Atlas integration.
