import { Suspense, type ReactNode } from 'react';
import {
  BellRing,
  ChartNoAxesCombined,
  Download,
  LayoutDashboard,
  Menu,
  Moon,
  PackageSearch,
  RefreshCw,
  Settings2,
  Store,
  Sun,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isMock } from '../config';
import { APP_VERSION } from '../app-version';
import { copy, timestamp } from '../lib/presentation';
import type { AlertRule, DashboardData, PublicModel, ThemeMode, WorkspaceView } from '../lib/types';
import { LoadingState } from './WorkspaceContent';

const navigationIcons: Record<string, LucideIcon> = {
  LayoutDashboard,
  ChartNoAxesCombined,
  Store,
  PackageSearch,
  BellRing,
  Settings2,
};

interface WorkspaceShellProps {
  model: PublicModel;
  activeView: WorkspaceView;
  navigationOpen: boolean;
  offline: boolean;
  apiReady: boolean;
  alerts: AlertRule[];
  theme: ThemeMode;
  lastUpdated: string | null;
  dataLoading: boolean;
  productsLoading: boolean;
  busyAction: 'ingest' | 'export' | null;
  dashboard: DashboardData | null;
  rangeId: string;
  storeFilter: string;
  categoryFilter: string;
  notice: { message: string; tone: 'success' | 'error' } | null;
  loadError: string | null;
  productError: string | null;
  children: ReactNode;
  onNavigate: (view: WorkspaceView) => void;
  onNavigationClose: () => void;
  onNavigationToggle: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onRefresh: () => void;
  onAddSales: () => void;
  onDownloadReport: () => void;
  onRangeChange: (rangeId: string) => void;
  onStoreFilterChange: (storeId: string) => void;
  onCategoryFilterChange: (category: string) => void;
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  const { model, activeView, navigationOpen, theme, children } = props;
  const pageTitle = copy(model, `${activeView}Title`);
  const pageDescription = copy(model, `${activeView}Description`);

  return (
    <div className="app-shell" data-theme={theme} data-mode={isMock ? 'mock' : 'live'}>
      {navigationOpen ? (
        <button
          className="navigation-scrim"
          type="button"
          aria-label={copy(model, 'closeNavigation')}
          onClick={props.onNavigationClose}
        />
      ) : null}
      <WorkspaceSidebar
        model={model}
        activeView={activeView}
        navigationOpen={navigationOpen}
        apiReady={props.apiReady}
        alerts={props.alerts}
        onNavigate={props.onNavigate}
      />
      <div className="workspace-main">
        <WorkspaceTopbar
          model={model}
          pageTitle={pageTitle}
          theme={theme}
          navigationOpen={navigationOpen}
          lastUpdated={props.lastUpdated}
          onNavigationToggle={props.onNavigationToggle}
          onThemeChange={props.onThemeChange}
        />
        <main className="workspace-content" aria-busy={props.dataLoading || props.productsLoading}>
          <WorkspacePageHeading
            model={model}
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            dataLoading={props.dataLoading}
            busyAction={props.busyAction}
            hasDashboard={props.dashboard !== null}
            onRefresh={props.onRefresh}
            onAddSales={props.onAddSales}
            onDownloadReport={props.onDownloadReport}
          />
          {activeView !== 'settings' ? (
            <ReportFilters
              model={model}
              rangeId={props.rangeId}
              storeFilter={props.storeFilter}
              categoryFilter={props.categoryFilter}
              onRangeChange={props.onRangeChange}
              onStoreFilterChange={props.onStoreFilterChange}
              onCategoryFilterChange={props.onCategoryFilterChange}
            />
          ) : null}
          <WorkspaceFeedback
            model={model}
            offline={props.offline}
            dataLoading={props.dataLoading}
            notice={props.notice}
            loadError={props.loadError}
            productError={props.productError}
            dashboard={props.dashboard}
            activeView={activeView}
            onRefresh={props.onRefresh}
          />
          <section className="view-content" aria-label={pageTitle}>
            <Suspense fallback={<LoadingState model={model} />}>{children}</Suspense>
          </section>
        </main>
      </div>
    </div>
  );
}

