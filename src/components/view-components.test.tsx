import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CircleDollarSign } from 'lucide-react';
import { AlertsView } from './AlertsView';
import { MetricCard } from './MetricCard';
import { OverviewView, RevenueView } from './OverviewView';
import { ProductsView } from './ProductsView';
import { SettingsView } from './SettingsView';
import { StoresView } from './StoresView';
import { alert, dashboard, metrics, model, product, store } from '../test/fixtures';

vi.mock('./AnalyticsCharts', () => ({
  CategoryChart: () => <div data-testid="category-chart" />,
  ChartHeading: ({ title, caption }: { title: string; caption?: string }) => (
    <div>
      <h2>{title}</h2>
      {caption ? <p>{caption}</p> : null}
    </div>
  ),
  RevenueChart: () => <div data-testid="revenue-chart" />,
  StoreChart: () => <div data-testid="store-chart" />,
}));

describe('RetailPulse view components', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders alert units, disabled and triggered states, validation, and saves', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const currencyAlert = {
      ...alert,
      id: 'alert-margin',
      title: 'Margin below target',
      unit: 'currency',
      enabled: false,
      triggered: false,
    };
    const quantityAlert = {
      ...alert,
      id: 'alert-units',
      title: 'Units below target',
      unit: 'units',
      enabled: true,
      triggered: false,
    };
    const { container } = render(
      <AlertsView
        model={model}
        alerts={[alert, currencyAlert, quantityAlert]}
        savingId="alert-margin"
        error="A threshold could not be saved."
        onSave={onSave}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('A threshold could not be saved.');
    expect(screen.getAllByText('Triggered').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Within range').length).toBeGreaterThan(0);
    expect(screen.getByText('Saving')).toBeVisible();

    const thresholdInput = screen.getByRole('spinbutton', {
      name: 'Threshold: Revenue below prior period',
    });
    await user.clear(thresholdInput);
    expect(
      screen.getByRole('button', {
        name: 'Save threshold: Revenue below prior period',
      }),
    ).toBeDisabled();
    const invalidForm = thresholdInput.closest('form');
    if (!invalidForm) throw new Error('Expected an alert form.');
    fireEvent.submit(invalidForm);
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save threshold: Units below target' }));
    expect(onSave).toHaveBeenCalledWith('alert-units', {
      threshold: -10,
      enabled: true,
    });
    expect(container.querySelectorAll('.alert-editor')).toHaveLength(3);
  });

  it('renders empty and populated overview and revenue summaries', async () => {
    const user = userEvent.setup();
    const onOpenStore = vi.fn();
    const onOpenProduct = vi.fn();
    const onViewStores = vi.fn();
    const onViewProducts = vi.fn();
    const emptyDashboard = {
      ...dashboard,
      stores: [],
      products: [],
      categories: [],
    };
    const emptyView = render(
      <OverviewView
        model={model}
        dashboard={emptyDashboard}
        activity={[]}
        onOpenStore={onOpenStore}
        onOpenProduct={onOpenProduct}
        onViewStores={onViewStores}
        onViewProducts={onViewProducts}
      />,
    );

    expect(screen.getByText('No recent activity.')).toBeVisible();
    const viewAllButtons = screen.getAllByRole('button', {
      name: 'View all stores',
    });
    const viewAllStores = viewAllButtons[0];
    if (!viewAllStores) throw new Error('Expected the store-list action.');
    await user.click(viewAllStores);
    await user.click(screen.getByRole('button', { name: 'View all products' }));
    expect(onViewStores).toHaveBeenCalledOnce();
    expect(onViewProducts).toHaveBeenCalledOnce();
    emptyView.unmount();

    const populatedView = render(
      <OverviewView
        model={model}
        dashboard={dashboard}
        activity={[]}
        onOpenStore={onOpenStore}
        onOpenProduct={onOpenProduct}
        onViewStores={onViewStores}
        onViewProducts={onViewProducts}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'View store: Harbor & Pine' }));
    await user.click(screen.getByRole('button', { name: 'View product: Everyday Canvas Tote' }));
    expect(onOpenStore).toHaveBeenCalledWith(store.id);
    expect(onOpenProduct).toHaveBeenCalledWith(product.id);
    populatedView.unmount();

    render(
      <RevenueView
        model={model}
        dashboard={{
          ...emptyDashboard,
          metrics: { ...metrics, revenueChangePct: -2 },
        }}
      />,
    );
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
    expect(screen.getByText('-2%')).toBeVisible();
  });

  it('renders all metric trends and theme/service status controls', async () => {
    const user = userEvent.setup();
    const onTheme = vi.fn();
    const negativeMetrics = {
      ...metrics,
      revenueChangePct: -3,
      unitsChangePct: 0,
    };
    const { container } = render(
      <>
        <MetricCard model={model} metric="revenue" metrics={negativeMetrics} icon={CircleDollarSign} />
        <MetricCard model={model} metric="units" metrics={negativeMetrics} icon={CircleDollarSign} />
        <SettingsView model={model} theme="light" apiReady={false} onTheme={onTheme} />
      </>,
    );

    expect(container.querySelector('.metric-change.is-negative')).toBeTruthy();
    expect(container.querySelector('.metric-change:not(.is-positive):not(.is-negative)')).toBeTruthy();
    expect(screen.getByText('Service unavailable')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Light mode' }));
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(onTheme).toHaveBeenNthCalledWith(1, 'light');
    expect(onTheme).toHaveBeenNthCalledWith(2, 'dark');
  });

  it('renders empty product and store lists', () => {
    render(
      <>
        <ProductsView
          model={model}
          products={[]}
          selectedProduct={null}
          search=""
          sort="revenue"
          onSearch={vi.fn()}
          onSort={vi.fn()}
          onOpenProduct={vi.fn()}
          onBack={vi.fn()}
        />
        <StoresView model={model} stores={[]} selectedStore={null} onOpenStore={vi.fn()} onBack={vi.fn()} />
      </>,
    );

    expect(screen.getByText('No products match this search.')).toBeVisible();
    expect(screen.getByText('No stores match the selected filters.')).toBeVisible();
  });
});
