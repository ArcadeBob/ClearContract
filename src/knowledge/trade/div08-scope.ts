import type { KnowledgeModule } from '../types';

const content = `DIVISION 08 SCOPE CLASSIFICATION FOR GLAZING SUBCONTRACTORS
Analysis instructions for identifying glazing-trade vs non-glazing scope in contract specifications.

GLAZING TRADE SECTIONS (Core Scope):
These are legitimate glazing subcontractor scope items. Their presence in a subcontract is expected.

- 08 40 00 Entrances, Storefronts, and Curtain Walls
  - 08 41 00 Entrances and Storefronts
  - 08 42 00 Entrances
  - 08 44 00 Curtain Wall and Glazed Assemblies
  - 08 45 00 Translucent Wall and Roof Assemblies
- 08 50 00 Windows
  - 08 51 00 Metal Windows
- 08 60 00 Roof Windows and Skylights
  - 08 62 00 Unit Skylights
  - 08 63 00 Metal-Framed Skylights
- 08 80 00 Glazing
  - 08 81 00 Glass Glazing
  - 08 83 00 Mirrors
  - 08 84 00 Plastic Glazing
  - 08 85 00 Glazing Accessories
  - 08 87 00 Glazing Surface Films
  - 08 88 00 Special Function Glazing
- 08 35 00 Folding Doors and Grilles (folding/opening glass wall systems)
- 08 32 00 Sliding Glass Doors (framed and frameless glass doors)

NON-GLAZING DIVISION 08 SECTIONS:
These are NOT glazing trade work. Flag as HIGH severity if assigned to the glazing subcontractor.

- 08 10 00 Doors and Frames
  - 08 11 00 Metal Doors and Frames (hollow metal)
  - 08 14 00 Wood Doors
  - 08 15 00 Plastic Doors
  - 08 17 00 Integrated Door Opening Assemblies
- 08 30 00 Specialty Doors and Frames
  - 08 31 00 Access Doors and Panels
  - 08 33 00 Coiling Doors and Grilles
  - 08 34 00 Special Function Doors
  - 08 36 00 Panel Doors
  - 08 38 00 Traffic Doors
  - 08 39 00 Pressure-Resistant Doors
- 08 70 00 Door Hardware
  - 08 71 00 Door Hardware
  - 08 74 00 Access Control Hardware
- 08 90 00 Louvers and Vents

BORDERLINE SECTIONS:
These may or may not be glazing scope depending on the specific contract and project type. Flag as MEDIUM for manual review.

- 08 52 00 Wood Windows -- sometimes glazing scope if glazing sub supplies glass and installs into wood frames
- 08 53 00 Vinyl Windows -- sometimes glazing scope depending on supplier arrangements
- 08 75 00 Window Hardware -- sometimes included in glazing package, sometimes separate

ADJACENT DIVISION SCOPE-CREEP:
Work from other CSI divisions sometimes assigned to glazing subcontractors. Flag these inclusions.

- Division 05 (Metals): Support steel, embed plates, shelf angles for curtain wall/storefront attachment
  - Flag as HIGH -- significant cost and liability exposure; structural steel is a separate trade
  - Look for language like "furnish and install support steel" or "provide structural framing"

- Division 07 (Thermal and Moisture Protection):
  - Sealants and joint sealers at glazing perimeter (07 92 00) -- Flag as HIGH if scope extends beyond glazing-to-frame seal to include building envelope sealant work
  - Waterproofing and air barriers at window/curtain wall openings (07 27 00) -- Flag as HIGH to CRITICAL depending on extent; failure liability is severe
  - Firestopping at glazed openings and curtain wall perimeter (07 84 00) -- Flag as CRITICAL; firestopping carries life-safety liability and requires separate certification

- Division 09 (Finishes): Painting or finishing of aluminum frames (09 91 00)
  - Flag as HIGH -- painting is a separate trade; factory finishing is glazing scope but field painting is not

ANALYSIS INSTRUCTIONS:
When reviewing a contract for a glazing subcontractor:

1. Identify all CSI section references in the contract scope of work
2. Classify each section using the categories above
3. For NON-GLAZING Div 08 sections assigned to the glazing sub: generate a HIGH severity finding with category "Scope of Work" explaining that this section is not glazing trade work
4. For ADJACENT DIVISION scope-creep: generate a HIGH or CRITICAL severity finding with category "Scope of Work" depending on the cost and liability exposure as noted above
5. For BORDERLINE sections: generate a MEDIUM severity finding with category "Scope of Work" recommending manual review of scope assignment
6. Use CSI section numbers in all findings (e.g., "Section 08 11 00 Metal Doors and Frames")
7. When scope-creep is detected, note the cost and liability implications in the finding description
8. Do NOT flag core glazing trade sections as scope issues -- their presence is expected`;

export const div08Scope: KnowledgeModule = {
  id: 'div08-scope',
  domain: 'trade',
  title: 'Division 08 Scope Classification for Glazing Subcontractors',
  effectiveDate: '2026-03-01',
  reviewByDate: '2027-03-01',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
