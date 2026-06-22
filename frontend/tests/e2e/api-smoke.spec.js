const { test, expect, request } = require('@playwright/test');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001/api';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@empresa.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || 'jefe@empresa.local';
const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const SALES_EMAIL = process.env.E2E_SALES_EMAIL || 'comercial1@empresa.local';
const SALES_PASSWORD = process.env.E2E_SALES_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';

async function login(api, email, password) {
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login E2E fallido para ${email}. Status ${response.status()}. Respuesta: ${body}`);
  }
  const payload = await response.json();
  return payload.data;
}

async function ensureRoleFixtures(api) {
  const admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);

  const usersResponse = await api.get(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(usersResponse.ok()).toBeTruthy();
  const usersPayload = await usersResponse.json();

  const manager = (usersPayload.data || []).find((user) => user.email === MANAGER_EMAIL);
  const salesUser = (usersPayload.data || []).find((user) => user.email === SALES_EMAIL);

  if (!manager) throw new Error(`No existe usuario manager para E2E: ${MANAGER_EMAIL}`);
  if (!salesUser) throw new Error(`No existe usuario sales para E2E: ${SALES_EMAIL}`);

  if (!manager.isActive) {
    const activateManager = await api.patch(`${API_BASE_URL}/users/${manager._id}/activate`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(activateManager.ok()).toBeTruthy();
  }

  if (!salesUser.isActive) {
    const activateSales = await api.patch(`${API_BASE_URL}/users/${salesUser._id}/activate`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(activateSales.ok()).toBeTruthy();
  }

  const updateManager = await api.put(`${API_BASE_URL}/users/${manager._id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: {
      name: manager.name,
      role: 'manager',
      zoneId: manager.zoneId?._id || '',
      managerUserId: '',
      canViewAllSales: true,
      isActive: true,
    },
  });
  expect(updateManager.ok()).toBeTruthy();
}

test.beforeAll(async () => {
  const api = await request.newContext();
  await ensureRoleFixtures(api);
  await api.dispose();
});

test('health endpoint responde', async () => {
  const api = await request.newContext();
  const response = await api.get(`${API_BASE_URL}/health`);
  expect(response.ok()).toBeTruthy();
  await api.dispose();
});

test('admin puede listar usuarios', async () => {
  const api = await request.newContext();
  const admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
  const response = await api.get(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(Array.isArray(payload.data)).toBeTruthy();
  await api.dispose();
});

test('manager puede usar opciones comerciales pero no listar todos los usuarios', async () => {
  const api = await request.newContext();
  const manager = await login(api, MANAGER_EMAIL, MANAGER_PASSWORD);

  const optionsResponse = await api.get(`${API_BASE_URL}/users/options`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  expect(optionsResponse.ok()).toBeTruthy();

  const usersResponse = await api.get(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${manager.token}` },
  });
  expect(usersResponse.status()).toBe(403);
  await api.dispose();
});

test('sales no puede acceder a dashboard ni a usuarios', async () => {
  const api = await request.newContext();
  const sales = await login(api, SALES_EMAIL, SALES_PASSWORD);

  const dashboardResponse = await api.get(`${API_BASE_URL}/dashboard/kpis`, {
    headers: { Authorization: `Bearer ${sales.token}` },
  });
  expect(dashboardResponse.status()).toBe(403);

  const usersResponse = await api.get(`${API_BASE_URL}/users/options`, {
    headers: { Authorization: `Bearer ${sales.token}` },
  });
  expect(usersResponse.status()).toBe(403);
  await api.dispose();
});
