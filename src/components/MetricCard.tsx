import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { compactCurrency, copy, percentage, quantity } from '../lib/presentation';
import type { MetricSummary, PublicModel } from '../lib/types';

interface MetricCardProps {
  model: PublicModel;
  metric: 'revenue' | 'transactions' | 'units' | 'basket';
  metrics: MetricSummary;
  icon: LucideIcon;
}

export function MetricCard({ model, metric, metrics, icon: Icon }: MetricCardProps) {
  const value = {
    revenue: compactCurrency(model, metrics.revenueCents),
    transactions: quantity(model, metrics.transactions),
    units: quantity(model, metrics.unitsSold),
    basket: compactCurrency(model, metrics.averageBasketCents),
  }[metric];
  const change = metric === 'revenue' ? metrics.revenueChangePct : metrics.unitsChangePct;
  const TrendIcon = change > 0.05 ? ArrowUpRight : change < -0.05 ? ArrowDownRight : Minus;
  const changeClass =
    change > 0.05 ? 'metric-change is-positive' : change < -0.05 ? 'metric-change is-negative' : 'metric-change';

  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className="metric-label">
          {copy(
            model,
            metric === 'revenue'
              ? 'revenue'
              : metric === 'transactions'
                ? 'transactions'
                : metric === 'units'
                  ? 'unitsSold'
                  : 'averageBasket',
          )}
        </span>
        <span className="metric-icon">
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className={changeClass}>
        <TrendIcon size={14} aria-hidden="true" />
        <span>{percentage(model, change)}</span>
        <span className="metric-period">{copy(model, 'vsPreviousPeriod')}</span>
      </div>
    </article>
  );
}
