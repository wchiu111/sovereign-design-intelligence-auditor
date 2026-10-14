# Atlas integration — future design contract

**Status:** proposal only. This prototype is independent and must not be merged into the Atlas staging or production repositories until reviewed.

## Source of truth
- `wchiu111/sovereign-design-system`: visual/interaction standards and governance.
- `wchiu111/sovereign-ux-atlas`: framework, experiment, and case-study implementation reference.
- `wchiu111/sovereign-ux-atlas-staging`: deployment reference (`staging` for staging, `main` for production).
- This repository: assessment data contracts, intake, evidence capture, reasoning, follow-up and report behaviors.

## Boundaries
1. Keep auditor operations isolated behind versioned APIs, e.g. `POST /api/v1/assessments`, `POST /api/v1/assessments/:id/messages` and a report export endpoint.
2. Treat submitted URLs, files, and model responses as untrusted inputs. No Atlas content may be overwritten by assessed websites.
3. Atlas frameworks are **reasoning sources**; they are never evidence about the audited business.
4. Preserve provenance: evidence IDs, URLs or image references, retrieval timestamps, limitations, framework references, and the decision rationale.
5. Respect user authority: public-page scanning requires deliberate request; private accounts, file access, external messages, and edits require explicit approval.
6. Full report and follow-up conversation remain free and ungated. Paid services are offered separately and voluntarily.
7. In a future Atlas integration, use a separate route or bounded surface with a clear way back; preserve existing SEO, routing, contact, analytics, and mobile behavior.

## Adoption path
- **Prototype validation:** test assessment integrity, consent, and usability in this standalone app.
- **Shared contract:** extract versioned typed schemas and read-only Sovereign knowledge adapters, with provenance and conflict rules.
- **Read-only Atlas link:** optionally introduce an Atlas entry point linking out to the separate auditor application; no code sharing required initially.
- **Deep integration:** review whether a separately deployed service and a lightweight Atlas surface are better than sharing runtime dependencies.
- **Promotion gates:** security review (URL SSRF protections and model abuse), privacy and retention disclosures, keyboard/mobile accessibility, evidence regression tests, and rollout/rollback plan.

## Deliberately out of scope now
- Production Atlas changes, authenticated app scanning, broad crawling, automated cold outreach, analytics ingestion, model-generated unverified conversion metrics, and persistent prospect tracking.
