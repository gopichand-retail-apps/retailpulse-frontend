import { z } from 'zod';
import { resolveApiBaseUrl } from '../config';
import { copy, nestedCopy } from './presentation';
import {
  activityListSchema,
  alertSchema,
  alertsSchema,
  dashboardSchema,
  productDetailSchema,
  productsSchema,
  contentModelSchema,
  storeDetailSchema,
  storesSchema,
  toPublicModel,
} from './api-schemas';
import type {
  ActivityEvent,
  AlertRule,
  DashboardData,
  ProductSummary,
  PublicModel,
  SalesFilters,
  StoreSummary,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, status: number, requestId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

const errorCopyByCode: Readonly<Record<string, string>> = {
  ORIGIN_NOT_ALLOWED: 'originNotAllowed',
  INVALID_RANGE: 'invalidRequest',
  INVALID_CATEGORY: 'invalidRequest',
  INVALID_SORT: 'invalidRequest',
  INVALID_ALERT: 'invalidRequest',
  IDEMPOTENCY_KEY_REQUIRED: 'invalidRequest',
  INVALID_JSON: 'invalidRequest',
  PAYLOAD_TOO_LARGE: 'invalidRequest',
  STORE_NOT_FOUND: 'notFound',
  PRODUCT_NOT_FOUND: 'notFound',
  ALERT_NOT_FOUND: 'notFound',
  NOT_FOUND: 'notFound',
  INTERNAL_ERROR: 'server',
};

function apiErrorCopy(model: PublicModel, code: string): string {
  return nestedCopy(model, 'errors', errorCopyByCode[code] ?? 'server');
}

function buildUrl(model: PublicModel, path: string, filters?: SalesFilters): URL {
  const url = new URL(`${model.app.apiBaseUrl}${path}`);
  if (filters) {
    url.searchParams.set('days', String(filters.days));
    if (filters.storeId) url.searchParams.set('storeId', filters.storeId);
    if (filters.category) url.searchParams.set('category', filters.category);
  }
  return url;
}

async function requestData<T extends z.ZodType>(
  model: PublicModel,
  path: string,
  schema: T,
  options: {
    filters?: SalesFilters;
    signal?: AbortSignal;
    method?: string;
    headers?: HeadersInit;
    body?: string;
  } = {},
): Promise<z.infer<T>> {
  const response = await fetch(buildUrl(model, path, options.filters), {
    method: options.method ?? 'GET',
    headers: options.headers,
    body: options.body,
    signal: options.signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(copy(model, 'apiRequestError'), response.status, response.headers.get('x-request-id'));
  }
  if (!response.ok) {
    const responseError = z.object({ error: z.object({ code: z.string().min(1) }) }).safeParse(payload);
    const errorCode = responseError.success ? responseError.data.error.code : 'UNKNOWN_API_ERROR';
    throw new ApiError(apiErrorCopy(model, errorCode), response.status, response.headers.get('x-request-id'));
  }
  const responseData = typeof payload === 'object' && payload !== null && 'data' in payload ? payload.data : undefined;
  const parsedData = schema.safeParse(responseData);
  if (!parsedData.success) {
    throw new ApiError(copy(model, 'apiRequestError'), response.status, response.headers.get('x-request-id'));
  }
  return parsedData.data;
}

export async function loadModel(signal?: AbortSignal): Promise<PublicModel> {
  const response = await fetch('/retailpulse-model.json', {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new ApiError('', response.status);
  const payload: unknown = await response.json();
  const parsed = contentModelSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError('', response.status);
  const apiBaseUrl = resolveApiBaseUrl(parsed.data.data.app.apiBaseUrl, import.meta.env.VITE_RETAILPULSE_API_BASE_URL);
  return toPublicModel(parsed.data, apiBaseUrl);
}

export function getHealth(model: PublicModel, signal?: AbortSignal) {
  const schema = z.object({
    status: z.string(),
    service: z.string(),
    storage: z.string(),
    application: z.string(),
  });
  return requestData(model, '/health', schema, { signal });
}

export function getDashboard(model: PublicModel, filters: SalesFilters, signal?: AbortSignal) {
  return requestData(model, '/dashboard', dashboardSchema, { filters, signal });
}

export function getStores(model: PublicModel, filters: SalesFilters, signal?: AbortSignal) {
  return requestData(model, '/stores', storesSchema, { filters, signal });
}

export function getStore(model: PublicModel, storeId: string, filters: SalesFilters, signal?: AbortSignal) {
  return requestData(model, `/stores/${encodeURIComponent(storeId)}`, storeDetailSchema, { filters, signal });
}

export function getProducts(
  model: PublicModel,
  filters: SalesFilters,
  options: { search?: string; sort?: string; signal?: AbortSignal } = {},
) {
  const url = buildUrl(model, '/products', filters);
  if (options.search) url.searchParams.set('search', options.search);
  if (options.sort) url.searchParams.set('sort', options.sort);
  const apiBasePath = new URL(model.app.apiBaseUrl).pathname;
  const requestPath = `${url.pathname.slice(apiBasePath.length)}${url.search}`;
  return requestData(model, requestPath, productsSchema, {
    signal: options.signal,
  });
}

export function getProduct(model: PublicModel, productId: string, filters: SalesFilters, signal?: AbortSignal) {
  return requestData(model, `/products/${encodeURIComponent(productId)}`, productDetailSchema, { filters, signal });
}

export function getAlerts(model: PublicModel, filters: SalesFilters, signal?: AbortSignal) {
  return requestData(model, '/alerts', alertsSchema, { filters, signal });
}

export function updateAlert(model: PublicModel, alertId: string, changes: { threshold: number; enabled: boolean }) {
  return requestData(model, `/alerts/${encodeURIComponent(alertId)}`, alertSchema, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
}

export function ingestSales(model: PublicModel) {
  return requestData(
    model,
    '/sales/ingest',
    z.object({
      batchNumber: z.number(),
      importedAt: z.string(),
      recordsAdded: z.number(),
      replayed: z.boolean(),
    }),
    { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } },
  );
}

export function getActivity(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, '/activity', activityListSchema, { signal });
}

export async function exportReport(model: PublicModel, filters: SalesFilters): Promise<Blob> {
  const response = await fetch(buildUrl(model, '/reports/export', filters));
  if (!response.ok) {
    throw new ApiError(copy(model, 'exportFailure'), response.status, response.headers.get('x-request-id'));
  }
  return response.blob();
}

export type { ActivityEvent, AlertRule, DashboardData, ProductSummary, StoreSummary };
