import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getUrgencyGroup,
  getRelativeLabel,
  countDeadlinesWithin7Days,
  groupDatesByUrgency,
  URGENCY_GROUPS,
} from './dateUrgency';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-22T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('URGENCY_GROUPS', () => {
  it('has four urgency groups in order', () => {
    expect(URGENCY_GROUPS).toHaveLength(4);
    expect(URGENCY_GROUPS.map(g => g.key)).toEqual(['overdue', 'this-week', 'this-month', 'later']);
  });
});

describe('getUrgencyGroup', () => {
  it('returns overdue for a past date within 30 days', () => {
    expect(getUrgencyGroup('2026-03-19')).toBe('overdue'); // 3 days ago
  });

  it('returns null for a date 31 days ago (excluded)', () => {
    expect(getUrgencyGroup('2026-02-19')).toBeNull(); // 31 days ago
  });

  it('returns this-week for today', () => {
    expect(getUrgencyGroup('2026-03-22')).toBe('this-week');
  });

  it('returns this-week for a date 3 days from now', () => {
    expect(getUrgencyGroup('2026-03-25')).toBe('this-week');
  });

  it('returns this-week for a date 7 days from now', () => {
    expect(getUrgencyGroup('2026-03-29')).toBe('this-week');
  });

  it('returns this-month for a date 8 days from now', () => {
    expect(getUrgencyGroup('2026-03-30')).toBe('this-month');
  });

  it('returns this-month for a date 30 days from now', () => {
    expect(getUrgencyGroup('2026-04-21')).toBe('this-month');
  });

  it('returns later for a date 31 days from now', () => {
    expect(getUrgencyGroup('2026-04-22')).toBe('later');
  });

  it('returns overdue for a date exactly 30 days ago', () => {
    expect(getUrgencyGroup('2026-02-20')).toBe('overdue'); // 30 days ago
  });
});

describe('getRelativeLabel', () => {
  it('returns "3d ago" for a date 3 days in the past', () => {
    expect(getRelativeLabel('2026-03-19')).toBe('3d ago');
  });

  it('returns "Today" for today', () => {
    expect(getRelativeLabel('2026-03-22')).toBe('Today');
  });

  it('returns "5d away" for a date 5 days in the future', () => {
    expect(getRelativeLabel('2026-03-27')).toBe('5d away');
  });
});

describe('countDeadlinesWithin7Days', () => {
  it('counts only dates 0-7 days away', () => {
    const dates = [
      { date: '2026-03-19' }, // past, excluded
      { date: '2026-03-22' }, // today, included
      { date: '2026-03-25' }, // 3 days, included
      { date: '2026-03-29' }, // 7 days, included
      { date: '2026-03-30' }, // 8 days, excluded
      { date: '2026-04-30' }, // far future, excluded
    ];
    expect(countDeadlinesWithin7Days(dates)).toBe(3);
  });

  it('returns 0 when no qualifying dates', () => {
    const dates = [
      { date: '2026-03-19' }, // past
      { date: '2026-04-30' }, // far future
    ];
    expect(countDeadlinesWithin7Days(dates)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(countDeadlinesWithin7Days([])).toBe(0);
  });
});

describe('groupDatesByUrgency', () => {
  const contracts = [
    {
      id: 'c1',
      name: 'ABC Construction',
      status: 'Reviewed',
      dates: [
        { label: 'Retainage release', date: '2026-03-19', type: 'Deadline' as const },
        { label: 'Submittal deadline', date: '2026-03-25', type: 'Milestone' as const },
        { label: 'Progress payment', date: '2026-04-09', type: 'Deadline' as const },
      ],
    },
    {
      id: 'c2',
      name: 'XYZ Glazing',
      status: 'Reviewed',
      dates: [
        { label: 'Insurance cert due', date: '2026-03-15', type: 'Deadline' as const },
        { label: 'Final inspection', date: '2026-05-01', type: 'Milestone' as const },
      ],
    },
    {
      id: 'c3',
      name: 'Draft Corp',
      status: 'Draft',
      dates: [
        { label: 'Should not appear', date: '2026-03-23', type: 'Deadline' as const },
      ],
    },
  ];

  it('groups entries correctly', () => {
    const result = groupDatesByUrgency(contracts);
    expect(result.overdue).toHaveLength(2); // Mar 19, Mar 15
    expect(result['this-week']).toHaveLength(1); // Mar 25
    expect(result['this-month']).toHaveLength(1); // Apr 9
    expect(result.later).toHaveLength(1); // May 1
  });

  it('excludes dates older than 30 days overdue', () => {
    const oldContract = [
      {
        id: 'old',
        name: 'Old Contract',
        status: 'Reviewed',
        dates: [
          { label: 'Ancient deadline', date: '2026-02-01', type: 'Deadline' as const }, // ~49 days ago
        ],
      },
    ];
    const result = groupDatesByUrgency(oldContract);
    expect(result.overdue).toHaveLength(0);
  });

  it('excludes non-Reviewed contracts', () => {
    const result = groupDatesByUrgency(contracts);
    const allEntries = [
      ...result.overdue,
      ...result['this-week'],
      ...result['this-month'],
      ...result.later,
    ];
    expect(allEntries.every(e => e.contractId !== 'c3')).toBe(true);
  });

  it('sorts entries by date within each group', () => {
    const result = groupDatesByUrgency(contracts);
    // Overdue: Mar 15 should come before Mar 19 (ascending by date)
    expect(result.overdue[0].label).toBe('Insurance cert due');
    expect(result.overdue[1].label).toBe('Retainage release');
  });

  it('includes contractId and contractName on entries', () => {
    const result = groupDatesByUrgency(contracts);
    const entry = result['this-week'][0];
    expect(entry.contractId).toBe('c1');
    expect(entry.contractName).toBe('ABC Construction');
    expect(entry.urgencyGroup).toBe('this-week');
  });
});
