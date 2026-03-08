import type { KnowledgeModule } from './types';

export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  'risk-overview': [],
  'dates-deadlines': [],
  'scope-of-work': [],
  'legal-indemnification': [],
  'legal-payment-contingency': [],
  'legal-liquidated-damages': [],
  'legal-retainage': [],
  'legal-insurance': [],
  'legal-termination': [],
  'legal-flow-down': [],
  'legal-no-damage-delay': [],
  'legal-lien-rights': [],
  'legal-dispute-resolution': [],
  'legal-change-order': [],
  'verbiage-analysis': [],
  'labor-compliance': [],
};

const moduleStore = new Map<string, KnowledgeModule>();

export function registerModule(mod: KnowledgeModule): void {
  moduleStore.set(mod.id, mod);
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
