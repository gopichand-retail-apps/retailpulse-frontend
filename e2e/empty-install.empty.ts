import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Runs only through playwright.empty.config.ts, against an API started with the default (empty) profile.
const apiPort = process.env.RETAILPULSE_API_PORT ?? '5702';
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const expectedDataMode = process.env.VITE_IS_MOCK === 'false' ? 'live' : 'mock';

const sourceRow = (name: string, value: string) => `"Source","${name}","${value}","","","","",""`;

function documentFitsViewport(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sales overview', level: 1 })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-mode', expectedDataMode);
});

test('RP-01 empty install: the overview awaits its first sale instead of showing zeros', async ({ page }) => {
  const banner = page.getByRole('status', { name: 'Sales source' });

  await expect(banner).toContainText('Awaiting first sale');
  await expect(banner).toContainText('No sales source connected');
  await expect(banner).toContainText('No sale committed yet');
  await expect(banner).toContainText('0 of 30 days with sales');
  await expect(page.getByRole('heading', { name: 'Figures appear after the first sale' })).toBeVisible();
  await expect(page.locator('.metric-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add latest sales' })).toBeDisabled();
});

test('RP-01 empty install: products show no invented sales or stock figures', async ({ page }) => {
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const row = page.getByRole('row', { name: /Everyday Canvas Tote/ });

  await expect(row).toBeVisible();
  await expect(row.getByText('Not available')).toHaveCount(4);
});

test('RP-01 empty install: the export carries the source state and no zero-filled sales rows', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const csv = await readFile(await (await downloadPromise).path(), 'utf8');

  expect(csv.split('\r\n')).toEqual([
    '"Record type","Name","Category","SKU","Net sales","Transactions","Units sold","Gross margin"',
    sourceRow('Reporting state', 'Awaiting first sale'),
    sourceRow('Source status', 'No sales source connected'),
    sourceRow('Reporting cutoff', 'No sale committed yet'),
    sourceRow('Coverage', '0 of 30 days with sales'),
  ]);
});

test('RP-01 empty install: the API refuses to invent sample sales', async ({ request }) => {
  const response = await request.post(`${apiBaseUrl}/sales/ingest`, {
    headers: { 'Idempotency-Key': 'e2e-empty-install-0001' },
  });

  expect(response.status()).toBe(409);
  expect((await response.json()).error.code).toBe('SAMPLE_SALES_DISABLED');
});

test('RP-01 empty install: at 320 px the awaiting state fits and its action works from the keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(() => documentFitsViewport(page)).toBe(true);

  const action = page.getByRole('button', { name: 'Review the sales source' });
  await action.focus();
  await expect(action).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Sales source', level: 2 })).toBeVisible();
  await expect(page.getByText('Disabled: no producer is available yet')).toBeVisible();
  await expect.poll(() => documentFitsViewport(page)).toBe(true);
});
