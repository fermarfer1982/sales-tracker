'use strict';

jest.mock('../src/models/User', () => ({
  find: jest.fn(),
}));

const User = require('../src/models/User');
const { canViewAllSales, getAccessibleSalesUserIds } = require('../src/utils/salesScope');

describe('sales scope helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('manager global puede ver toda la red comercial', () => {
    expect(canViewAllSales({ role: 'manager', canViewAllSales: true })).toBe(true);
    expect(canViewAllSales({ role: 'manager', canViewAllSales: false })).toBe(false);
  });

  test('admin tiene alcance global comercial', () => {
    expect(canViewAllSales({ role: 'admin' })).toBe(true);
  });

  test('manager normal obtiene solo ids de su equipo', async () => {
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'sales-1' }, { _id: 'sales-2' }]),
    });

    const ids = await getAccessibleSalesUserIds({ _id: 'mgr-1', role: 'manager', canViewAllSales: false }, { isActive: true });

    expect(User.find).toHaveBeenCalledWith({ managerUserId: 'mgr-1', isActive: true });
    expect(ids).toEqual(['sales-1', 'sales-2']);
  });

  test('manager global obtiene todos los comerciales activos filtrables por zona', async () => {
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'sales-3' }]),
    });

    const ids = await getAccessibleSalesUserIds(
      { _id: 'mgr-global', role: 'manager', canViewAllSales: true },
      { isActive: true, zoneId: 'zone-1' }
    );

    expect(User.find).toHaveBeenCalledWith({ role: 'sales', isActive: true, zoneId: 'zone-1' });
    expect(ids).toEqual(['sales-3']);
  });
});
