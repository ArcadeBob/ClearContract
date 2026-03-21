import { describe, it, expect } from 'vitest';
import { SEVERITY_BADGE_COLORS, getRiskScoreColor, getRiskBadgeColor } from './palette';
import type { Severity } from '../types/contract';

describe('SEVERITY_BADGE_COLORS', () => {
  it('has entries for all five severity levels', () => {
    const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    for (const sev of severities) {
      expect(SEVERITY_BADGE_COLORS[sev]).toBeDefined();
      expect(typeof SEVERITY_BADGE_COLORS[sev]).toBe('string');
      expect(SEVERITY_BADGE_COLORS[sev].length).toBeGreaterThan(0);
    }
  });

  it('Critical uses red classes', () => {
    expect(SEVERITY_BADGE_COLORS['Critical']).toContain('red');
  });

  it('High uses amber classes', () => {
    expect(SEVERITY_BADGE_COLORS['High']).toContain('amber');
  });

  it('Medium uses yellow classes', () => {
    expect(SEVERITY_BADGE_COLORS['Medium']).toContain('yellow');
  });

  it('Low uses blue classes', () => {
    expect(SEVERITY_BADGE_COLORS['Low']).toContain('blue');
  });

  it('Info uses slate classes', () => {
    expect(SEVERITY_BADGE_COLORS['Info']).toContain('slate');
  });
});

describe('getRiskScoreColor', () => {
  it('returns red for score > 70', () => {
    expect(getRiskScoreColor(71)).toBe('text-red-600');
    expect(getRiskScoreColor(100)).toBe('text-red-600');
  });

  it('returns amber for score > 40 and <= 70', () => {
    expect(getRiskScoreColor(41)).toBe('text-amber-600');
    expect(getRiskScoreColor(70)).toBe('text-amber-600');
  });

  it('returns emerald for score <= 40', () => {
    expect(getRiskScoreColor(40)).toBe('text-emerald-600');
    expect(getRiskScoreColor(0)).toBe('text-emerald-600');
  });
});

describe('getRiskBadgeColor', () => {
  it('returns red badge for score >= 70', () => {
    expect(getRiskBadgeColor(70)).toContain('red');
    expect(getRiskBadgeColor(100)).toContain('red');
  });

  it('returns amber badge for score >= 40 and < 70', () => {
    expect(getRiskBadgeColor(40)).toContain('amber');
    expect(getRiskBadgeColor(69)).toContain('amber');
  });

  it('returns emerald badge for score < 40', () => {
    expect(getRiskBadgeColor(39)).toContain('emerald');
    expect(getRiskBadgeColor(0)).toContain('emerald');
  });
});
