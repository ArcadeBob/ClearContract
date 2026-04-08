export type { KnowledgeModule, CompanyProfile } from './types.js';
export { DEFAULT_COMPANY_PROFILE } from './types.js';

export {
  registerModule,
  getModulesForPass,
  PASS_KNOWLEDGE_MAP,
} from './registry.js';

export {
  estimateTokens,
  validateTokenBudget,
  TOKEN_CAP_PER_MODULE,
  MAX_MODULES_PER_PASS,
} from './tokenBudget.js';

import type { CompanyProfile } from './types.js';
import { getModulesForPass } from './registry.js';
import { validateTokenBudget } from './tokenBudget.js';

function formatCompanyProfile(profile: CompanyProfile): string {
  return [
    `Insurance: GL ${profile.glPerOccurrence}/${profile.glAggregate}, ` +
      `Umbrella ${profile.umbrellaLimit}, Auto ${profile.autoLimit}, ` +
      `WC ${profile.wcStatutoryState} statutory / ${profile.wcEmployerLiability} EL`,
    `Bonding: ${profile.bondingSingleProject} single / ${profile.bondingAggregate} aggregate`,
    `License: ${profile.contractorLicenseType} #${profile.contractorLicenseNumber} (exp ${profile.contractorLicenseExpiry})`,
    `DIR: ${profile.dirRegistration} (exp ${profile.dirExpiry})`,
    `SBE: ${profile.sbeCertId} (${profile.sbeCertIssuer})`,
    `Capabilities: ~${profile.employeeCount} employees, ${profile.serviceArea}, ` +
      `typical projects ${profile.typicalProjectSizeMin}-${profile.typicalProjectSizeMax}`,
  ].join('\n');
}

export function composeSystemPrompt(
  basePrompt: string,
  passName: string,
  companyProfile?: CompanyProfile
): string {
  const modules = getModulesForPass(passName);

  validateTokenBudget(modules);

  let composed = basePrompt;

  if (modules.length > 0) {
    composed += '\n\n## Domain Knowledge\n';
    for (const mod of modules) {
      composed += `\n### ${mod.title} (effective: ${mod.effectiveDate})\n${mod.content}\n`;
    }
  }

  if (companyProfile) {
    composed += '\n\n## Company Profile\n';
    composed += formatCompanyProfile(companyProfile);
  }

  return composed;
}
