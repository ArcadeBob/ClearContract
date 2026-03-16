import { MergedFindingSchema, type MergedFinding } from '../schemas/finding';
import type { Contract, ContractDate } from '../types/contract';

let _findingCounter = 0;
let _contractCounter = 0;

/**
 * Creates a valid MergedFinding with sensible defaults.
 * The result is validated against MergedFindingSchema -- throws ZodError if invalid.
 */
export function createFinding(overrides?: Partial<MergedFinding>): MergedFinding {
  const n = _findingCounter++;
  const defaults: MergedFinding = {
    id: `finding-${n}`,
    severity: 'Medium',
    category: 'Scope of Work',
    title: `Test Finding ${n}`,
    description: 'Test description for finding.',
    recommendation: 'Test recommendation.',
    clauseReference: 'Section 1.1',
    negotiationPosition: 'Request amendment.',
    actionPriority: 'monitor',
    resolved: false,
    note: '',
  };
  return MergedFindingSchema.parse({ ...defaults, ...overrides });
}

/**
 * Creates a Contract object with sensible defaults.
 * No Zod validation (Contract is a plain interface).
 */
export function createContract(overrides?: Partial<Contract>): Contract {
  const n = _contractCounter++;
  const defaults: Contract = {
    id: `contract-${n}`,
    name: `Test Contract ${n}`,
    client: 'Test Client',
    type: 'Subcontract',
    uploadDate: new Date().toISOString(),
    status: 'Reviewed',
    findings: [],
    dates: [],
    riskScore: 45,
  };
  return { ...defaults, ...overrides };
}

/**
 * Creates a ContractDate with sensible defaults.
 */
export function createContractDate(overrides?: Partial<ContractDate>): ContractDate {
  const defaults: ContractDate = {
    label: 'Substantial Completion',
    date: '2026-06-15',
    type: 'Deadline',
  };
  return { ...defaults, ...overrides };
}
