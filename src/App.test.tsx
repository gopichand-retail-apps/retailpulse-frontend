import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from './App';
import { copy, nestedCopy, sourceCutoffText } from './lib/presentation';
import type { DashboardData } from './lib/types';
import {
  activity,
  alert,
  awaitingSource,
  contentModel,
  dashboard,
  model,
  product,
  staleSource,
  store,
  storeDetail,
} from './test/fixtures';

type IngestOutcome = 'network' | 'server' | 'disabled' | 'unreadable' | 'ok';

interface ApiBehavior {
  model?: typeof contentModel;
  dashboard?: DashboardData;
  ingestOutcomes?: IngestOutcome[];
  failDashboardOnce?: boolean;
  failProductListOnce?: boolean;
  failStoreDetail?: boolean;
  failProductDetail?: boolean;
  failAlertSave?: boolean;
  failIngest?: boolean;
  failExport?: boolean;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data, requestId: 'app-test-request' }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'app-test-request',
    },
  });
}

function errorResponse(code = 'INTERNAL_ERROR', status = 500): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message: 'private database details',
        requestId: 'app-test-error',
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'app-test-error',
      },
    },
  );
}

function firstButton(name: string): HTMLElement {
  const button = screen.getAllByRole('button', { name })[0];
  if (!button) throw new Error(`Expected button: ${name}`);
  return button;
}

interface MockRequestState {
  dashboardRequests: number;
  productListRequests: number;
}

interface MockRequestContext {
  url: URL;
  behavior: ApiBehavior;
  state: MockRequestState;
}

const mockApiRoutes: Array<{
  method: string;
  matches: (url: URL) => boolean;
  respond: (context: MockRequestContext) => Response;
}> = [
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/health'),
    respond: () =>
      jsonResponse({
        status: 'ok',
        service: 'retailpulse-api',
        storage: 'sqlite',
        application: 'RetailPulse',
      }),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/dashboard'),
    respond: ({ behavior, state }) => {
      state.dashboardRequests += 1;
      return behavior.failDashboardOnce && state.dashboardRequests === 1
        ? errorResponse()
        : jsonResponse(behavior.dashboard ?? dashboard);
    },
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/stores'),
    respond: () => jsonResponse([store]),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.includes('/stores/'),
    respond: ({ behavior }) =>
      behavior.failStoreDetail ? errorResponse('STORE_NOT_FOUND', 404) : jsonResponse(storeDetail),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/products'),
    respond: ({ behavior, state }) => {
      state.productListRequests += 1;
      return behavior.failProductListOnce && state.productListRequests === 1
        ? errorResponse()
        : jsonResponse([product]);
    },
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.includes('/products/'),
    respond: ({ behavior }) =>
      behavior.failProductDetail ? errorResponse('PRODUCT_NOT_FOUND', 404) : jsonResponse(product),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/alerts'),
    respond: () => jsonResponse([alert]),
  },
  {
    method: 'PATCH',
    matches: (url) => url.pathname.includes('/alerts/'),
    respond: ({ behavior }) =>
      behavior.failAlertSave ? errorResponse() : jsonResponse({ ...alert, threshold: -20, enabled: false }),
  },
  {
    method: 'POST',
    matches: (url) => url.pathname.endsWith('/sales/ingest'),
    respond: ({ behavior }) =>
      behavior.failIngest
        ? errorResponse()
        : jsonResponse({
            batchNumber: 1,
            importedAt: '2026-11-01T12:30:00.000Z',
            recordsAdded: 12,
            replayed: false,
          }),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/activity'),
    respond: () => jsonResponse(activity),
  },
  {
    method: 'GET',
    matches: (url) => url.pathname.endsWith('/reports/export'),
    respond: ({ behavior }) => (behavior.failExport ? errorResponse() : new Response('report,csv', { status: 200 })),
  },
];

