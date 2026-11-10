export interface PublicModel {
  modelVersion: number;
  app: {
    name: string;
    descriptor: string;
    description: string;
    apiBaseUrl: string;
    allowedOrigins: string[];
    locale: string;
    currency: string;
    timezone: string;
    exportFilename: string;
  };
  theme: {
    storageKey: string;
    default: 'light' | 'dark';
  };
  navigation: Array<{ id: WorkspaceView; label: string; icon: string }>;
  copy: Record<string, unknown>;
  filters: {
    defaultRangeId: string;
    ranges: Array<{ id: string; label: string; days: number }>;
    categories: Array<{ id: string; label: string; color: string }>;
  };
  validation: {
    maximumRequestBytes: number;
    minimumAlertThreshold: number;
    maximumAlertThreshold: number;
    maximumActivityItems: number;
  };
  reports: {
    recordTypes: { store: string; product: string };
    csvHeaders: string[];
  };
  seed: {
    version: number;
    stores: Array<{
      id: string;
      name: string;
      city: string;
      region: string;
      format: string;
      squareFeet: number;
      displayOrder: number;
    }>;
    products: Array<{
      id: string;
      sku: string;
      name: string;
      category: string;
      unitPriceCents: number;
      unitCostCents: number;
      stockOnHand: number;
      displayOrder: number;
    }>;
    alerts: Array<{
      id: string;
      title: string;
      description: string;
      metricKey: string;
      operator: string;
      threshold: number;
      unit: string;
      severity: 'high' | 'medium' | 'low';
      enabled: boolean;
      displayOrder: number;
    }>;
    patterns: Array<{
      storeId: string;
      productId: string;
      units: number;
      hour: number;
      channel: string;
    }>;
    salesDays: number;
    maxUnitsVariation: number;
  };
}

export interface SalesFilters {
  days: number;
  storeId?: string;
  category?: string;
}

export interface MetricSummary {
  revenueCents: number;
  transactions: number;
  unitsSold: number;
  averageBasketCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  revenueChangePct: number;
  transactionsChangePct: number;
  unitsChangePct: number;
  averageBasketChangePct: number;
}

export interface SalesSeriesPoint {
  date: string;
  revenueCents: number;
  previousRevenueCents: number;
  transactions: number;
}

export interface CategoryPerformance {
  id: string;
  revenueCents: number;
  unitsSold: number;
}

export interface StoreSummary extends MetricSummary {
  id: string;
  name: string;
  city: string;
  region: string;
  format: string;
  squareFeet: number;
}

export interface StoreDetail extends StoreSummary {
  series: SalesSeriesPoint[];
  categories: CategoryPerformance[];
}

export interface ProductSummary extends MetricSummary {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPriceCents: number;
  unitCostCents: number;
  stockOnHand: number;
  displayOrder?: number;
}

export interface DashboardData {
  period: { days: number; from: string; to: string };
  metrics: MetricSummary;
  series: SalesSeriesPoint[];
  stores: StoreSummary[];
  products: ProductSummary[];
  categories: CategoryPerformance[];
}

export interface AlertRule {
  id: string;
  title: string;
  description: string;
  metricKey: string;
  operator: string;
  threshold: number;
  unit: string;
  severity: 'high' | 'medium' | 'low';
  enabled: boolean;
  value: number;
  triggered: boolean;
}

export interface ActivityEvent {
  eventName: string;
  occurredAt: string;
}

export type ThemeMode = 'light' | 'dark';
export type WorkspaceView = 'overview' | 'revenue' | 'stores' | 'products' | 'alerts' | 'settings';
