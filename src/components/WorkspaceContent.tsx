import { lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { AlertsView } from './AlertsView';
import { AwaitingFirstSale } from './SourceStatus';
import { copy, figureAvailability } from '../lib/presentation';
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

/** Views made only of sales figures, charts and rankings: before the first sale they have nothing true to show. */
const salesOnlyViews: readonly WorkspaceView[] = ['overview', 'revenue', 'stores'];

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
  onReviewSource: () => void;
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

type ActiveViewProps = Omit<WorkspaceContentProps, 'dashboard'> & { dashboard: DashboardData };

export function WorkspaceContent(props: WorkspaceContentProps) {
  const { model, activeView, dashboard, loadError, detailLoading, detailError } = props;
  if (loadError && !dashboard) {
    return (
      <section className="error-panel" role="alert">
        <h2>{copy(model, 'contentError')}</h2>
        <p>{loadError}</p>
        <button type="button" className="button button-secondary" onClick={props.onRetry}>
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
          onClick={activeView === 'products' ? props.onBackToProducts : props.onBackToStores}
        >
          {copy(model, 'back')}
        </button>
      </section>
    );
  }
  if (!figureAvailability(dashboard.source).sales && salesOnlyViews.includes(activeView)) {
    return (
      <AwaitingFirstSale
        model={model}
        sampleSalesAvailable={dashboard.source.profile === 'demo'}
        onReviewSource={props.onReviewSource}
      />
    );
  }
  return <ActiveView {...props} dashboard={dashboard} />;
}

function ActiveView(props: ActiveViewProps) {
  const { model, dashboard } = props;
  const figures = figureAvailability(dashboard.source);
  switch (props.activeView) {
    case 'overview':
      return (
        <OverviewView
          model={model}
          dashboard={dashboard}
          activity={props.activity}
          onOpenStore={props.onOpenStore}
          onOpenProduct={props.onOpenProduct}
          onViewStores={props.onViewStores}
          onViewProducts={props.onViewProducts}
        />
      );
    case 'revenue':
      return <RevenueView model={model} dashboard={dashboard} />;
    case 'stores':
      return (
        <StoresView
          model={model}
          stores={props.stores}
          selectedStore={props.selectedStore}
          onOpenStore={props.onOpenStore}
          onBack={props.onBackToStores}
        />
      );
    case 'products':
      return (
        <ProductsView
          model={model}
          figures={figures}
          products={props.products}
          selectedProduct={props.selectedProduct}
          search={props.search}
          sort={props.sort}
          onSearch={props.onSearch}
          onSort={props.onSort}
          onOpenProduct={props.onOpenProduct}
          onBack={props.onBackToProducts}
        />
      );
    case 'alerts':
      return (
        <AlertsView
          model={model}
          inputAvailable={figures.sales}
          alerts={props.alerts}
          savingId={props.savingAlertId}
          error={props.alertError}
          onSave={props.onSaveAlert}
        />
      );
    case 'settings':
      return (
        <SettingsView
          model={model}
          source={dashboard.source}
          theme={props.theme}
          apiReady={props.apiReady}
          onTheme={props.onTheme}
        />
      );
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
