import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import { categoryName, compactCurrency, copy, currency, percentage, quantity } from '../lib/presentation';
import type { ProductSummary, PublicModel } from '../lib/types';

interface ProductsViewProps {
  model: PublicModel;
  products: ProductSummary[];
  selectedProduct: ProductSummary | null;
  search: string;
  sort: string;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  onOpenProduct: (productId: string) => void;
  onBack: () => void;
}

export function ProductsView({
  model,
  products,
  selectedProduct,
  search,
  sort,
  onSearch,
  onSort,
  onOpenProduct,
  onBack,
}: ProductsViewProps) {
  if (selectedProduct) return <ProductDetailView model={model} product={selectedProduct} onBack={onBack} />;

  return (
    <section className="panel data-panel full-panel">
      <div className="panel-heading-row products-heading">
        <div>
          <h2>{copy(model, 'productTable')}</h2>
          <p>{copy(model, 'productsDescription')}</p>
        </div>
        <span className="result-count">
          {quantity(model, products.length)} · {copy(model, 'product')}
        </span>
      </div>
      <div className="table-tools">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{copy(model, 'searchProducts')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={copy(model, 'searchPlaceholder')}
          />
        </label>
        <label className="sort-field">
          <span>{copy(model, 'sortProductsBy')}</span>
          <select
            aria-label={copy(model, 'sortProducts')}
            value={sort}
            onChange={(event) => onSort(event.target.value)}
          >
            <option value="revenue">{copy(model, 'sortRevenue')}</option>
            <option value="units">{copy(model, 'sortUnits')}</option>
            <option value="name">{copy(model, 'sortName')}</option>
            <option value="stock">{copy(model, 'sortStock')}</option>
          </select>
        </label>
      </div>
      {products.length === 0 ? (
        <p className="empty-state">{copy(model, 'noProducts')}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{copy(model, 'product')}</th>
                <th>{copy(model, 'sku')}</th>
                <th>{copy(model, 'category')}</th>
                <th>{copy(model, 'revenue')}</th>
                <th>{copy(model, 'unitsSold')}</th>
                <th>{copy(model, 'grossMargin')}</th>
                <th>{copy(model, 'stockOnHand')}</th>
                <th>
                  <span className="sr-only">{copy(model, 'viewDetails')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="table-primary">
                      <span className={`product-swatch swatch-${product.category}`} aria-hidden="true" />
                      {product.name}
                    </span>
                  </td>
                  <td className="mono-cell">{product.sku}</td>
                  <td>{categoryName(model, product.category)}</td>
                  <td>{compactCurrency(model, product.revenueCents)}</td>
                  <td>{quantity(model, product.unitsSold)}</td>
                  <td>{percentage(model, product.grossMarginPct)}</td>
                  <td>{quantity(model, product.stockOnHand)}</td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${copy(model, 'viewProduct')}: ${product.name}`}
                      onClick={() => onOpenProduct(product.id)}
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
      <p className="table-note">{copy(model, 'inventoryNote')}</p>
    </section>
  );
}

function ProductDetailView({
  model,
  product,
  onBack,
}: {
  model: PublicModel;
  product: ProductSummary;
  onBack: () => void;
}) {
  return (
    <div className="view-stack">
      <button type="button" className="back-action" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        {copy(model, 'back')}
      </button>
      <section className="detail-intro">
        <span className={`detail-icon product-detail-icon swatch-${product.category}`} aria-hidden="true" />
        <div>
          <span className="eyebrow">
            {copy(model, 'productDetail')} · {product.sku}
          </span>
          <h2>{product.name}</h2>
          <p>{categoryName(model, product.category)}</p>
        </div>
        <span className={product.revenueChangePct >= 0 ? 'change-pill is-positive' : 'change-pill is-negative'}>
          {percentage(model, product.revenueChangePct)}
        </span>
      </section>
      <section className="detail-metrics">
        <div>
          <span>{copy(model, 'revenue')}</span>
          <strong>{compactCurrency(model, product.revenueCents)}</strong>
        </div>
        <div>
          <span>{copy(model, 'unitsSold')}</span>
          <strong>{quantity(model, product.unitsSold)}</strong>
        </div>
        <div>
          <span>{copy(model, 'grossMargin')}</span>
          <strong>{percentage(model, product.grossMarginPct)}</strong>
        </div>
        <div>
          <span>{copy(model, 'stockOnHand')}</span>
          <strong>{quantity(model, product.stockOnHand)}</strong>
        </div>
      </section>
      <section className="panel detail-facts">
        <div>
          <span>{copy(model, 'sku')}</span>
          <strong>{product.sku}</strong>
        </div>
        <div>
          <span>{copy(model, 'category')}</span>
          <strong>{categoryName(model, product.category)}</strong>
        </div>
        <div>
          <span>{copy(model, 'unitPrice')}</span>
          <strong>{currency(model, product.unitPriceCents, 2)}</strong>
        </div>
        <div>
          <span>{copy(model, 'marginValue')}</span>
          <strong>{compactCurrency(model, product.grossMarginCents)}</strong>
        </div>
      </section>
      <button type="button" className="text-action detail-back-link" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        {copy(model, 'back')}
      </button>
    </div>
  );
}