function scriptedIngest(outcome: IngestOutcome | undefined): Response {
  if (outcome === 'network') throw new TypeError('Failed to fetch');
  if (outcome === 'server') return errorResponse();
  if (outcome === 'disabled') return errorResponse('SAMPLE_SALES_DISABLED', 409);
  if (outcome === 'unreadable') return jsonResponse({ unexpected: true });
  return jsonResponse({ batchNumber: 1, importedAt: '2026-11-01T12:30:00.000Z', recordsAdded: 12, replayed: false });
}

function ingestAttempts(fetchMock: ReturnType<typeof createApiFetch>): Headers[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([, init]) => new Headers(init?.headers));
}

function createApiFetch(behavior: ApiBehavior = {}) {
  const state = { dashboardRequests: 0, productListRequests: 0 };
  return vi.fn<typeof fetch>(async (input, init) => {
    const requestUrl = String(input);
    if (requestUrl === '/retailpulse-model.json') {
      return new Response(JSON.stringify(behavior.model ?? contentModel), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(requestUrl);
    const method = init?.method ?? 'GET';
    if (method === 'POST' && behavior.ingestOutcomes) return scriptedIngest(behavior.ingestOutcomes.shift());
    const route = mockApiRoutes.find((candidate) => candidate.method === method && candidate.matches(url));
    return route ? route.respond({ url, behavior, state }) : errorResponse('NOT_FOUND', 404);
  });
}

function installDownloadStubs(): () => void {
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:retailpulse-test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  return () => {
    if (createDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (revokeDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  };
}

describe('RetailPulse workspace', () => {
  // The views are lazy chunks. A cold transform under coverage can exceed the 1 s `findBy` wait, which made
  // "loads metadata..." fail when run alone (reproduced 6/6 on the baseline code). Loading them up front keeps
  // module-transform time out of the timed assertions; no timeout is raised.
  beforeAll(async () => {
    await Promise.all([
      import('./components/OverviewView'),
      import('./components/ProductsView'),
      import('./components/SettingsView'),
      import('./components/StoresView'),
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('shows offline status and reloads read-only data after reconnection', async () => {
    const fetchMock = createApiFetch();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });
    const dashboardRequestsBefore = fetchMock.mock.calls.filter(([input]) =>
      new URL(String(input), 'http://127.0.0.1').pathname.endsWith('/dashboard'),
    ).length;

    window.dispatchEvent(new Event('offline'));
    expect(await screen.findByText(copy(model, 'offlineNotice'))).toBeVisible();

    window.dispatchEvent(new Event('online'));
    await waitFor(() => {
      const dashboardRequestsAfter = fetchMock.mock.calls.filter(([input]) =>
        new URL(String(input), 'http://127.0.0.1').pathname.endsWith('/dashboard'),
      ).length;
      expect(dashboardRequestsAfter).toBe(dashboardRequestsBefore + 1);
    });
    expect(screen.queryByText(copy(model, 'offlineNotice'))).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST' || init?.method === 'PATCH')).toBe(false);
  });

  it('loads metadata and moves between filtered reports and details', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.setItem(model.theme.storageKey, 'dark');
    render(<App />);

    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });
    // Store filter options now come from the API (D-16); wait for the store option it returns.
    await screen.findByRole('option', { name: 'Harbor & Pine' });
    expect(document.title).toBe('RetailPulse | Retail intelligence');
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(model.app.description);
    const appShell = screen.getByRole('main').closest<HTMLElement>('.app-shell');
    expect(appShell).not.toBeNull();
    expect(appShell).toHaveAttribute('data-theme', 'dark');

    const mobileNavigationToggle = document.querySelector<HTMLButtonElement>('.mobile-navigation-toggle');
    if (!mobileNavigationToggle) {
      throw new Error('Expected the mobile navigation control.');
    }
    fireEvent.click(mobileNavigationToggle);
    const navigationScrim = document.querySelector<HTMLButtonElement>('.navigation-scrim');
    if (!navigationScrim) throw new Error('Expected navigation to open.');
    fireEvent.click(navigationScrim);

    await user.click(
      await screen.findByRole('button', {
        name: 'View store: Harbor & Pine',
      }),
    );
    await screen.findByRole('heading', { name: 'Harbor & Pine', level: 2 });
    await user.click(firstButton('Back to overview'));
    await user.click(screen.getByRole('button', { name: 'Overview' }));
    const viewAllStores = screen.getAllByRole('button', {
      name: 'View all stores',
    })[0];
    if (!viewAllStores) throw new Error('Expected the store-list action.');
    await user.click(viewAllStores);
    await screen.findByRole('heading', { name: 'Store performance', level: 1 });
    await user.click(screen.getByRole('button', { name: 'Overview' }));

    await user.click(
      await screen.findByRole('button', {
        name: 'View product: Everyday Canvas Tote',
      }),
    );
    await screen.findByRole('heading', {
      name: 'Everyday Canvas Tote',
      level: 2,
    });
    await user.click(firstButton('Back to overview'));
    await user.click(screen.getByRole('button', { name: 'Overview' }));
    await user.click(screen.getByRole('button', { name: 'View all products' }));
    await screen.findByRole('heading', { name: 'Product performance', level: 1 });
    await user.click(screen.getByRole('button', { name: 'Overview' }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Reporting period' }), '7d');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Store' }), store.id);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'apparel');
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = new URL(String(input), 'http://127.0.0.1');
          return url.pathname.endsWith('/dashboard') && url.searchParams.get('days') === '7';
        }),
      ).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: 'Revenue' }));
    await screen.findByRole('heading', { name: 'Revenue performance', level: 1 });
    await user.click(
      screen.getByRole('button', {
        name: copy(model, 'refresh'),
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Stores' }));
    await user.click(
      await screen.findByRole('button', {
        name: 'View store: Harbor & Pine',
      }),
    );
    await screen.findByRole('heading', { name: 'Harbor & Pine', level: 2 });
    await user.click(firstButton('Back to overview'));

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(await screen.findByRole('searchbox', { name: 'Search products' }), 'BAG-104');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort products' }), 'name');
    await user.click(
      await screen.findByRole('button', {
        name: 'View product: Everyday Canvas Tote',
      }),
    );
    await screen.findByRole('heading', {
      name: 'Everyday Canvas Tote',
      level: 2,
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('applies replacement model copy and locale to the workspace metadata', async () => {
    const localizedModel = structuredClone(contentModel);
    localizedModel.locale = 'fr-FR';
    localizedModel.data.app.descriptor = 'Intelligence commerciale';
    localizedModel.data.app.description = 'Suivi des performances par magasin.';
    localizedModel.messages.overviewTitle = 'Vue des ventes';
    vi.stubGlobal('fetch', createApiFetch({ model: localizedModel }));
    render(<App />);

    await screen.findByRole('heading', { name: 'Vue des ventes', level: 1 });
    expect(document.title).toBe('RetailPulse | Intelligence commerciale');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      'Suivi des performances par magasin.',
    );
  });

  it('saves alerts, ingests records, exports, and persists the theme', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch();
    vi.stubGlobal('fetch', fetchMock);
    const restoreDownloadStubs = installDownloadStubs();
    render(<App />);

    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });
    await user.click(screen.getByRole('button', { name: /^Alerts/ }));
    await user.clear(
      screen.getByRole('spinbutton', {
        name: 'Threshold: Revenue below prior period',
      }),
    );
    await user.type(
      screen.getByRole('spinbutton', {
        name: 'Threshold: Revenue below prior period',
      }),
      '-20',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(
      screen.getByRole('button', {
        name: 'Save threshold: Revenue below prior period',
      }),
    );
    expect(await screen.findByText('Alert threshold saved.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Add latest sales' }));
    expect(await screen.findByText('Sales data added and refreshed.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Export report' }));
    expect(await screen.findByText('The report is ready.')).toBeVisible();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Light mode' }));
    expect(screen.getByRole('main').closest('.app-shell')).toHaveAttribute('data-theme', 'light');
    await user.click(await screen.findByRole('button', { name: 'Dark mode' }));
    const appShell = screen.getByRole('main').closest<HTMLElement>('.app-shell');
    expect(appShell).not.toBeNull();
    expect(appShell).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(model.theme.storageKey)).toBe('dark');
    restoreDownloadStubs();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true);
  });

  it('shows safe retry and detail errors while retaining the last report', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch({
      failDashboardOnce: true,
      failStoreDetail: true,
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: copy(model, 'contentError'),
      }),
    ).toBeVisible();
    expect(screen.queryByText('private database details')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });

    await user.click(screen.getByRole('button', { name: 'Stores' }));
    await user.click(
      await screen.findByRole('button', {
        name: 'View store: Harbor & Pine',
      }),
    );
    expect(await screen.findByText(nestedCopy(model, 'errors', 'notFound'))).toBeVisible();
  });

  it('maps product list and detail errors to safe messages', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      createApiFetch({
        failProductListOnce: true,
        failProductDetail: true,
      }),
    );
    render(<App />);

    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });
    await user.click(screen.getByRole('button', { name: 'Products' }));
    expect(await screen.findByText(nestedCopy(model, 'errors', 'server'))).toBeVisible();
    await user.type(await screen.findByRole('searchbox', { name: 'Search products' }), 'BAG-104');
    await user.click(
      await screen.findByRole('button', {
        name: 'View product: Everyday Canvas Tote',
      }),
    );
    expect(await screen.findByText(nestedCopy(model, 'errors', 'notFound'))).toBeVisible();
    expect(screen.queryByText('private database details')).toBeNull();
  });

  it('reports failed actions and failed model bootstrap', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      createApiFetch({
        failAlertSave: true,
        failIngest: true,
        failExport: true,
      }),
    );
    const app = render(<App />);

    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });
    await user.click(screen.getByRole('button', { name: /^Alerts/ }));
    await user.click(
      screen.getByRole('button', {
        name: 'Save threshold: Revenue below prior period',
      }),
    );
    expect(await screen.findByText(nestedCopy(model, 'errors', 'server'))).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Add latest sales' }));
    // A 5xx leaves the write's outcome unknown, so it awaits confirmation instead of reporting failure.
    expect(await screen.findByText(copy(model, 'ingestAwaiting'))).toBeVisible();
    expect(screen.getByRole('button', { name: copy(model, 'ingestRetry') })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Export report' }));
    expect(await screen.findByText(copy(model, 'exportFailure'))).toBeVisible();

    app.unmount();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network detail')));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('CONTENT_MODEL_UNAVAILABLE');
  });

  it('shows the awaiting-first-sale state instead of zero figures on an empty install', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createApiFetch({ dashboard: { ...dashboard, source: awaitingSource } }));
    render(<App />);

    const banner = await screen.findByRole('status', { name: copy(model, 'sourceTitle') });
    expect(within(banner).getByText(nestedCopy(model, 'sourceStates', 'awaiting_first_sale'))).toBeVisible();
    expect(screen.getByRole('heading', { name: copy(model, 'awaitingPanelTitle') })).toBeVisible();
    expect(document.querySelectorAll('.metric-card')).toHaveLength(0);
    expect(screen.queryByText('$1.3K')).toBeNull();
    expect(screen.getByRole('button', { name: copy(model, 'ingest') })).toBeDisabled();

    for (const view of ['Revenue', 'Stores']) {
      await user.click(screen.getByRole('button', { name: view }));
      expect(await screen.findByRole('heading', { name: copy(model, 'awaitingPanelTitle') })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: 'Products' }));
    const row = await screen.findByRole('row', { name: /Everyday Canvas Tote/ });
    expect(within(row).getAllByText(copy(model, 'notAvailable'))).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /^Alerts/ }));
    expect(await screen.findByText(copy(model, 'awaitingStatus'))).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Overview' }));
    await user.click(await screen.findByRole('button', { name: copy(model, 'awaitingPanelAction') }));
    expect(await screen.findByRole('heading', { name: copy(model, 'sourceTitle'), level: 2 })).toBeVisible();
    expect(screen.getByText(copy(model, 'externalFeedStatus'))).toBeVisible();
  });

  it('keeps figures visible for a stale source and labels its cutoff and coverage', async () => {
    vi.stubGlobal('fetch', createApiFetch({ dashboard: { ...dashboard, source: staleSource } }));
    render(<App />);

    const banner = await screen.findByRole('status', { name: copy(model, 'sourceTitle') });
    expect(within(banner).getByText(nestedCopy(model, 'sourceStates', 'stale'))).toBeVisible();
    expect(within(banner).getByText(sourceCutoffText(model, staleSource.cutoffAt))).toBeVisible();
    expect(within(banner).getByText('24 of 30 days with sales')).toBeVisible();
    expect(document.querySelectorAll('.metric-card')).toHaveLength(4);
  });

  it('keeps one idempotency key across lost replies and starts a new one after a confirmed result', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch({ ingestOutcomes: ['network', 'server', 'ok', 'ok'] });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });

    await user.click(screen.getByRole('button', { name: copy(model, 'ingest') }));
    expect(await screen.findByText(copy(model, 'ingestAwaiting'))).toBeVisible();
    expect(screen.queryByText(copy(model, 'ingestSuccess'))).toBeNull();
    await user.click(screen.getByRole('button', { name: copy(model, 'ingestRetry') }));
    await waitFor(() => expect(ingestAttempts(fetchMock)).toHaveLength(2));
    expect(await screen.findByText(copy(model, 'ingestAwaiting'))).toBeVisible();

    await user.click(await screen.findByRole('button', { name: copy(model, 'ingestRetry') }));
    expect(await screen.findByText(copy(model, 'ingestSuccess'))).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy(model, 'ingest') }));
    await waitFor(() => expect(ingestAttempts(fetchMock)).toHaveLength(4));

    const keys = ingestAttempts(fetchMock).map((headers) => headers.get('Idempotency-Key'));
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toBe(keys[0]);
    expect(keys[3]).not.toBe(keys[0]);
    const requestIds = ingestAttempts(fetchMock).map((headers) => headers.get('X-Request-ID'));
    expect(new Set(requestIds).size).toBe(4);
  });

  it('treats an unreadable success reply as unconfirmed and retries with the same key', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch({ ingestOutcomes: ['unreadable', 'ok'] });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });

    await user.click(screen.getByRole('button', { name: copy(model, 'ingest') }));
    expect(await screen.findByText(copy(model, 'ingestAwaiting'))).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy(model, 'ingestRetry') }));
    expect(await screen.findByText(copy(model, 'ingestSuccess'))).toBeVisible();

    const keys = ingestAttempts(fetchMock).map((headers) => headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('discards the key after a definitive refusal so the next intent starts fresh', async () => {
    const user = userEvent.setup();
    const fetchMock = createApiFetch({ ingestOutcomes: ['disabled', 'ok'] });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Sales overview', level: 1 });

    await user.click(screen.getByRole('button', { name: copy(model, 'ingest') }));
    expect(await screen.findByText(nestedCopy(model, 'errors', 'sampleSalesDisabled'))).toBeVisible();
    expect(screen.queryByText(copy(model, 'ingestAwaiting'))).toBeNull();
    await user.click(screen.getByRole('button', { name: copy(model, 'ingest') }));
    expect(await screen.findByText(copy(model, 'ingestSuccess'))).toBeVisible();

    const keys = ingestAttempts(fetchMock).map((headers) => headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('lists store filter options from the API rather than bundled model data', async () => {
    vi.stubGlobal('fetch', createApiFetch());
    render(<App />);

    const storeFilter = await screen.findByRole('combobox', { name: 'Store' });
    await waitFor(() =>
      expect(
        within(storeFilter)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual([copy(model, 'allStores'), store.name]),
    );
    expect(model.seed.stores.length).toBeGreaterThan(1);
  });
});
