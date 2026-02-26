'use strict';

const {
  hasZoneAccessToClient,
  applyClientZoneFilterForUser,
  hasSalesZone,
} = require('../src/utils/zoneAccess');

describe('zoneAccess', () => {
  test('sales con misma zona puede acceder', () => {
    const user = { role: 'sales', zoneId: 'z1' };
    const client = { zoneId: 'z1' };
    expect(hasZoneAccessToClient(user, client)).toBe(true);
  });

  test('sales con distinta zona no puede acceder', () => {
    const user = { role: 'sales', zoneId: 'z1' };
    const client = { zoneId: 'z2' };
    expect(hasZoneAccessToClient(user, client)).toBe(false);
  });

  test('admin puede acceder a cualquier zona', () => {
    const user = { role: 'admin', zoneId: null };
    const client = { zoneId: 'z2' };
    expect(hasZoneAccessToClient(user, client)).toBe(true);
  });

  test('sales sin zona no tiene acceso', () => {
    const user = { role: 'sales', zoneId: null };
    const client = { zoneId: 'z1' };
    expect(hasSalesZone(user)).toBe(false);
    expect(hasZoneAccessToClient(user, client)).toBe(false);
  });

  test('applyClientZoneFilterForUser añade filtro de zona a sales', () => {
    const user = { role: 'sales', zoneId: 'z1' };
    const filter = applyClientZoneFilterForUser(user, { deletedAt: null });
    expect(filter).toEqual({ deletedAt: null, zoneId: 'z1' });
  });
});
