const { test, expect, request } = require('@playwright/test');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3001/api';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@empresa.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || 'jefe@empresa.local';
const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const SALES_EMAIL = process.env.E2E_SALES_EMAIL || 'comercial1@empresa.local';
const SALES_PASSWORD = process.env.E2E_SALES_PASSWORD || process.env.E2E_DEFAULT_PASSWORD || 'Admin123!';
const RUN_UI = process.env.E2E_UI === '1';

async function loginViaApi(api, email, password) {
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login UI E2E fallido para ${email}. Status ${response.status()}. Respuesta: ${body}`);
  }
  const payload = await response.json();
  return payload.data;
}

async function listUsersViaApi(api, token) {
  const response = await api.get(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data || [];
}

async function getUserByEmail(api, token, email) {
  const users = await listUsersViaApi(api, token);
  return users.find((user) => user.email === email);
}

async function ensureGlobalSalesManager() {
  const api = await request.newContext();
  const admin = await loginViaApi(api, ADMIN_EMAIL, ADMIN_PASSWORD);

  const manager = await getUserByEmail(api, admin.token, MANAGER_EMAIL);
  const salesUser = await getUserByEmail(api, admin.token, SALES_EMAIL);
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

  const updateResponse = await api.put(`${API_BASE_URL}/users/${manager._id}`, {
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
  expect(updateResponse.ok()).toBeTruthy();
  await api.dispose();
}

async function loginViaUi(page, email, password) {
  // El entorno publicado no resuelve deep links SPA como /login; arrancamos desde /.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder('usuario@empresa.local').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function openAdminUsers(page) {
  await page.getByRole('button', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
}

function generateValidNif(seed = Date.now()) {
  const numbers = String(seed).slice(-8).padStart(8, '0');
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letter = letters[Number(numbers) % 23];
  return `${numbers}${letter}`;
}

test.describe('ui smoke', () => {
  test.skip(!RUN_UI, 'Activa E2E_UI=1 cuando el host tenga librerias de Chromium instaladas');

  test.beforeAll(async () => {
    await ensureGlobalSalesManager();
  });

  test('admin puede acceder a administracion de usuarios', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL(/activities\/today|\/$/);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

    await openAdminUsers(page);
    await expect(page.getByText('Importar usuarios por CSV')).toBeVisible();
  });

  test('admin puede editar un manager y previsualizar import CSV de usuarios', async ({ page }) => {
    const api = await request.newContext();
    const admin = await loginViaApi(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    const manager = await getUserByEmail(api, admin.token, MANAGER_EMAIL);
    expect(manager).toBeTruthy();

    const originalName = manager.name;
    const updatedName = originalName.endsWith(' UI') ? `${originalName} 2` : `${originalName} UI`;

    try {
      await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await openAdminUsers(page);

      const managerRow = page.getByTestId(`user-row-${manager._id}`);
      await expect(managerRow).toBeVisible();
      await page.getByTestId(`user-edit-${manager._id}`).click();
      await managerRow.getByRole('textbox').first().fill(updatedName);
      await page.getByTestId(`user-save-${manager._id}`).click();

      await expect(page.getByText('Usuario actualizado correctamente')).toBeVisible();
      await expect(page.getByTestId(`user-row-${manager._id}`)).toContainText(updatedName);

      const csvText = [
        'nombre,email,password,rol,zona,manager_email,ver_toda_la_red,activo',
        `Import Demo,import.demo.${Date.now()}@empresa.com,ClaveSegura123,sales,Norte,${MANAGER_EMAIL},no,si`,
      ].join('\n');

      await page.getByTestId('users-import-textarea').fill(csvText);
      await page.getByTestId('users-import-preview').click();

      await expect(page.getByText('Vista previa generada')).toBeVisible();
      await expect(page.getByTestId('users-import-total')).toContainText('Total: 1');
      await expect(page.getByTestId('users-import-valid')).toContainText('Válidas: 1');
      await expect(page.getByTestId('users-import-invalid')).toContainText('Inválidas: 0');
      await expect(page.getByRole('cell', { name: 'Import Demo' })).toBeVisible();
    } finally {
      const refreshed = await getUserByEmail(api, admin.token, MANAGER_EMAIL);
      if (refreshed && refreshed.name !== originalName) {
        await api.put(`${API_BASE_URL}/users/${refreshed._id}`, {
          headers: { Authorization: `Bearer ${admin.token}` },
          data: {
            name: originalName,
            role: refreshed.role,
            zoneId: refreshed.zoneId?._id || '',
            managerUserId: refreshed.managerUserId?._id || '',
            canViewAllSales: Boolean(refreshed.canViewAllSales),
            isActive: Boolean(refreshed.isActive),
          },
        });
      }
      await api.dispose();
    }
  });

  test('manager global puede entrar al dashboard pero no a admin', async ({ page }) => {
    await loginViaUi(page, MANAGER_EMAIL, MANAGER_PASSWORD);

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard de cumplimiento' })).toBeVisible();

    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/activities\/today|\/$/);
  });

  test('manager puede usar la nueva agenda operativa', async ({ page }) => {
    await loginViaUi(page, MANAGER_EMAIL, MANAGER_PASSWORD);

    await page.getByRole('link', { name: 'Agenda' }).click();
    await expect(page).toHaveURL(/\/activities\/agenda/);
    await expect(page.getByRole('heading', { name: 'Agenda de visitas' })).toBeVisible();
    await expect(page.getByText('Planifica, detecta seguimientos críticos y actúa sobre la agenda operativa del equipo.')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Nueva visita' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible();
    await expect(page.getByText('Acciones y alertas')).toBeVisible();
    await expect(page.getByText('Visitas planificadas')).toBeVisible();

    await page.getByRole('button', { name: 'Nueva visita' }).click();
    await expect(page.getByText('Agendar futura visita')).toBeVisible();
    await expect(page.getByText('Asignar visita a *')).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar nueva visita' }).click();
    await expect(page.getByText('Agendar futura visita')).toHaveCount(0);
  });

  test('admin puede crear un cliente inline desde registro rapido y queda seleccionado', async ({ page }) => {
    const stamp = Date.now();
    const clientName = `Cliente E2E Inline ${stamp}`;
    const taxId = generateValidNif(stamp);

    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.getByRole('link', { name: 'Registro rápido' }).click();
    await expect(page).toHaveURL(/\/activities\/quick/);
    await expect(page.getByRole('heading', { name: 'Registro rápido de actividad' })).toBeVisible();

    const clientInput = page.getByTestId('client-autocomplete-input').first();
    await clientInput.fill(clientName);
    await expect(page.getByTestId('client-autocomplete-create')).toBeVisible();
    await page.getByTestId('client-autocomplete-create').click();

    const modal = page.getByTestId('quick-client-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('quick-client-legal-name').fill(clientName);
    await modal.getByTestId('quick-client-tax-id').fill(taxId);
    await modal.getByTestId('quick-client-province').fill('Navarra');
    await modal.getByTestId('quick-client-city').fill('Pamplona');
    await modal.getByTestId('quick-client-zone').selectOption({ index: 1 });
    await modal.getByTestId('quick-client-segment').selectOption({ index: 1 });
    await modal.getByTestId('quick-client-phone').fill('600123123');
    await modal.getByTestId('quick-client-email').fill(`cliente.e2e.${stamp}@empresa.com`);
    await modal.getByTestId('quick-client-notes').fill('Cliente creado desde el flujo inline de registro rapido.');
    await modal.getByTestId('quick-client-submit').click();

    await expect(modal).toHaveCount(0);
    await expect(clientInput).toHaveValue(clientName);
  });

  test('sales no puede acceder al dashboard', async ({ page }) => {
    await loginViaUi(page, SALES_EMAIL, SALES_PASSWORD);

    await page.getByRole('link', { name: 'Mis actividades' }).click();
    await expect(page).toHaveURL(/\/activities\/my/);
    await expect(page.getByRole('heading', { name: 'Mis actividades' })).toBeVisible();
    await expect(page.getByText('Aquí ves únicamente los registros que has creado tú')).toBeVisible();

    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
