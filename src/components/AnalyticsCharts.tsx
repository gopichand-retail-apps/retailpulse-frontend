import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { categoryName, compactCurrency, copy, shortDate } from '../lib/presentation';
import type { CategoryPerformance, PublicModel, SalesSeriesPoint, StoreSummary } from '../lib/types';

interface ChartProps {
  model: PublicModel;
}

export function RevenueChart({ model, series }: ChartProps & { series: SalesSeriesPoint[] }) {
  return (
    <div className="chart-canvas" role="img" aria-label={copy(model, 'revenueChartDescription')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => shortDate(model, value)}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(value: number) => compactCurrency(model, value)}
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => [compactCurrency(model, Number(value)), String(name)]}
            labelFormatter={(value) => shortDate(model, String(value))}
            contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 4 }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={7} />
          <Line
            type="monotone"
            dataKey="revenueCents"
            name={copy(model, 'revenue')}
            stroke="var(--chart-sales)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="previousRevenueCents"
            name={copy(model, 'previousPeriod')}
            stroke="var(--chart-previous)"
            strokeWidth={1.8}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StoreChart({ model, stores }: ChartProps & { stores: StoreSummary[] }) {
  const data = stores.map((store) => ({
    id: store.id,
    name: store.name,
    revenueCents: store.revenueCents,
  }));
  return (
    <div className="chart-canvas" role="img" aria-label={copy(model, 'storeChartDescription')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 0, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
          <XAxis
            type="number"
            tickFormatter={(value: number) => compactCurrency(model, value)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={112}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [compactCurrency(model, Number(value)), copy(model, 'revenue')]}
            contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 4 }}
          />
          <Bar dataKey="revenueCents" fill="var(--chart-sales)" radius={[0, 3, 3, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ model, categories }: ChartProps & { categories: CategoryPerformance[] }) {
  const colors = new Map(model.filters.categories.map((category) => [category.id, category.color]));
  return (
    <div className="category-chart-wrap">
      <div className="category-chart" role="img" aria-label={copy(model, 'categoryChartDescription')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="revenueCents"
              nameKey="id"
              innerRadius="60%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {categories.map((category) => (
                <Cell key={category.id} fill={colors.get(category.id)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [compactCurrency(model, Number(value)), categoryName(model, String(name))]}
              contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 4 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="category-legend" aria-label={copy(model, 'categoryFilter')}>
        {categories.map((category) => {
          const color = colors.get(category.id);
          return (
            <li key={category.id}>
              <span className="legend-dot" style={{ backgroundColor: color }} aria-hidden="true" />
              <span>{categoryName(model, category.id)}</span>
              <strong>{compactCurrency(model, category.revenueCents)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChartHeading({ model, title, caption }: { model: PublicModel; title: string; caption?: string }) {
  return (
    <div className="chart-heading" lang={model.app.locale}>
      <h2>{title}</h2>
      {caption ? <p>{caption}</p> : null}
    </div>
  );
}
