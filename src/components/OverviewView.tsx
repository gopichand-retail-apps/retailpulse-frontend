import { Activity, ArrowRight, CircleDollarSign, PackageCheck, ReceiptText, ShoppingBag } from 'lucide-react';
import { CategoryChart, ChartHeading, RevenueChart, StoreChart } from './AnalyticsCharts';
import { MetricCard } from './MetricCard';
import { categoryName, compactCurrency, copy, nestedCopy, percentage, quantity, timestamp } from '../lib/presentation';
import type { ActivityEvent, DashboardData, PublicModel, StoreSummary, ProductSummary } from '../lib/types';

interface OverviewViewProps {
  model: PublicModel;
  dashboard: DashboardData;
  activity: ActivityEvent[];
  onOpenStore: (storeId: string) => void;
  onOpenProduct: (productId: string) => void;
  onViewStores: () => void;
  onViewProducts: () => void;
}

export function OverviewView({
  model,
  dashboard,
  activity,
  onOpenStore,
  onOpenProduct,
  onViewStores,
  onViewProducts,
}: OverviewViewProps) {
  return (
    <div className="view-stack">
      <section className="metric-grid" aria-label={copy(model, 'overviewTitle')}>
        <MetricCard model={model} metric="revenue" metrics={dashboard.metrics} icon={CircleDollarSign} />
        <MetricCard model={model} metric="transactions" metrics={dashboard.metrics} icon={ReceiptText} />
        <MetricCard model={model} metric="units" metrics={dashboard.metrics} icon={ShoppingBag} />
        <MetricCard model={model} metric="basket" metrics={dashboard.metrics} icon={PackageCheck} />
      </section>

      <section className="panel chart-panel revenue-panel">
        <div className="panel-heading-row">
          <ChartHeading
            model={model}
            title={copy(model, 'salesTrend')}
            caption={copy(model, 'revenueChartDescription')}
          />
          <span className="period-total">{compactCurrency(model, dashboard.metrics.revenueCents)}</span>
        </div>
        <RevenueChart model={model} series={dashboard.series} />
      </section>

      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading-row">
            <ChartHeading model={model} title={copy(model, 'storeComparison')} />
            <button type="button" className="text-action" onClick={onViewStores}>
              {copy(model, 'viewAllStores')} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <StoreChart model={model} stores={dashboard.stores} />
        </section>
        <section className="panel chart-panel category-panel">
          <ChartHeading model={model} title={copy(model, 'topCategory')} />
          <CategoryChart model={model} categories={dashboard.categories} />
        </section>
      </div>

      <div className="analytics-grid lower-grid">
        <section className="panel data-panel">
          <div className="panel-heading-row">
            <ChartHeading model={model} title={copy(model, 'topStores')} />
            <button type="button" className="text-action" onClick={onViewStores}>
              {copy(model, 'viewAllStores')} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <StoreList model={model} stores={dashboard.stores.slice(0, 4)} onOpenStore={onOpenStore} />
        </section>
        <section className="panel data-panel">
          <div className="panel-heading-row">
            <ChartHeading model={model} title={copy(model, 'topProducts')} />
            <button type="button" className="text-action" onClick={onViewProducts}>
              {copy(model, 'viewAllProducts')} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <ProductList model={model} products={dashboard.products.slice(0, 5)} onOpenProduct={onOpenProduct} />
        </section>
      </div>

      <section className="panel activity-panel">
        <div className="panel-heading-row">
          <div className="activity-title">
            <Activity size={17} aria-hidden="true" />
            <h2>{copy(model, 'activityTitle')}</h2>
          </div>
          <span className="activity-count">{quantity(model, activity.length)}</span>
        </div>
        {activity.length === 0 ? (
          <p className="empty-inline">{copy(model, 'noActivity')}</p>
        ) : (
          <ul className="activity-list">
            {activity.slice(0, 4).map((event) => (
              <li key={`${event.eventName}-${event.occurredAt}`}>
                <span className="activity-indicator" aria-hidden="true" />
                <span>{nestedCopy(model, 'activityLabels', event.eventName)}</span>
                <time dateTime={event.occurredAt}>{timestamp(model, event.occurredAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function RevenueView({ model, dashboard }: { model: PublicModel; dashboard: DashboardData }) {
  const topStore = [...dashboard.stores].sort((left, right) => right.revenueCents - left.revenueCents)[0];
  const topCategory = [...dashboard.categories].sort((left, right) => right.revenueCents - left.revenueCents)[0];
  const margin = dashboard.metrics.grossMarginCents;

  return (
    <div className="view-stack">
      <section className="revenue-summary">
        <div>
          <span>{copy(model, 'revenue')}</span>
          <strong>{compactCurrency(model, dashboard.metrics.revenueCents)}</strong>
        </div>
        <div>
          <span>{copy(model, 'grossMargin')}</span>
          <strong>{compactCurrency(model, margin)}</strong>
        </div>
        <div>
          <span>{copy(model, 'topStore')}</span>
          <strong>{topStore?.name ?? copy(model, 'notAvailable')}</strong>
        </div>
        <div>
          <span>{copy(model, 'topCategory')}</span>
          <strong>{topCategory ? categoryName(model, topCategory.id) : copy(model, 'notAvailable')}</strong>
        </div>
      </section>
      <section className="panel chart-panel revenue-panel">
        <div className="panel-heading-row">
          <ChartHeading
            model={model}
            title={copy(model, 'revenuePeriod')}
            caption={copy(model, 'revenueDescription')}
          />
          <span
            className={dashboard.metrics.revenueChangePct >= 0 ? 'change-pill is-positive' : 'change-pill is-negative'}
          >
            {percentage(model, dashboard.metrics.revenueChangePct)}
          </span>
        </div>
        <RevenueChart model={model} series={dashboard.series} />
      </section>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <ChartHeading model={model} title={copy(model, 'storeComparison')} />
          <StoreChart model={model} stores={dashboard.stores} />
        </section>
        <section className="panel chart-panel category-panel">
          <ChartHeading model={model} title={copy(model, 'topCategory')} />
          <CategoryChart model={model} categories={dashboard.categories} />
        </section>
      </div>
    </div>
  );
}

function StoreList({
  model,
  stores,
  onOpenStore,
}: {
  model: PublicModel;
  stores: StoreSummary[];
  onOpenStore: (storeId: string) => void;
}) {
  return (
    <ul className="ranked-list">
      {stores.map((store, index) => (
        <li key={store.id}>
          <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="rank-name">
            <strong>{store.name}</strong>
            <small>{store.city}</small>
          </span>
          <span className="rank-value">{compactCurrency(model, store.revenueCents)}</span>
          <span className={store.revenueChangePct >= 0 ? 'rank-change is-positive' : 'rank-change is-negative'}>
            {percentage(model, store.revenueChangePct)}
          </span>
          <button
            type="button"
            className="icon-button row-open"
            aria-label={`${copy(model, 'viewStore')}: ${store.name}`}
            onClick={() => onOpenStore(store.id)}
          >
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ProductList({
  model,
  products,
  onOpenProduct,
}: {
  model: PublicModel;
  products: ProductSummary[];
  onOpenProduct: (productId: string) => void;
}) {
  return (
    <ul className="ranked-list product-rank-list">
      {products.map((product) => (
        <li key={product.id}>
          <span className={`product-swatch swatch-${product.category}`} aria-hidden="true" />
          <span className="rank-name">
            <strong>{product.name}</strong>
            <small>{product.sku}</small>
          </span>
          <span className="rank-value">{compactCurrency(model, product.revenueCents)}</span>
          <button
            type="button"
            className="icon-button row-open"
            aria-label={`${copy(model, 'viewProduct')}: ${product.name}`}
            onClick={() => onOpenProduct(product.id)}
          >
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
