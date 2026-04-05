import type { KnowledgeModule } from './types';

export const TOKEN_CAP_PER_MODULE = 10000;
export const MAX_MODULES_PER_PASS = 6;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function validateTokenBudget(modules: KnowledgeModule[]): void {
  if (modules.length > MAX_MODULES_PER_PASS) {
    throw new Error(
      `Pass has ${modules.length} knowledge modules; max is ${MAX_MODULES_PER_PASS}`
    );
  }
  for (const mod of modules) {
    const tokens = estimateTokens(mod.content);
    if (tokens > TOKEN_CAP_PER_MODULE) {
      throw new Error(
        `Knowledge module '${mod.id}' exceeds token cap: ${tokens} estimated tokens (cap: ${TOKEN_CAP_PER_MODULE}). Developer must reduce content.`
      );
    }
  }
}
