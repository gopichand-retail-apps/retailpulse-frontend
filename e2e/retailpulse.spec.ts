import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const appTitle = 'Sales overview';
const frontendPort = process.env.RETAILPULSE_FRONTEND_PORT ?? '5701';
const apiPort = process.env.RETAILPULSE_API_PORT ?? '5702';
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const expectedDataMode = process.env.VITE_IS_MOCK === 'false' ? 'live' : 'mock';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: appTitle, level: 1 })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-mode', expectedDataMode);
});

test('Flow 1: opens the analytics workspace with live report data', async ({ page }) => {
  await expect(page.locator('.metric-card')).toHaveCount(4);
  await expect(page.getByRole('img').first()).toBeVisible();
  await expect(page.getByText('Connected').first()).toBeVisible();
});

test('localhost frontend origin can load the API-backed workspace', async ({ page }) => {
  await page.goto(`http://localhost:${frontendPort}/`);
  await expect(page.getByRole('heading', { name: appTitle, level: 1 })).toBeVisible();
  await expect(page.getByText('Connected').first()).toBeVisible();
  const dashboardStatus = await page.evaluate(async (url: string) => {
    const response = await fetch(url);
    return response.status;
  }, `${apiBaseUrl}/dashboard?days=30`);

  expect(dashboardStatus).toBe(200);
});

test('Flow 2: applies reporting-period, store, and category filters', async ({ page }) => {
  const dashboardResponse = page.waitForResponse(
    (response) => response.url().includes('/api/v1/dashboard') && response.url().includes('days=7'),
  );
  await page.getByLabel('Reporting period').selectOption('7d');
  expect((await dashboardResponse).status()).toBe(200);

  const storeFilter = page.getByRole('combobox', {
    name: 'Store',
    exact: true,
  });
  await storeFilter.selectOption('store-harbor');
  await expect(storeFilter).toHaveValue('store-harbor');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('apparel');
  await expect(page.locator('.metric-card')).toHaveCount(4);
});

test('Flow 3: reviews revenue trends and prior-period comparisons', async ({ page }) => {
  await page.getByRole('button', { name: 'Revenue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revenue performance', level: 1 })).toBeVisible();
  await expect(page.getByText('Revenue trend')).toBeVisible();
  await expect(page.getByText('Leading store')).toBeVisible();
});

test('Flow 4: compares locations and opens a store detail', async ({ page }) => {
  await page.getByRole('button', { name: 'Stores', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'View store: Harbor & Pine' }).click();
  await expect(page.getByRole('heading', { name: 'Harbor & Pine', level: 2 })).toBeVisible();
  await expect(page.getByText('Sales per square foot')).toBeVisible();
});

test('Flow 5: searches, sorts, and opens a product detail', async ({ page }) => {
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search products' });
  await search.fill('BAG-104');
  await expect(page.getByRole('row', { name: /Everyday Canvas Tote/ })).toBeVisible();
  await page.getByRole('button', { name: 'View product: Everyday Canvas Tote' }).click();
  await expect(page.getByRole('heading', { name: 'Everyday Canvas Tote', level: 2 })).toBeVisible();
  await expect(page.getByText('Unit price')).toBeVisible();
});

test('Flow 6: saves an alert threshold through the API', async ({ page }) => {
  await page.getByRole('button', { name: 'Alerts', exact: true }).click();
  const threshold = page.getByRole('spinbutton', {
    name: 'Threshold: Revenue below prior period',
  });
  await threshold.fill('-18');
  await page.getByRole('button', { name: 'Save threshold: Revenue below prior period' }).click();
  await expect(page.getByText('Alert threshold saved.')).toBeVisible();
  await expect(threshold).toHaveValue('-18');
});

test('Flow 7: adds sales records and refreshes the report', async ({ page }) => {
  await page.getByRole('button', { name: 'Add latest sales' }).click();
  await expect(page.getByText('Sales data added and refreshed.')).toBeVisible();
  await expect(page.getByText('Sales records added').first()).toBeVisible();
});

test('Flow 8: exports filtered report data as CSV', async ({ page }) => {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  expect((await download).suggestedFilename()).toBe('retailpulse-performance-report.csv');
});

test('Flow 9: changes and restores the selected appearance', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'dark');
});

