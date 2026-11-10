import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FormatterProps = {
  children?: ReactNode;
  tickFormatter?: (value: string | number) => unknown;
  formatter?: (value: number, name: string) => unknown;
  labelFormatter?: (value: string) => unknown;
};

vi.mock('recharts', () => {
  function Container({ children }: FormatterProps) {
    return <div>{children}</div>;
  }

  function Formatter(props: FormatterProps) {
    const values: string[] = [];
    if (props.tickFormatter) values.push(String(props.tickFormatter(12345)));
    if (props.formatter) values.push(String(props.formatter(12345, 'apparel')));
    if (props.labelFormatter) {
      values.push(String(props.labelFormatter('2026-11-01')));
    }
    return <span data-testid="formatted-chart-values">{values.join(' ')}</span>;
  }

  return {
    Bar: () => null,
    BarChart: Container,
    CartesianGrid: () => null,
    Cell: () => null,
    Legend: () => null,
    Line: () => null,
    LineChart: Container,
    Pie: Container,
    PieChart: Container,
    ResponsiveContainer: Container,
    Tooltip: Formatter,
    XAxis: Formatter,
    YAxis: Formatter,
  };
});

import { CategoryChart, ChartHeading, RevenueChart, StoreChart } from './AnalyticsCharts';
import { categories, model, secondStore, series, store } from '../test/fixtures';

describe('analytics charts', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders revenue, store, category charts, and localized headings', () => {
    render(
      <>
        <RevenueChart model={model} series={series} />
        <StoreChart model={model} stores={[store, secondStore]} />
        <CategoryChart model={model} categories={categories} />
        <ChartHeading model={model} title="Revenue" caption="Daily sales" />
        <ChartHeading model={model} title="Stores" />
      </>,
    );

    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Revenue')).toBeVisible();
    expect(screen.getByText('Daily sales')).toBeVisible();
    expect(screen.getByText('Stores')).toBeVisible();
    expect(screen.getAllByTestId('formatted-chart-values').length).toBeGreaterThan(0);
  });

  it('renders charts with empty data without inventing categories or stores', () => {
    const { container } = render(
      <>
        <RevenueChart model={model} series={[]} />
        <StoreChart model={model} stores={[]} />
        <CategoryChart model={model} categories={[]} />
      </>,
    );

    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('.category-legend li')).toHaveLength(0);
  });
});
