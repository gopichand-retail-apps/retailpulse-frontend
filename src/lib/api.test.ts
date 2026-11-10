import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  exportReport,
  getActivity,
  getAlerts,
  getDashboard,
  getHealth,
  getProduct,
  getProducts,
  getStore,
  getStores,
  ingestSales,
  loadModel,
  updateAlert,
} from './api';
import { nestedCopy } from './presentation';
import { activity, alert, dashboard, contentModel, model, product, store, storeDetail } from '../test/fixtures';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data, requestId: 'api-test-request' }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'api-test-request',
    },
  });
}

function modelResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(code: string, status = 400, body = { code, message: 'private backend detail' }): Response {
  return new Response(JSON.stringify({ error: body }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'api-error-request',
    },
  });
}

describe('RetailPulse API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads the public model without caching and rejects bad models', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(modelResponse(contentModel))
      .mockResolvedValueOnce(modelResponse({ ...contentModel, architecture: { current: {} } }))
      .mockResolvedValueOnce(new Response('offline', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadModel()).resolves.toMatchObject({
      app: { name: 'RetailPulse' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/retailpulse-model.json', { cache: 'no-store', signal: undefined });
    await expect(loadModel()).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
    await expect(loadModel()).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
  });

  it('uses typed API routes, filters, and action request methods', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/health')) {
        return jsonResponse({
          status: 'ok',
          service: 'retailpulse-api',
          storage: 'sqlite',
          application: 'RetailPulse',
        });
      }
      if (path.endsWith('/dashboard')) return jsonResponse(dashboard);
      if (path.endsWith('/stores')) return jsonResponse([store]);
      if (path.includes('/stores/')) return jsonResponse(storeDetail);
      if (path.endsWith('/products')) return jsonResponse([product]);
      if (path.includes('/products/')) return jsonResponse(product);
      if (path.endsWith('/alerts')) return jsonResponse([alert]);
      if (path.includes('/alerts/')) return jsonResponse(alert);
      if (path.endsWith('/sales/ingest')) {
        return jsonResponse({
          batchNumber: 3,
          importedAt: '2026-11-01T12:30:00.000Z',
          recordsAdded: 12,
          replayed: false,
        });
      }
      if (path.endsWith('/activity')) return jsonResponse(activity);
      if (path.endsWith('/reports/export')) {
        return new Response('report,csv', { status: 200 });
      }
      return errorResponse('NOT_FOUND', 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const filters = { days: 7, storeId: store.id, category: product.category };
    const signal = new AbortController().signal;
    await expect(getHealth(model, signal)).resolves.toMatchObject({ status: 'ok' });
    await expect(getDashboard(model, filters, signal)).resolves.toEqual(dashboard);
    await expect(getStores(model, filters, signal)).resolves.toEqual([store]);
    await expect(getStore(model, 'store/harbor', filters, signal)).resolves.toEqual(storeDetail);
    await expect(getProducts(model, filters, { search: 'tote', sort: 'name', signal })).resolves.toEqual([product]);
    await expect(getProduct(model, product.id, filters, signal)).resolves.toEqual(product);
    await expect(getAlerts(model, filters, signal)).resolves.toEqual([alert]);
    await expect(updateAlert(model, alert.id, { threshold: -20, enabled: false })).resolves.toEqual(alert);
    await expect(ingestSales(model)).resolves.toMatchObject({
      recordsAdded: 12,
      replayed: false,
    });
    await expect(getActivity(model, signal)).resolves.toEqual(activity);
    await expect(exportReport(model, filters)).resolves.toMatchObject({
      size: 10,
    });

    const requests = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(requests[1]?.searchParams.get('days')).toBe('7');
    expect(requests[1]?.searchParams.get('storeId')).toBe(store.id);
    expect(requests[1]?.searchParams.get('category')).toBe(product.category);
    expect(requests[3]?.pathname).toContain('store%2Fharbor');
    expect(requests[4]?.searchParams.get('search')).toBe('tote');
    expect(requests[4]?.searchParams.get('sort')).toBe('name');
    expect(fetchMock.mock.calls[7]?.[1]).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: -20, enabled: false }),
    });
    expect(fetchMock.mock.calls[8]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Idempotency-Key': expect.any(String) },
    });
  });

  it('maps known and unknown backend errors without leaking raw messages', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(errorResponse('STORE_NOT_FOUND', 404))
      .mockResolvedValueOnce(errorResponse('UNRECOGNIZED', 500))
      .mockResolvedValueOnce(new Response('not-json', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ invalid: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getStores(model, { days: 30 })).rejects.toMatchObject({
      name: 'ApiError',
      message: nestedCopy(model, 'errors', 'notFound'),
      status: 404,
      requestId: 'api-error-request',
    });
    await expect(getStores(model, { days: 30 })).rejects.toMatchObject({
      message: nestedCopy(model, 'errors', 'server'),
      status: 500,
    });
    await expect(getStores(model, { days: 30 })).rejects.toMatchObject({
      message: model.copy.apiRequestError,
      status: 502,
    });
    await expect(getStores(model, { days: 30 })).rejects.toBeInstanceOf(ApiError);
  });

  it('uses safe export failure copy and preserves the request ID', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'database detail' }), {
        status: 500,
        headers: { 'X-Request-ID': 'export-request' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(exportReport(model, { days: 30 })).rejects.toMatchObject({
      message: model.copy.exportFailure,
      status: 500,
      requestId: 'export-request',
    });
  });
});
