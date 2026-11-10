import { useState } from 'react';
import { WorkspaceContent } from './components/WorkspaceContent';
import { WorkspaceShell } from './components/WorkspaceShell';
import { useAppSettings } from './hooks/use-app-settings';
import { useDebouncedValue } from './hooks/use-debounced-value';
import { useWorkspaceActions } from './hooks/use-workspace-actions';
import { useWorkspaceData } from './hooks/use-workspace-data';
import './App.css';
import type { ThemeMode, WorkspaceView } from './lib/types';

function getSelectedDays(model: ReturnType<typeof useAppSettings>['model'], rangeId: string): number {
  if (!model) return 0;
  const selectedRange =
    model.filters.ranges.find((range) => range.id === rangeId) ??
    model.filters.ranges.find((range) => range.id === model.filters.defaultRangeId) ??
    model.filters.ranges[0];
  return selectedRange?.days ?? 0;
}

function updateSelectedView(
  view: WorkspaceView,
  setters: {
    setActiveView: (view: WorkspaceView) => void;
    setNavigationOpen: (open: boolean) => void;
    setSelectedStoreId: (id: string | null) => void;
    setSelectedProductId: (id: string | null) => void;
  },
) {
  setters.setActiveView(view);
  setters.setNavigationOpen(false);
  if (view !== 'stores') setters.setSelectedStoreId(null);
  if (view !== 'products') setters.setSelectedProductId(null);
}

function App() {
  const { model, bootstrapFailed, offline, theme, setTheme } = useAppSettings();
  const [activeView, setActiveView] = useState<WorkspaceView>('overview');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [rangeId, setRangeId] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sort, setSort] = useState('revenue');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const days = getSelectedDays(model, rangeId);
  const data = useWorkspaceData({
    model,
    days,
    storeFilter,
    categoryFilter,
    activeView,
    selectedStoreId,
    selectedProductId,
    sort,
    debouncedSearch,
  });
  const refresh = () => data.setRefreshVersion((version) => version + 1);
  const actions = useWorkspaceActions({
    model,
    filters: data.filters,
    refresh,
  });

  if (!model) {
    return (
      <main className="bootstrap-screen" role={bootstrapFailed ? 'alert' : 'status'} aria-busy={!bootstrapFailed}>
        {bootstrapFailed ? (
          <code className="bootstrap-error-code">CONTENT_MODEL_UNAVAILABLE</code>
        ) : (
          <span className="loading-spinner" aria-hidden="true" />
        )}
      </main>
    );
  }

  const navigate = (view: WorkspaceView) =>
    updateSelectedView(view, {
      setActiveView,
      setNavigationOpen,
      setSelectedStoreId,
      setSelectedProductId,
    });

  function openStore(storeId: string) {
    setSelectedStoreId(storeId);
    setSelectedProductId(null);
    setActiveView('stores');
    setNavigationOpen(false);
  }

  function openProduct(productId: string) {
    setSelectedProductId(productId);
    setSelectedStoreId(null);
    setActiveView('products');
    setNavigationOpen(false);
  }

  return (
    <WorkspaceShell
      model={model}
      activeView={activeView}
      navigationOpen={navigationOpen}
      offline={offline}
      apiReady={data.apiReady}
      alerts={data.alerts}
      theme={theme}
      lastUpdated={data.lastUpdated}
      dataLoading={data.dataLoading}
      productsLoading={data.productsLoading}
      busyAction={actions.busyAction}
      dashboard={data.dashboard}
      rangeId={rangeId}
      storeFilter={storeFilter}
      categoryFilter={categoryFilter}
      notice={actions.notice}
      loadError={data.loadError}
      productError={data.productError}
      onNavigate={navigate}
      onNavigationClose={() => setNavigationOpen(false)}
      onNavigationToggle={() => setNavigationOpen((isOpen) => !isOpen)}
      onThemeChange={(nextTheme: ThemeMode) => setTheme(nextTheme)}
      onRefresh={refresh}
      onAddSales={actions.addSales}
      onDownloadReport={actions.downloadReport}
      onRangeChange={setRangeId}
      onStoreFilterChange={setStoreFilter}
      onCategoryFilterChange={setCategoryFilter}
    >
      <WorkspaceContent
        model={model}
        activeView={activeView}
        dashboard={data.dashboard}
        theme={theme}
        apiReady={data.apiReady}
        activity={data.activity}
        stores={data.stores}
        products={data.products}
        selectedStore={data.selectedStore}
        selectedProduct={data.selectedProduct}
        search={search}
        sort={sort}
        alerts={data.alerts}
        savingAlertId={actions.savingAlertId}
        alertError={actions.alertError}
        loadError={data.loadError}
        detailLoading={data.detailLoading}
        detailError={data.detailError}
        onTheme={setTheme}
        onRetry={refresh}
        onOpenStore={openStore}
        onOpenProduct={openProduct}
        onViewStores={() => navigate('stores')}
        onViewProducts={() => navigate('products')}
        onBackToStores={() => setSelectedStoreId(null)}
        onBackToProducts={() => setSelectedProductId(null)}
        onSearch={setSearch}
        onSort={setSort}
        onSaveAlert={actions.saveAlert}
      />
    </WorkspaceShell>
  );
}

export default App;
