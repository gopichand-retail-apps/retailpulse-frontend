import { ArrowLeft, ArrowUpRight, MapPin, Store as StoreIcon } from 'lucide-react';
import { RevenueChart } from './AnalyticsCharts';
import { compactCurrency, copy, currency, percentage, quantity } from '../lib/presentation';
import type { PublicModel, StoreDetail, StoreSummary } from '../lib/types';

interface StoresViewProps {
  model: PublicModel;
  stores: StoreSummary[];
  selectedStore: StoreDetail | null;
  onOpenStore: (storeId: string) => void;
  onBack: () => void;
}

export function StoresView({ model, stores, selectedStore, onOpenStore, onBack }: StoresViewProps) {
  if (selectedStore) {
    return <StoreDetailView model={model} store={selectedStore} onBack={onBack} />;
  }
  return (
    <section className="panel data-panel full-panel">
      <div className="panel-heading-row">
        <div>
          <h2>{copy(model, 'storeTable')}</h2>
          <p>{copy(model, 'storesDescription')}</p>
        </div>
        <span className="result-count">
          {quantity(model, stores.length)} · {copy(model, 'storeFilter')}
        </span>
      </div>
      {stores.length === 0 ? (
        <p className="empty-state">{copy(model, 'noStores')}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{copy(model, 'storeFilter')}</th>
                <th>{copy(model, 'location')}</th>
                <th>{copy(model, 'format')}</th>
                <th>{copy(model, 'revenue')}</th>
                <th>{copy(model, 'transactions')}</th>
                <th>{copy(model, 'grossMargin')}</th>
                <th>{copy(model, 'performance')}</th>
                <th>
                  <span className="sr-only">{copy(model, 'viewDetails')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <span className="table-primary">
                      <span className="table-icon">
                        <StoreIcon size={16} aria-hidden="true" />
                      </span>
                      {store.name}
                    </span>
                  </td>
                  <td>{store.city}</td>
                  <td>{store.format}</td>
                  <td>{compactCurrency(model, store.revenueCents)}</td>
                  <td>{quantity(model, store.transactions)}</td>
                  <td>{percentage(model, store.grossMarginPct)}</td>
                  <td>
                    <span
                      className={store.revenueChangePct >= 0 ? 'table-change is-positive' : 'table-change is-negative'}
                    >
                      {percentage(model, store.revenueChangePct)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${copy(model, 'viewStore')}: ${store.name}`}
                      onClick={() => onOpenStore(store.id)}
                    >
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StoreDetailView({ model, store, onBack }: { model: PublicModel; store: StoreDetail; onBack: () => void }) {
  return (
    <div className="view-stack">
      <button type="button" className="back-action" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy(model, 'back')}
      </button>
      <section className="detail-intro">
        <span className="detail-icon store-detail-icon">
          <StoreIcon size={21} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">{copy(model, 'storeDetail')}</span>
          <h2>{store.name}</h2>
          <p>
            <MapPin size={14} aria-hidden="true" />
            {store.city} · {store.region}
          </p>
        </div>
        <span className={store.revenueChangePct >= 0 ? 'change-pill is-positive' : 'change-pill is-negative'}>
          {percentage(model, store.revenueChangePct)}
        </span>
      </section>
      <section className="detail-metrics">
        <div>
          <span>{copy(model, 'revenue')}</span>
          <strong>{compactCurrency(model, store.revenueCents)}</strong>
        </div>
        <div>
          <span>{copy(model, 'transactions')}</span>
          <strong>{quantity(model, store.transactions)}</strong>
        </div>
        <div>
          <span>{copy(model, 'grossMargin')}</span>
          <strong>{percentage(model, store.grossMarginPct)}</strong>
        </div>
        <div>
          <span>{copy(model, 'salesPerSquareFoot')}</span>
          <strong>{currency(model, store.revenueCents / store.squareFeet)}</strong>
        </div>
      </section>
      <section className="panel chart-panel revenue-panel">
        <h2>{copy(model, 'salesTrend')}</h2>
        <RevenueChart model={model} series={store.series} />
      </section>
      <section className="panel detail-facts">
        <div>
          <span>{copy(model, 'format')}</span>
          <strong>{store.format}</strong>
        </div>
        <div>
          <span>{copy(model, 'squareFeet')}</span>
          <strong>{quantity(model, store.squareFeet)}</strong>
        </div>
        <div>
          <span>{copy(model, 'unitsSold')}</span>
          <strong>{quantity(model, store.unitsSold)}</strong>
        </div>
      </section>
    </div>
  );
}
