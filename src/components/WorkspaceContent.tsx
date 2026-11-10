import { lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { AlertsView } from './AlertsView';
import { copy } from '../lib/presentation';
import type {
  ActivityEvent,
  AlertRule,
  DashboardData,
  ProductSummary,
  PublicModel,
  StoreDetail,
  StoreSummary,
  WorkspaceView,
} from '../lib/types';

const OverviewView = lazy(() => import('./OverviewView').then((module) => ({ default: module.OverviewView })));
const RevenueView = lazy(() => import('./OverviewView').then((module) => ({ default: module.RevenueView })));
const ProductsView = lazy(() => import('./ProductsView').then((module) => ({ default: module.ProductsView })));
const SettingsView = lazy(() => import('./SettingsView').then((module) => ({ default: module.SettingsView })));
const StoresView = lazy(() => import('./StoresView').then((module) => ({ default: module.StoresView })));

interface WorkspaceContentProps {
  model: PublicModel;
  activeView: WorkspaceView;
  dashboard: DashboardData | null;
  theme: 'light' | 'dark';
  apiReady: boolean;
  activity: ActivityEvent[];
  stores: StoreSummary[];
  products: ProductSummary[];
  selectedStore: StoreDetail | null;
  selectedProduct: ProductSummary | null;
  search: string;
  sort: string;
  alerts: AlertRule[];
  savingAlertId: string | null;
  alertError: string | null;
  loadError: string | null;
  detailLoading: boolean;
  detailError: string | null;
  onTheme: (theme: 'light' | 'dark') => void;
  onRetry: () => void;
  onOpenStore: (storeId: string) => void;
  onOpenProduct: (productId: string) => void;
  onViewStores: () => void;
  onViewProducts: () => void;
  onBackToStores: () => void;
  onBackToProducts: () => void;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  onSaveAlert: (alertId: string, changes: { threshold: number; enabled: boolean }) => void;
}

export function WorkspaceContent({
  model,
  activeView,
  dashboard,
  theme,
  apiReady,
  activity,
  stores,
  products,
  selectedStore,
  selectedProduct,
  search,
  sort,
  alerts,
  savingAlertId,
  alertError,
  loadError,
  detailLoading,
  detailError,
  onTheme,
  onRetry,
  onOpenStore,
  onOpenProduct,
  onViewStores,
  onViewProducts,
  onBackToStores,
  onBackToProducts,
  onSearch,
  onSort,
  onSaveAlert,
}: WorkspaceContentProps) {
  if (loadError && !dashboard) {
    return (
      <section className="error-panel" role="alert">
        <h2>{copy(model, 'contentError')}</h2>
        <p>{loadError}</p>
        <button type="button" className="button button-secondary" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" />
          {copy(model, 'retry')}
        </button>
      </section>
    );
  }
  if (!dashboard) return <LoadingState model={model} />;
  if (detailLoading) return <LoadingState model={model} detail />;
  if (detailError) {
    return (
      <section className="error-panel" role="alert">
        <p>{detailError}</p>
        <button
          type="button"
          className="button button-secondary"
          onClick={activeView === 'products' ? onBackToProducts : onBackToStores}
        >
          {copy(model, 'back')}
        </button>
      </section>
    );
  }

  switch (activeView) {
    case 'overview':
      return (
        <OverviewView
          model={model}
          dashboard={dashboard}
          activity={activity}
          onOpenStore={onOpenStore}
          onOpenProduct={onOpenProduct}
          onViewStores={onViewStores}
          onViewProducts={onViewProducts}
        />
      );
    case 'revenue':
      return <RevenueView model={model} dashboard={dashboard} />;
    case 'stores':
      return (
        <StoresView
          model={model}
          stores={stores}
          selectedStore={selectedStore}
          onOpenStore={onOpenStore}
          onBack={onBackToStores}
        />
      );
    case 'products':
      return (
        <ProductsView
          model={model}
          products={products}
          selectedProduct={selectedProduct}
          search={search}
          sort={sort}
          onSearch={onSearch}
          onSort={onSort}
          onOpenProduct={onOpenProduct}
          onBack={onBackToProducts}
        />
      );
    case 'alerts':
      return (
        <AlertsView model={model} alerts={alerts} savingId={savingAlertId} error={alertError} onSave={onSaveAlert} />
      );
    case 'settings':
      return <SettingsView model={model} theme={theme} apiReady={apiReady} onTheme={onTheme} />;
    default:
      return null;
  }
}

export function LoadingState({ model, detail = false }: { model: PublicModel; detail?: boolean }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{copy(model, detail ? 'loadingDetails' : 'loadingDescription')}</span>
    </div>
  );
}
