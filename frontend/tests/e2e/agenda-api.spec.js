const { test, expect, request } = require('@playwright/test');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001/api';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@empresa.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || 'jefe@empresa.local';
const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const SALES_EMAIL = process.env.E2E_SALES_EMAIL || 'comercial1@empresa.local';
const SALES_PASSWORD = process.env.E2E_SALES_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';

function todayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sampleGeo() {
  return {
    lat: 42.8125,
    lng: -1.6458,
    accuracyMeters: 15,
    capturedAt: new Date().toISOString(),
    status: 'ok',
  };
}

async function login(api, email, password) {
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login agenda E2E fallido para ${email}: ${response.status()} ${await response.text()}`);
  }
  return (await response.json()).data;
}

async function getJson(api, url, token, expectedStatus = 200) {
  const response = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

async function postJson(api, url, token, data, expectedStatus = 200) {
  const response = await api.post(url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

async function putJson(api, url, token, data, expectedStatus = 200) {
  const response = await api.put(url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

async function ensureRoleFixtures(api) {
  const admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
  const usersPayload = await getJson(api, `${API_BASE_URL}/users`, admin.token);
  const manager = (usersPayload.data || []).find((user) => user.email === MANAGER_EMAIL);
  const salesUser = (usersPayload.data || []).find((user) => user.email === SALES_EMAIL);

  expect(manager).toBeTruthy();
  expect(salesUser).toBeTruthy();

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

test('agenda: manager agenda para sales, evita duplicado y sales consume el draft al hacer check-in', async () => {
  const api = await request.newContext();
  const manager = await login(api, MANAGER_EMAIL, MANAGER_PASSWORD);
  const sales = await login(api, SALES_EMAIL, SALES_PASSWORD);

  const optionsPayload = await getJson(api, `${API_BASE_URL}/users/options`, manager.token);
  const salesUser = (optionsPayload.data || []).find((user) => user.email === SALES_EMAIL);
  expect(salesUser).toBeTruthy();

  const clientsPayload = await getJson(api, `${API_BASE_URL}/clients?limit=20`, sales.token);
  const clients = clientsPayload.data || [];
  expect(clients.length).toBeGreaterThan(0);
  const client = clients[0];

  const activityTypesPayload = await getJson(api, `${API_BASE_URL}/catalogs/activity-types`, sales.token);
  const activityTypes = activityTypesPayload.data || [];
  expect(activityTypes.length).toBeGreaterThan(0);
  const activityType = activityTypes[0];

  const productsPayload = await getJson(api, `${API_BASE_URL}/catalogs/products`, sales.token);
  const outcomesPayload = await getJson(api, `${API_BASE_URL}/catalogs/outcomes`, sales.token);
  const product = (productsPayload.data || [])[0];
  const outcome = (outcomesPayload.data || [])[0];
  expect(product).toBeTruthy();
  expect(outcome).toBeTruthy();

  const activityDate = todayIsoLocal();

  const beforeCalendarPayload = await getJson(api, `${API_BASE_URL}/activities/calendar?from=${activityDate}&to=${activityDate}&userId=${salesUser._id}`, manager.token);
  const existingDraft = (beforeCalendarPayload.data?.visits || []).find((visit) =>
    String(visit.clientId?._id || visit.clientId) === String(client._id)
    && String(visit.activityTypeId?._id || visit.activityTypeId) === String(activityType._id)
    && visit.status === 'draft'
  );
  expect(existingDraft).toBeFalsy();

  const schedulePayload = await postJson(api, `${API_BASE_URL}/activities/schedule`, manager.token, {
    clientId: client._id,
    activityTypeId: activityType._id,
    activityDate,
    userId: salesUser._id,
    notes: 'Agenda E2E',
  }, 201);

  const scheduled = schedulePayload.data;
  expect(scheduled.status).toBe('draft');
  expect(String(scheduled.userId)).toBe(String(salesUser._id));

  const duplicateResponse = await api.post(`${API_BASE_URL}/activities/schedule`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    data: {
      clientId: client._id,
      activityTypeId: activityType._id,
      activityDate,
      userId: salesUser._id,
      notes: 'Agenda E2E duplicada',
    },
  });
  expect(duplicateResponse.status()).toBe(409);

  const salesCalendarPayload = await getJson(api, `${API_BASE_URL}/activities/calendar?from=${activityDate}&to=${activityDate}`, sales.token);
  const salesDraft = (salesCalendarPayload.data?.visits || []).find((visit) => String(visit._id) === String(scheduled._id));
  expect(salesDraft).toBeTruthy();
  expect(salesDraft.status).toBe('draft');

  const checkInPayload = await postJson(api, `${API_BASE_URL}/activities/checkin`, sales.token, {
    clientId: client._id,
    activityTypeId: activityType._id,
    activityDate,
    geo: sampleGeo(),
  }, 201);

  const inProgress = checkInPayload.data;
  expect(String(inProgress._id)).toBe(String(scheduled._id));
  expect(inProgress.status).toBe('in_progress');
  expect(inProgress.isDraft).toBeFalsy();
  expect(inProgress.checkIn?.at).toBeTruthy();

  const checkOutResponse = await api.post(`${API_BASE_URL}/activities/${inProgress._id}/checkout`, {
    headers: { Authorization: `Bearer ${sales.token}` },
    data: {
      productId: product._id,
      outcomeId: outcome._id,
      notes: 'Cierre de agenda E2E con visita completada',
      nextActionDate: null,
      nextActionNotes: null,
      durationMinutes: 15,
      geo: sampleGeo(),
    },
  });
  expect(checkOutResponse.ok()).toBeTruthy();

  const afterCalendarPayload = await getJson(api, `${API_BASE_URL}/activities/calendar?from=${activityDate}&to=${activityDate}`, sales.token);
  const completedVisit = (afterCalendarPayload.data?.visits || []).find((visit) => String(visit._id) === String(scheduled._id));
  expect(completedVisit).toBeTruthy();
  expect(completedVisit.status).toBe('completed');

  await api.dispose();
});
