import type { KnowledgeModule } from '../types';

const content = `CALIFORNIA TITLE 24 PART 6 GLAZING REQUIREMENTS
Analysis instructions for glazing subcontractor contract review.

CURRENT CODE CYCLE:
- 2022 Title 24 Part 6 (California Energy Code), effective January 1, 2023 through December 31, 2025
- 2025 code cycle takes effect January 1, 2026 and is approximately 30% more restrictive
- Projects permitted before Jan 1, 2026 may use 2022 cycle; verify permit date in contract

PRESCRIPTIVE FENESTRATION REQUIREMENTS (2022 cycle):
- Maximum U-factor: 0.30 for ALL climate zones, ALL fenestration types (windows, curtain walls, storefronts)
- Maximum SHGC (Solar Heat Gain Coefficient): 0.23 in climate zones 2, 4, 6-15
- No SHGC requirement in climate zones 1, 3, 5, 16
- Doors with less than 25% glazing area: maximum U-factor 0.20

NFRC CERTIFICATION:
- ALL fenestration products must have NFRC (National Fenestration Rating Council) certification
- NFRC label required on each unit at time of installation
- Non-NFRC-rated products cannot be used; no field-testing alternative

GLAZING-SPECIFIC ANALYSIS INSTRUCTIONS:
- Flag contracts referencing outdated code cycles (e.g., 2019 Title 24 Part 6) as MEDIUM -- may indicate stale specifications
- Flag contracts with performance specs below current prescriptive minimums as HIGH
- For projects with bid dates near Jan 1, 2026: flag potential code cycle transition risk as MEDIUM
- Check if contract specifies climate zone; glazing requirements vary by zone for SHGC
- Verify contract specs reference correct U-factor/SHGC for the applicable climate zone

COMPLIANCE RESPONSIBILITY:
- Subcontractor typically responsible for product compliance (NFRC ratings)
- GC/architect responsible for specifying correct climate zone and performance targets
- Flag contracts that shift specification compliance risk entirely to glazing sub as HIGH`;

export const caTitle24: KnowledgeModule = {
  id: 'ca-title24',
  domain: 'regulatory',
  title: 'California Title 24 Part 6 Glazing Requirements',
  effectiveDate: '2023-01-01',
  reviewByDate: '2025-12-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
