import type { KnowledgeModule } from './types';
import { validateTokenBudget } from './tokenBudget';

export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  'risk-overview': ['contract-forms'],
  'dates-deadlines': [],
  'scope-of-work': [
    'ca-title24',
    'div08-scope',
    'standards-validation',
    'contract-forms',
  ],
  'legal-indemnification': ['ca-lien-law'],
  'legal-payment-contingency': ['ca-lien-law', 'ca-public-works-payment'],
  'legal-liquidated-damages': ['ca-liquidated-damages'],
  'legal-retainage': ['ca-public-works-payment'],
  'legal-insurance': ['ca-insurance-law'],
  'legal-termination': [],
  'legal-flow-down': [],
  'legal-no-damage-delay': [],
  'legal-lien-rights': ['ca-lien-law'],
  'legal-dispute-resolution': ['ca-dispute-resolution'],
  'legal-change-order': [],
  'verbiage-analysis': ['glazing-sub-protections'],
  'labor-compliance': ['ca-prevailing-wage', 'ca-calosha'],
};

const moduleStore = new Map<string, KnowledgeModule>();

export function registerModule(mod: KnowledgeModule): void {
  validateTokenBudget([mod]);
  moduleStore.set(mod.id, mod);
}

export function validateAllModulesRegistered(): void {
  const missing: string[] = [];
  for (const [passName, ids] of Object.entries(PASS_KNOWLEDGE_MAP)) {
    for (const id of ids) {
      if (!moduleStore.has(id)) {
        missing.push(`'${id}' (required by '${passName}')`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Knowledge modules not registered: ${missing.join(', ')}. Ensure all modules are imported before handler runs.`
    );
  }
}

export function getModulesForPass(passName: string): KnowledgeModule[] {
  const ids = PASS_KNOWLEDGE_MAP[passName] ?? [];
  return ids.map((id) => {
    const mod = moduleStore.get(id);
    if (!mod) {
      throw new Error(
        `Knowledge module '${id}' mapped to pass '${passName}' but not found in registry. Did you forget to call registerModule()?`
      );
    }
    return mod;
  });
}