function WorkspaceSidebar({
  model,
  activeView,
  navigationOpen,
  apiReady,
  alerts,
  onNavigate,
}: Pick<WorkspaceShellProps, 'model' | 'activeView' | 'navigationOpen' | 'apiReady' | 'alerts' | 'onNavigate'>) {
  return (
    <aside className={navigationOpen ? 'sidebar is-open' : 'sidebar'}>
      <div className="brand-lockup">
        <span className="brand-mark">
          <ChartNoAxesCombined size={21} aria-hidden="true" />
        </span>
        <span className="brand-wordmark">{model.app.name}</span>
      </div>
      <div className="sidebar-workspace">
        <span className="workspace-overline">{copy(model, 'workspace')}</span>
        <span className="workspace-name">{copy(model, 'networkName')}</span>
      </div>
      <nav className="primary-navigation" aria-label={copy(model, 'primaryNavigation')}>
        <span className="navigation-section-label">{copy(model, 'navigationSection')}</span>
        {model.navigation.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            model={model}
            active={activeView === item.id}
            hasTriggeredAlerts={alerts.some((alert) => alert.enabled && alert.triggered)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className={apiReady ? 'status-dot' : 'status-dot is-down'} aria-hidden="true" />
          <span>{copy(model, apiReady ? 'apiReady' : 'apiUnavailable')}</span>
        </div>
        <div className="profile-row">
          <span className="profile-avatar" aria-hidden="true">
            {copy(model, 'userInitials')}
          </span>
          <span className="profile-copy">
            <small>
              {copy(model, 'releaseVersion')} {APP_VERSION}
            </small>
            <strong>{copy(model, 'userName')}</strong>
            <small>{copy(model, 'userRole')}</small>
          </span>
          <Settings2 size={16} aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}

function NavigationItem({
  item,
  model,
  active,
  hasTriggeredAlerts,
  onNavigate,
}: {
  item: PublicModel['navigation'][number];
  model: PublicModel;
  active: boolean;
  hasTriggeredAlerts: boolean;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const Icon = navigationIcons[item.icon] ?? LayoutDashboard;
  return (
    <button
      type="button"
      className={active ? 'navigation-link is-active' : 'navigation-link'}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate(item.id)}
    >
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
      {item.id === 'alerts' && hasTriggeredAlerts ? (
        <span className="navigation-indicator" aria-label={copy(model, 'triggeredStatus')} />
      ) : null}
    </button>
  );
}

function WorkspaceTopbar({
  model,
  pageTitle,
  theme,
  navigationOpen,
  lastUpdated,
  onNavigationToggle,
  onThemeChange,
}: Pick<
  WorkspaceShellProps,
  'model' | 'theme' | 'navigationOpen' | 'lastUpdated' | 'onNavigationToggle' | 'onThemeChange'
> & { pageTitle: string }) {
  const ThemeIcon = theme === 'light' ? Moon : Sun;
  return (
    <header className="workspace-topbar">
      <button
        type="button"
        className="icon-button mobile-navigation-toggle"
        aria-label={copy(model, navigationOpen ? 'closeNavigation' : 'openNavigation')}
        onClick={onNavigationToggle}
      >
        {navigationOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      <div className="topbar-context">
        <span>{copy(model, 'workspace')}</span>
        <span className="context-divider">/</span>
        <strong>{pageTitle}</strong>
      </div>
      <div className="topbar-actions">
        {lastUpdated ? (
          <span className="last-updated">
            {copy(model, 'lastUpdated')} · {timestamp(model, lastUpdated)}
          </span>
        ) : null}
        <button
          type="button"
          className="icon-button theme-toggle"
          aria-label={copy(model, 'themeToggle')}
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
        >
          <ThemeIcon size={17} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function WorkspacePageHeading({
  model,
  pageTitle,
  pageDescription,
  dataLoading,
  busyAction,
  hasDashboard,
  onRefresh,
  onAddSales,
  onDownloadReport,
}: {
  model: PublicModel;
  pageTitle: string;
  pageDescription: string;
  dataLoading: boolean;
  busyAction: WorkspaceShellProps['busyAction'];
  hasDashboard: boolean;
  onRefresh: () => void;
  onAddSales: () => void;
  onDownloadReport: () => void;
}) {
  return (
    <div className="page-heading-row">
      <div className="page-heading-copy">
        <span className="page-eyebrow">
          {copy(model, 'greeting')}, {copy(model, 'userName')}
        </span>
        <h1>{pageTitle}</h1>
        <p>{pageDescription}</p>
      </div>
      <div className="page-actions">
        <button
          type="button"
          className="icon-button refresh-button"
          aria-label={copy(model, 'refresh')}
          title={copy(model, 'refresh')}
          onClick={onRefresh}
          disabled={dataLoading}
        >
          <RefreshCw size={16} className={dataLoading ? 'is-spinning' : undefined} aria-hidden="true" />
        </button>
        <button type="button" className="button button-secondary" onClick={onAddSales} disabled={busyAction !== null}>
          <Upload size={15} aria-hidden="true" />
          {copy(model, 'ingest')}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={onDownloadReport}
          disabled={busyAction !== null || !hasDashboard}
        >
          <Download size={15} aria-hidden="true" />
          {copy(model, 'export')}
        </button>
      </div>
    </div>
  );
}

function ReportFilters({
  model,
  rangeId,
  storeFilter,
  categoryFilter,
  onRangeChange,
  onStoreFilterChange,
  onCategoryFilterChange,
}: Pick<
  WorkspaceShellProps,
  | 'model'
  | 'rangeId'
  | 'storeFilter'
  | 'categoryFilter'
  | 'onRangeChange'
  | 'onStoreFilterChange'
  | 'onCategoryFilterChange'
>) {
  const selectedRange =
    model.filters.ranges.find((range) => range.id === rangeId) ??
    model.filters.ranges.find((range) => range.id === model.filters.defaultRangeId) ??
    model.filters.ranges[0];
  return (
    <section className="filter-toolbar" aria-label={copy(model, 'reportScope')}>
      <div className="filter-toolbar-heading">
        <span>{copy(model, 'filterResults')}</span>
        <strong>{copy(model, 'reportingPeriod')}</strong>
      </div>
      <label className="filter-control">
        <span>{copy(model, 'reportingPeriod')}</span>
        <select value={selectedRange?.id ?? ''} onChange={(event) => onRangeChange(event.target.value)}>
          {model.filters.ranges.map((range) => (
            <option key={range.id} value={range.id}>
              {range.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-control">
        <span>{copy(model, 'storeFilter')}</span>
        <select value={storeFilter} onChange={(event) => onStoreFilterChange(event.target.value)}>
          <option value="">{copy(model, 'allStores')}</option>
          {model.seed.stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-control">
        <span>{copy(model, 'categoryFilter')}</span>
        <select value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
          <option value="">{copy(model, 'allCategories')}</option>
          {model.filters.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function WorkspaceFeedback({
  model,
  offline,
  dataLoading,
  notice,
  loadError,
  productError,
  dashboard,
  activeView,
  onRefresh,
}: Pick<
  WorkspaceShellProps,
  | 'model'
  | 'offline'
  | 'dataLoading'
  | 'notice'
  | 'loadError'
  | 'productError'
  | 'dashboard'
  | 'activeView'
  | 'onRefresh'
>) {
  return (
    <>
      {offline ? (
        <div className="offline-notice" role="status">
          <WifiOff size={17} aria-hidden="true" />
          <span>{copy(model, 'offlineNotice')}</span>
          <button type="button" className="button button-secondary" onClick={onRefresh} disabled={dataLoading}>
            <RefreshCw size={15} aria-hidden="true" />
            {copy(model, 'offlineRetry')}
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </div>
      ) : null}
      {loadError && dashboard ? (
        <p className="inline-error" role="alert">
          {loadError}
        </p>
      ) : null}
      {productError && activeView === 'products' ? (
        <p className="inline-error" role="alert">
          {productError}
        </p>
      ) : null}
    </>
  );
}
