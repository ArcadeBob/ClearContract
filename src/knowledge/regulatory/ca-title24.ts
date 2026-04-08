import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA TITLE 24 PART 6 GLAZING REQUIREMENTS
Analysis instructions for glazing subcontractor contract review.

MEDIUM CONFIDENCE: 2025 code cycle values are directional -- verify against published CEC standards for exact prescriptive requirements.

CURRENT CODE CYCLE:
- 2025 Title 24 Part 6 (California Energy Code), effective January 1, 2026
- The 2025 cycle is approximately 30% more restrictive than the 2022 cycle on fenestration energy performance
- 2022 Title 24 Part 6 remains applicable for projects permitted before January 1, 2026
- Projects permitted before Jan 1, 2026 may use 2022 cycle; verify permit date in contract

2022 CODE CYCLE PRESCRIPTIVE FENESTRATION REQUIREMENTS (for reference):
- Maximum U-factor: 0.30 for ALL climate zones, ALL fenestration types (windows, curtain walls, storefronts)
- Maximum SHGC (Solar Heat Gain Coefficient): 0.23 in climate zones 2, 4, 6-15
- No SHGC requirement in climate zones 1, 3, 5, 16
- Doors with less than 25% glazing area: maximum U-factor 0.20

2025 CODE CYCLE PRESCRIPTIVE FENESTRATION REQUIREMENTS (directional):
- Maximum U-factor: tightened to approximately 0.25-0.27 depending on climate zone and fenestration type
- Maximum SHGC: tightened to approximately 0.20-0.22 in applicable climate zones
- SHGC requirements now apply to more climate zones than the 2022 cycle
- Higher-performance glazing products (low-E coatings, triple-pane IGUs) may be needed to meet prescriptive path
- Performance path compliance (COMcheck/EnergyPro) may offer more flexibility than prescriptive path

NFRC CERTIFICATION:
- ALL fenestration products must have NFRC (National Fenestration Rating Council) certification
- NFRC label required on each unit at time of installation
- Non-NFRC-rated products cannot be used; no field-testing alternative

GLAZING-SPECIFIC ANALYSIS INSTRUCTIONS:
- Flag contracts referencing outdated code cycles (e.g., 2019 Title 24 Part 6) as MEDIUM -- may indicate stale specifications
- Flag contracts referencing 2022 Title 24 with permit dates on or after Jan 1, 2026 as HIGH -- wrong code cycle
- Flag contracts with performance specs below current prescriptive minimums as HIGH
- For projects with bid dates near Jan 1, 2026: flag potential code cycle transition risk as MEDIUM
- Check if contract specifies climate zone; glazing requirements vary by zone for SHGC
- Verify contract specs reference correct U-factor/SHGC for the applicable climate zone and code cycle

COMPLIANCE RESPONSIBILITY:
- Subcontractor typically responsible for product compliance (NFRC ratings)
- GC/architect responsible for specifying correct climate zone and performance targets
- Flag contracts that shift specification compliance risk entirely to glazing sub as HIGH`;

export const caTitle24: KnowledgeModule = {
  id: 'ca-title24',
  domain: 'regulatory',
  title: 'California Title 24 Part 6 Glazing Requirements',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-12-01',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