test('Flow 10: retries after an API failure and restores the workspace', async ({ page }) => {
  let failOnce = true;
  await page.route('**/api/v1/dashboard**', async (route) => {
    if (failOnce) {
      failOnce = false;
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Workspace content could not be loaded',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: appTitle, level: 1 })).toBeVisible();
  await expect(page.locator('.metric-card')).toHaveCount(4);
});

test('maps known API errors to model copy instead of backend messages', async ({ page }) => {
  const rawBackendMessage = 'Internal store database detail';
  await page.route('**/api/v1/dashboard**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'STORE_NOT_FOUND',
          message: rawBackendMessage,
          requestId: 'test-request',
        },
      }),
    });
  });
  await page.reload();
  await expect(page.getByText('The requested resource was not found.', { exact: true })).toBeVisible();
  await expect(page.getByText(rawBackendMessage, { exact: true })).toHaveCount(0);
});

test('uses generic model copy for unknown API error codes', async ({ page }) => {
  const rawBackendMessage = 'SQLite schema details';
  await page.route('**/api/v1/dashboard**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'NEW_BACKEND_CODE',
          message: rawBackendMessage,
          requestId: 'test-request',
        },
      }),
    });
  });
  await page.reload();
  await expect(
    page.getByText('The request could not be completed. Try again.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(rawBackendMessage, { exact: true })).toHaveCount(0);
});

test('keeps architecture documentation outside the product UI', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Architecture', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Application architecture' })).toHaveCount(0);

  const modelResponse = await page.request.get('/retailpulse-model.json');
  expect(modelResponse.ok()).toBe(true);
  const model = await modelResponse.json();
  expect(model).toMatchObject({ version: 1, appId: 'retailpulse' });
  expect(model).not.toHaveProperty('architecture');
  expect(model.data).not.toHaveProperty('architecture');
  expect(model.data.navigation).not.toContainEqual(expect.objectContaining({ id: 'architecture' }));

  const publicArchitecture = await page.request.get('/architecture.md');
  expect(await publicArchitecture.text()).not.toContain('# RetailPulse Architecture');
});

test('mobile navigation opens and selects a workspace view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Product performance', level: 1 })).toBeVisible();
});

test('RP-01: a connected demo source reports its freshness on screen and ahead of the exported sales', async ({
  page,
}) => {
  const banner = page.getByRole('status', { name: 'Sales source' });
  await expect(banner).toContainText('Up to date');
  await expect(banner).toContainText('Synthetic demo feed (demo profile)');
  await expect(banner).toContainText('30 of 30 days with sales');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const rows = (await readFile(await (await downloadPromise).path(), 'utf8')).split('\r\n');
  expect(rows[1]).toBe('"Source","Reporting state","Up to date","","","","",""');
  expect(rows[2]).toBe('"Source","Source status","Synthetic demo feed (demo profile)","","","","",""');
  expect(rows[3]).toMatch(/^"Source","Reporting cutoff","\d{4}-\d{2}-\d{2}T[\d:.]+Z","","","","",""$/);
  expect(rows[4]).toBe('"Source","Coverage","30 of 30 days with sales","","","","",""');
  expect(rows.some((row) => row.startsWith('"Store",'))).toBe(true);
});

test('RP-01: a connected source with no sales in the chosen scope shows an accurate zero', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Store', exact: true }).selectOption('store-harbor');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('beauty');

  await expect(page.getByRole('status', { name: 'Sales source' })).toContainText('Connected, no sales in this period');
  await expect(page.locator('.metric-card')).toHaveCount(4);
  await expect(page.locator('.metric-card').first()).toContainText('$0');
});

async function openProductsOnNarrowViewport(page: Page) {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Product performance', level: 1 })).toBeVisible();
  await expect(page.locator('.data-table tbody tr').first()).toBeVisible();
}

function documentFitsViewport(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test('RP-01 resize: a populated Products page stays inside the viewport from desktop down to 320 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.locator('.data-table tbody tr').first()).toBeVisible();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => documentFitsViewport(page), { message: `document fits at ${width}px` }).toBe(true);
  }
});

test('RP-01 resize: a fresh 320 px load of Products does not overflow the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openProductsOnNarrowViewport(page);
  await expect.poll(() => documentFitsViewport(page)).toBe(true);
});

test('RP-01 resize: the wide Products table sits in a labeled region that scrolls from the keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openProductsOnNarrowViewport(page);
  const region = page.getByRole('region', { name: 'Product performance table' });
  await expect(region).toBeVisible();
  await region.focus();
  await expect(region).toBeFocused();
  for (let press = 0; press < 4; press += 1) await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => documentFitsViewport(page)).toBe(true);
});
