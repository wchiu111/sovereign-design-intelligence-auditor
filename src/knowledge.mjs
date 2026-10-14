/**
 * Curated and versioned v0.1 knowledge pack. Not a full Atlas synchronization.
 * Reference docs and frameworks are NOT evidence about the assessed business.
 * They can guide interpretation and recommendations but never replace real evidence.
 */
export const KNOWLEDGE_VERSION = '2026-10-13.v0.1';

export const KNOWLEDGE = [
  {
    id: 'SDS-INV',
    title: 'Sovereign Design — System Invariants',
    type: 'governance',
    url: 'https://github.com/wchiu111/sovereign-design-system/blob/main/docs/governance/system-invariants.md',
    rules: [
      'Hierarchy precedes decoration',
      'Evidence proves; it does not decorate',
      'Human authority and consequential actions remain visible',
      'Accessibility overrides atmosphere',
      'Every screen provides an exit',
      'Density increases only after user commitment'
    ]
  },
  {
    id: 'SDS-CHOR',
    title: 'Sovereign Design — Information Choreography',
    type: 'framework',
    url: 'https://github.com/wchiu111/sovereign-design-system/blob/main/docs/choreography/information-choreography.md',
    rules: [
      'Orient before offering actions',
      'Invite rather than demand commitment',
      'Deepen when the user chooses to investigate',
      'Present evidence beside the claim it supports',
      'Allow the user to return without losing orientation'
    ]
  },
  {
    id: 'SDS-AGENT',
    title: 'Sovereign Design — Agent Context',
    type: 'governance',
    url: 'https://github.com/wchiu111/sovereign-design-system/blob/main/docs/context/agent-context-card.md',
    rules: [
      'Calm, specific, non-promotional interpretation',
      'Explicit human authority, context and ways to retreat',
      'Progressively disclose evidence as appropriate',
      'Avoid inflated claims and false certainty'
    ]
  },
  {
    id: 'ATLAS-ASSIST',
    title: 'Sovereign Atlas — Grounded Assistant Pattern',
    type: 'application-precedent',
    url: 'https://github.com/wchiu111/sovereign-ux-atlas-staging/blob/main/server/atlas-assist/instructions.ts',
    rules: [
      'Distinguish documented facts, interpretation, inference and missing evidence',
      'Never promote speculative results into validated outcomes',
      'Preserve source lineage and disclose limitations'
    ]
  },
  {
    id: 'ATLAS-CONTENT',
    title: 'Sovereign Atlas — Content Registry',
    type: 'knowledge-source',
    url: 'https://github.com/wchiu111/sovereign-ux-atlas-staging/blob/main/src/app/content/registry.ts',
    rules: [
      'Case studies, frameworks, experiments and relationships form navigable knowledge',
      'Precedents illustrate options rather than guarantee outcomes'
    ]
  }
];

export function relevantKnowledge(area = '') {
  const a = area.toLowerCase();
  if (/hierarch|clarity|messag|position|visual|proof/.test(a)) return ['SDS-INV','SDS-CHOR'];
  if (/trust|eviden|credib|access/.test(a)) return ['SDS-INV','ATLAS-ASSIST'];
  if (/buyer|action|navigation|conversion/.test(a)) return ['SDS-CHOR','SDS-AGENT'];
  return ['SDS-INV','ATLAS-ASSIST'];
}
