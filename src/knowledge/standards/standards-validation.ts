import type { KnowledgeModule } from '../types.js';

const content = `ASTM/AAMA/FGIA STANDARDS VALIDATION FOR GLAZING CONTRACTS
Analysis instructions for validating industry standard references in contract specifications.

GLASS STANDARDS (Current):
- ASTM C1036-21: Standard Specification for Flat Glass
- ASTM C1048-19e1: Standard Specification for Heat-Strengthened and Fully Tempered Flat Glass
- ASTM C1172-19: Standard Specification for Laminated Architectural Flat Glass
- ASTM E2190-19: Standard Specification for Insulating Glass Unit Performance and Evaluation

PERFORMANCE TESTING STANDARDS (Current):
- ASTM E330/E330M: Standard Test Method for Structural Performance of Exterior Windows, Doors, Skylights, and Curtain Walls by Uniform Static Air Pressure Difference (wind load)
- ASTM E1300-16: Standard Practice for Determining Load Resistance of Glass in Buildings (glass load resistance tables)
- ASTM E283: Standard Test Method for Determining Rate of Air Leakage Through Exterior Windows, Curtain Walls, and Doors
- ASTM E331: Standard Test Method for Water Penetration of Exterior Windows, Skylights, Doors, and Curtain Walls by Uniform Static Air Pressure Difference
- ASTM E547: Standard Test Method for Water Penetration of Exterior Windows, Skylights, Doors, and Curtain Walls by Cyclic Static Air Pressure Differential
- ASTM E1105: Standard Test Method for Field Determination of Water Penetration of Installed Exterior Windows, Skylights, Doors, and Curtain Walls

SEALANT AND MATERIAL STANDARDS (Current):
- ASTM C920-18: Standard Specification for Elastomeric Joint Sealants
- ASTM C1193: Standard Guide for Use of Joint Sealants
- ASTM C1369: Standard Specification for Secondary Edge Sealants for Structurally Glazed Insulating Glass Units
- ASTM C1184: Standard Specification for Structural Silicone Sealants

INSTALLATION STANDARDS (Current):
- ASTM E2112: Standard Practice for Installation of Exterior Windows, Doors, and Skylights

SAFETY GLAZING STANDARDS (Current):
- ASTM C1048: Standard Specification for Heat-Strengthened and Fully Tempered Flat Glass (safety-related applications)
- 16 CFR 1201: CPSC Safety Standard for Architectural Glazing Materials
- ANSI Z97.1: American National Standard for Safety Glazing Materials Used in Buildings

METALS AND ALUMINUM STANDARDS (Current):
- ASTM B221: Standard Specification for Aluminum and Aluminum-Alloy Extruded Bars, Rods, Wire, Profiles, and Tubes
- AAMA 611 (now FGIA 611): Voluntary Specification for Anodized Architectural Aluminum
- AAMA 2604: Voluntary Specification, Performance Requirements and Test Procedures for High-Performance Organic Coatings on Aluminum Extrusions and Panels (5-year)
- AAMA 2605: Voluntary Specification, Performance Requirements and Test Procedures for Superior-Performing Organic Coatings on Aluminum Extrusions and Panels (10-year)

FENESTRATION PERFORMANCE STANDARDS (Current):
- AAMA/WDMA/CSA 101/I.S.2/A440 (now NAFS -- North American Fenestration Standard): Performance standard for windows, doors, and skylights
- AAMA 501.1: Standard Test Method for Exterior Windows, Curtain Walls, and Doors for Water Penetration Using Dynamic Pressure (field water test for curtain walls)
- AAMA 501.2: Quality Assurance and Diagnostic Water Leakage Field Check of Installed Storefronts, Curtain Walls, and Sloped Glazing Systems (nozzle spray test)
- AAMA 502: Voluntary Specification for Field Testing of Newly Installed Storefronts, Curtain Walls, and Sloped Glazing Systems
- AAMA 506: Voluntary Specification for Impact and Cycle Testing of Fenestration Products

FIRE-RATED GLAZING STANDARDS (Current):
- ASTM E119: Standard Test Methods for Fire Tests of Building Construction and Materials
- ASTM E2010: Standard Test Method for Positive Pressure Fire Tests of Window Assemblies
- UL 263: Standard for Fire Tests of Building Construction and Materials

SUPERSEDED STANDARDS (Known Obsolete Versions):
- ASTM E2190-08 superseded by E2190-19
- ASTM C1036-16 superseded by C1036-21
- ASTM C1048-12 superseded by C1048-19e1
- ASTM C1172-14 superseded by C1172-19
- ASTM C920-14 superseded by C920-18
- ASTM E1300-12a superseded by E1300-16
- AAMA 101/I.S.2/A440-08 superseded by NAFS current edition

AAMA-TO-FGIA REBRAND:
As of January 1, 2020, the American Architectural Manufacturers Association (AAMA) merged with the Insulating Glass Manufacturers Alliance (IGMA) to form the Fenestration and Glazing Industry Alliance (FGIA). All AAMA standards are now published under the FGIA name. The technical content of the standards did not change during the rebrand -- only the publishing organization name changed.

ANALYSIS INSTRUCTIONS:
When reviewing a contract that references industry standards:

1. Check each standard reference against the superseded list above
2. If a superseded standard version is referenced:
   - Safety-related standard (C1048, 16 CFR 1201, Z97.1, E119, E2010): generate HIGH severity finding with category "Contract Compliance"
   - Performance testing standard (E330, E1300, E283, E331, E547, E1105, E2190): generate MEDIUM severity finding with category "Contract Compliance"
   - Cosmetic or material standard (C920, B221, AAMA 2604/2605): generate LOW severity finding with category "Contract Compliance"
3. If a standard is referenced as "AAMA" rather than "FGIA": generate INFO severity finding noting the AAMA-to-FGIA rebrand effective January 1, 2020, with category "Contract Compliance" -- this is informational only as the technical content is unchanged
4. Do NOT flag missing version years on standard references -- many contracts intentionally reference "latest edition"
5. Include the current version number in findings so the reviewer knows what to request as a correction
6. For fire-rated glazing standards, note that these carry life-safety implications in the finding`;

export const standardsValidation: KnowledgeModule = {
  id: 'standards-validation',
  domain: 'standards',
  title: 'ASTM/AAMA/FGIA Standards Validation for Glazing Contracts',
  effectiveDate: '2026-03-01',
  reviewByDate: '2027-03-01',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
