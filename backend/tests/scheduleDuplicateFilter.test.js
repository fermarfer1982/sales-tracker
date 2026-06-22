'use strict';

const { buildScheduledDuplicateFilter, buildScheduledCheckInMatchFilter } = require('../src/utils/schedule');

describe('buildScheduledDuplicateFilter', () => {
  test('genera filtro para drafts del mismo usuario, cliente y día', () => {
    const filter = buildScheduledDuplicateFilter({
      userId: 'u1',
      clientId: 'c1',
      activityDate: '2026-04-16T12:00:00.000Z',
    });

    expect(filter.userId).toBe('u1');
    expect(filter.clientId).toBe('c1');
    expect(filter.status).toBe('draft');
    expect(filter.deletedAt).toBeNull();
    expect(filter.activityDate.$gte.toISOString()).toBe('2026-04-16T00:00:00.000Z');
    expect(filter.activityDate.$lte.toISOString()).toBe('2026-04-16T23:59:59.999Z');
  });

  test('permite excluir una actividad al editar', () => {
    const filter = buildScheduledDuplicateFilter({
      userId: 'u1',
      clientId: 'c1',
      activityDate: '2026-04-16T12:00:00.000Z',
      excludeId: 'a1',
    });

    expect(filter._id).toEqual({ $ne: 'a1' });
  });

  test('genera filtro para reutilizar un draft en check-in', () => {
    const filter = buildScheduledCheckInMatchFilter({
      userId: 'u1',
      clientId: 'c1',
      activityTypeId: 't1',
      activityDate: '2026-04-16T12:00:00.000Z',
    });

    expect(filter.userId).toBe('u1');
    expect(filter.clientId).toBe('c1');
    expect(filter.activityTypeId).toBe('t1');
    expect(filter.status).toBe('draft');
    expect(filter.activityDate.$gte.toISOString()).toBe('2026-04-16T00:00:00.000Z');
    expect(filter.activityDate.$lte.toISOString()).toBe('2026-04-16T23:59:59.999Z');
  });
});
