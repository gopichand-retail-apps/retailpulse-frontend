import contentModelJson from '../../public/retailpulse-model.json';
import { contentModelSchema, toPublicModel } from '../lib/api-schemas';
import type {
  ActivityEvent,
  AlertRule,
  DashboardData,
  MetricSummary,
  ProductSummary,
  PublicModel,
  StoreDetail,
  StoreSummary,
} from '../lib/types';

const modelJson: unknown = contentModelJson;

export const contentModel = contentModelSchema.parse(modelJson);
export const model: PublicModel = toPublicModel(contentModel);

export const metrics: MetricSummary = {
  revenueCents: 125000,
  transactions: 25,
  unitsSold: 42,
  averageBasketCents: 5000,
  grossMarginCents: 45000,
  grossMarginPct: 36,
  revenueChangePct: 12.5,
  transactionsChangePct: 4,
  unitsChangePct: 8,
  averageBasketChangePct: 2,
};

export const store: StoreSummary = {
  id: 'store-harbor',
  name: 'Harbor & Pine',
  city: 'Portland',
  region: 'Pacific Northwest',
  format: 'Flagship',
  squareFeet: 5400,
  ...metrics,
};

export const secondStore: StoreSummary = {
  id: 'store-market',
  name: 'Market Row',
  city: 'Seattle',
  region: 'Pacific Northwest',
  format: 'Neighborhood',
  squareFeet: 3200,
  ...metrics,
  revenueCents: 90000,
  revenueChangePct: -4,
};

export const product: ProductSummary = {
  id: 'product-tote',
  sku: 'BAG-104',
  name: 'Everyday Canvas Tote',
  category: 'apparel',
  unitPriceCents: 4800,
  unitCostCents: 2000,
  stockOnHand: 18,
  displayOrder: 1,
  ...metrics,
};

export const secondProduct: ProductSummary = {
  id: 'product-lamp',
  sku: 'HOME-220',
  name: 'Arc Table Lamp',
  category: 'home',
  unitPriceCents: 7200,
  unitCostCents: 3100,
  stockOnHand: 7,
  displayOrder: 2,
  ...metrics,
  revenueCents: 45000,
  revenueChangePct: -2,
};

export const series = [
  {
    date: '2026-10-31',
    revenueCents: 60000,
    previousRevenueCents: 52000,
    transactions: 12,
  },
  {
    date: '2026-11-01',
    revenueCents: 65000,
    previousRevenueCents: 58000,
    transactions: 13,
  },
];

export const categories = [
  { id: 'apparel', revenueCents: 80000, unitsSold: 26 },
  { id: 'home', revenueCents: 45000, unitsSold: 16 },
];

export const storeDetail: StoreDetail = {
  ...store,
  series,
  categories,
};

export const dashboard: DashboardData = {
  period: { days: 30, from: '2026-10-03', to: '2026-11-01' },
  metrics,
  series,
  stores: [store, secondStore],
  products: [product, secondProduct],
  categories,
};

export const alert: AlertRule = {
  id: 'alert-revenue-drop',
  title: 'Revenue below prior period',
  description: 'Notify when revenue declines against the prior period.',
  metricKey: 'revenueChangePct',
  operator: '<',
  threshold: -10,
  unit: '%',
  severity: 'high',
  enabled: true,
  value: -15,
  triggered: true,
};

export const activity: ActivityEvent[] = [
  {
    eventName: 'sales.ingested',
    occurredAt: '2026-11-01T12:30:00.000Z',
  },
];
