import type { KnowledgeModule } from '../types.js';

const content = `DIVISION 08 MASTERFORMAT TYPICAL DELIVERABLES
Reference guide for typical required deliverables by CSI MasterFormat section within Division 08 — Openings.

SECTION 08 41 13 — ALUMINUM-FRAMED STOREFRONTS
Typical Deliverables:
- Shop drawings: plans, elevations, sections, details, hardware schedule, finish schedule
- Product data: manufacturer system data, thermal performance data, structural capacity tables
- Samples: finish samples, glazing samples, sealant samples
- Test reports: NAFS performance class/grade per AAMA/WDMA/CSA 101, ASTM E283 air, ASTM E331 water, ASTM E330 structural
- Certifications: NAFS product certification, finish warranty letter (AAMA 2604/2605)
- Warranty letters: manufacturer standard warranty, finish warranty, glass warranty

SECTION 08 44 13 — GLAZED ALUMINUM CURTAIN WALLS
Typical Deliverables:
- Shop drawings: plans, elevations, vertical/horizontal sections, stack joints, corner details, expansion joint details, embed/anchor plans
- Product data: system technical data, structural silicone specifications, pressure plate data, thermal break details
- Samples: finish samples, glass mockup samples, corner section sample
- Test reports: AAMA 501.1 dynamic water, ASTM E330 structural, ASTM E283 air, ASTM E331 static water, ASTM E1105 field water, AAMA 501.2 field quality check
- Structural calculations: PE-sealed wind load, seismic interstory drift, thermal expansion, dead load deflection, anchor/embed design
- Certifications: NAFS product certification, structural silicone manufacturer approval letter
- Warranty letters: system warranty (typically 10-year), finish warranty, glass warranty, sealant warranty
- Mock-up: full-size performance mock-up per AAMA 501, field mock-up if specified

SECTION 08 42 29 — AUTOMATIC ENTRANCES
Typical Deliverables:
- Shop drawings: plans, elevations, jamb/head/sill details, operator mounting, sensor locations, power supply routing
- Product data: door operator data, sensor specifications, safety device data, power requirements
- Samples: finish samples, glass samples
- Test reports: NAFS performance ratings, BHMA/ANSI A156.10 power-operated pedestrian doors, AAADM certification
- Certifications: AAADM installer certification, UL 325 compliance for automatic doors
- Warranty letters: door system warranty, operator warranty, sensor warranty

SECTION 08 80 00 — GLAZING (GENERAL)
Typical Deliverables:
- Shop drawings: glass schedule, edge details, glazing pocket details, structural glazing details
- Product data: glass type specifications, interlayer data for laminated, spacer data for IGUs, low-E coating data
- Samples: glass samples for each type specified (clear, tinted, low-E, laminated, insulated)
- Test reports: ASTM C1036 flat glass, ASTM C1048 heat-treated, ASTM C1172 laminated, ASTM E2190 insulating unit performance
- Certifications: SGCC safety glazing certification, IGCC insulating glass certification
- Warranty letters: glass manufacturer warranty, IGU seal warranty (typically 10-year), laminated interlayer warranty

SECTION 08 84 13 — GLAZED ALUMINUM RAILINGS
Typical Deliverables:
- Shop drawings: elevation, section, post details, base shoe/standoff details, connection to structure
- Product data: railing system data, base shoe specifications, glass type/thickness/treatment
- Samples: glass samples, hardware finish samples
- Test reports: ASTM E2353 guard structural performance, IBC 1607.8 concentrated and uniform load testing
- Structural calculations: PE-sealed guard loading per IBC, wind load, glass fallout analysis
- Certifications: product listing or evaluation report (ICC-ES ESR or equivalent)
- Warranty letters: railing system warranty, glass warranty

SECTION 08 43 13 — ALUMINUM-FRAMED STOREFRONTS (FIRE-RATED)
Typical Deliverables:
- Shop drawings: elevation, sections, frame details, glazing pocket details, label locations, hourly rating callouts
- Product data: fire-rated system data, fire-rated glazing data (ceramic, intumescent interlayer)
- Samples: glass samples (not required to be fire-rated for sample purposes)
- Test reports: ASTM E119 fire endurance, ASTM E2010 positive pressure fire test, UL 263, hose stream test
- Certifications: UL/WHI listing documentation, ITS certification, fire-rated glazing compatibility letter from system manufacturer
- Warranty letters: system warranty, fire-rated glazing warranty

SECTION 08 51 13 — ALUMINUM WINDOWS
Typical Deliverables:
- Shop drawings: elevation, sections, hardware locations, screen details, operator details, mullion reinforcement
- Product data: window system data, hardware specifications, weatherstripping data, screen specifications
- Samples: finish samples, glass samples, hardware samples
- Test reports: NAFS performance class/grade (R, LC, CW, AW), ASTM E283 air, ASTM E331 water, ASTM E330 structural, forced entry per ASTM F588 if specified
- Certifications: NAFS product certification, ENERGY STAR certification if applicable
- Warranty letters: manufacturer warranty, finish warranty, hardware warranty

SECTION 08 61 13 — METAL-FRAMED SKYLIGHTS
Typical Deliverables:
- Shop drawings: plan, sections, curb details, condensation gutter details, flashing integration, fall protection provisions
- Product data: skylight system data, glazing specifications, condensation management system
- Samples: finish samples, glazing samples
- Test reports: NAFS performance ratings, ASTM E330 structural (wind uplift and positive), ASTM E331 water, ASTM E283 air, snow load test data
- Structural calculations: PE-sealed wind uplift, snow load, ponding, dead load, thermal expansion
- Certifications: NAFS product certification, fall protection system certification if integral
- Warranty letters: system warranty (typically 5-year for water, 10-year for glass), finish warranty

SECTION 08 71 00 — DOOR HARDWARE (GLAZING-RELATED)
Typical Deliverables:
- Shop drawings: hardware schedule, keying schedule, locations on door elevations
- Product data: each hardware item (closers, pivots, pulls, locks, panic devices, auto operators)
- Samples: finish samples for exposed hardware
- Test reports: BHMA/ANSI grade certification for each item
- Certifications: ADA compliance documentation, fire-rating labels for hardware on fire-rated doors
- Warranty letters: hardware manufacturer warranty per item type

SECTION 08 90 00 — LOUVERS AND VENTS (WHEN IN GLAZING PACKAGE)
Typical Deliverables:
- Shop drawings: elevation, sections, frame details, screen details, integration with adjacent storefront/curtain wall
- Product data: louver performance data (free area, water penetration, pressure drop), bird screen specifications
- Samples: finish samples, louver blade samples
- Test reports: AMCA 500-L air performance, AMCA 500-L water penetration, structural per ASTM E330
- Certifications: AMCA certified ratings seal
- Warranty letters: louver manufacturer warranty, finish warranty

ANALYSIS INSTRUCTIONS:
When analyzing a glazing contract against this deliverables module:

(a) Cross-reference CSI sections cited in the contract against the deliverables lists above. For each cited section, compare the contract's submittal register or specification submittal requirements against the typical deliverables listed.

(b) Flag deliverables that are TYPICALLY REQUIRED by the cited CSI section but are ABSENT from the contract's submittal register or specification submittal paragraphs. These gaps may result in RFIs, rejected submittals, or scope disputes.

(c) Set inferenceBasis to 'knowledge-module:div08-deliverables' for any deliverable inferred from this module that is not explicitly stated in the contract text.

(d) Do NOT flag deliverables for CSI sections that are NOT referenced in the contract. Only evaluate sections that appear in the contract's scope of work, specification table of contents, or section references.

(e) Pay special attention to structural calculations and PE-sealed submissions -- omission of these requirements can indicate the contract expects the glazing subcontractor to provide engineering at their own cost, which is a significant cost and liability item.

(f) For fire-rated sections (08 43 13): missing UL/WHI listing documentation or fire-rated compatibility letters should be flagged as HIGH severity due to life-safety and code compliance implications.`;

export const div08Deliverables: KnowledgeModule = {
  id: 'div08-deliverables',
  domain: 'trade',
  title: 'Division 08 MasterFormat Typical Deliverables',
  effectiveDate: '2026-04-06',
  reviewByDate: '2027-04-06',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
