// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { computeRiskScore, applySeverityGuard } from './scoring.js';

describe('computeRiskScore', () => {
  it('returns score 0 and empty categories for empty findings', () => {
    const result = computeRiskScore([]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('scores single Critical finding in Legal Issues (weight 1.0) as 50', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Legal Issues', title: 'Test' },
    ]);
    // rawScore = 25 * 1.0 = 25, score = round(50 * log2(1 + 25/25)) = round(50 * 1) = 50
    expect(result.score).toBe(50);
  });

  it('scores single High finding in Legal Issues as 34', () => {
    const result = computeRiskScore([
      { severity: 'High', category: 'Legal Issues', title: 'Test' },
    ]);
    // rawScore = 15 * 1.0 = 15, score = round(50 * log2(1 + 15/25)) = round(50 * log2(1.6)) = round(50 * 0.678) = 34
    expect(result.score).toBe(34);
  });

  it('scores single Medium finding in Legal Issues as 20', () => {
    const result = computeRiskScore([
      { severity: 'Medium', category: 'Legal Issues', title: 'Test' },
    ]);
    // rawScore = 8 * 1.0 = 8, score = round(50 * log2(1 + 8/25)) = round(50 * log2(1.32)) = round(50 * 0.4004) = 20
    expect(result.score).toBe(20);
  });

  it('scores single Low finding in Legal Issues as 8', () => {
    const result = computeRiskScore([
      { severity: 'Low', category: 'Legal Issues', title: 'Test' },
    ]);
    // rawScore = 3 * 1.0 = 3, score = round(50 * log2(1 + 3/25)) = round(50 * log2(1.12)) = round(50 * 0.1634) = 8
    expect(result.score).toBe(8);
  });

  it('scores single Info finding as 0', () => {
    const result = computeRiskScore([
      { severity: 'Info', category: 'Legal Issues', title: 'Test' },
    ]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('scores single Critical in 0.75-weight category (Scope of Work) lower than 1.0-weight', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Scope of Work', title: 'Test' },
    ]);
    // rawScore = 25 * 0.75 = 18.75, score = round(50 * log2(1 + 18.75/25)) = round(50 * log2(1.75))
    expect(result.score).toBe(40);
  });

  it('scores Compound Risk category (weight 0) as 0', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Compound Risk', title: 'Test' },
    ]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('skips findings with "Analysis Pass Failed:" title prefix', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Legal Issues', title: 'Analysis Pass Failed: something' },
    ]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('scores unknown category as 0', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Nonexistent Category', title: 'Test' },
    ]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('accumulates multiple findings in same category', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Legal Issues', title: 'Test 1' },
      { severity: 'Critical', category: 'Legal Issues', title: 'Test 2' },
    ]);
    // rawScore = (25 + 25) * 1.0 = 50, score = round(50 * log2(1 + 50/25)) = round(50 * log2(3)) = round(50 * 1.585) = 79
    expect(result.score).toBe(79);
  });

  it('caps score at 100 with many Critical findings', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Legal Issues', title: 'T1' },
      { severity: 'Critical', category: 'Financial Terms', title: 'T2' },
      { severity: 'Critical', category: 'Insurance Requirements', title: 'T3' },
      { severity: 'Critical', category: 'Risk Assessment', title: 'T4' },
      { severity: 'Critical', category: 'Legal Issues', title: 'T5' },
    ]);
    // rawScore = 25*1 + 25*1 + 25*1 + 25*1 + 25*1 = 125, log2(1+125/25) = log2(6) = 2.585
    // score = round(50 * 2.585) = round(129.25) = 129 -> capped at 100
    expect(result.score).toBe(100);
  });

  it('sorts categories array descending by points', () => {
    const result = computeRiskScore([
      { severity: 'Medium', category: 'Scope of Work', title: 'T1' },
      { severity: 'Critical', category: 'Legal Issues', title: 'T2' },
    ]);
    expect(result.categories[0].name).toBe('Legal Issues');
    expect(result.categories[1].name).toBe('Scope of Work');
  });

  it('rounds category points to 1 decimal place', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Scope of Work', title: 'Test' },
    ]);
    // 25 * 0.75 = 18.75, rounded to 1 decimal = 18.8
    expect(result.categories[0].points).toBe(18.8);
  });
});

describe('applySeverityGuard', () => {
  it('upgrades finding with clauseText mentioning "CC 2782" to Critical', () => {
    const finding = { severity: 'Medium', clauseText: 'Pursuant to CC 2782 provisions' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('upgrades finding with clauseText mentioning "CC 8814" to Critical', () => {
    const finding = { severity: 'High', clauseText: 'Under CC 8814 requirements' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('upgrades finding with clauseText mentioning "CC 8122" to Critical', () => {
    const finding = { severity: 'Low', clauseText: 'Per CC 8122 statute' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('upgrades finding with clauseText mentioning "Civil Code Section 2782" to Critical', () => {
    const finding = { severity: 'Medium', clauseText: 'Civil Code Section 2782 applies' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('upgrades finding with clauseText mentioning "Civil Code Section 8814" to Critical', () => {
    const finding = { severity: 'Medium', clauseText: 'Civil Code Section 8814 applies' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('upgrades finding with clauseText mentioning "Civil Code Section 8122" to Critical', () => {
    const finding = { severity: 'Medium', clauseText: 'Civil Code Section 8122 applies' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('does not change already-Critical finding', () => {
    const finding = { severity: 'Critical', clauseText: 'CC 2782 reference' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('does not change finding with no statute reference', () => {
    const finding = { severity: 'Medium', clauseText: 'No statute mentioned here' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Medium');
  });

  it('scans explanation field for statute references', () => {
    const finding = { severity: 'High', explanation: 'This violates CC 2782 provisions' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('matches case-insensitively (cc 2782)', () => {
    const finding = { severity: 'Medium', clauseText: 'see cc 2782 for details' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });
});
