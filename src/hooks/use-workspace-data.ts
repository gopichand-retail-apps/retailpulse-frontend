import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ApiError,
  getActivity,
  getAlerts,
  getDashboard,
  getHealth,
  getProduct,
  getProducts,
  getStore,
  getStores,
} from '../lib/api';
import { copy } from '../lib/presentation';
import type {
  ActivityEvent,
  AlertRule,
  DashboardData,
  ProductSummary,
  PublicModel,
  SalesFilters,
  StoreDetail,
  StoreSummary,
  WorkspaceView,
} from '../lib/types';

interface QueryResult<T> {
  key: string;
  value?: T;
  error?: string;
}

interface WorkspaceDataOptions {
  model: PublicModel | null;
  days: number;
  storeFilter: string;
  categoryFilter: string;
  activeView: WorkspaceView;
  selectedStoreId: string | null;
  selectedProductId: string | null;
  sort: string;
  debouncedSearch: string;
}

interface ReadOptions {
  model: PublicModel | null;
  filters: SalesFilters | null;
  refreshVersion: number;
  queryKey: string;
}

function safeErrorMessage(error: unknown, model: PublicModel, fallbackKey: string): string {
  return error instanceof ApiError ? error.message : copy(model, fallbackKey);
}

function currentValue<T>(result: QueryResult<T> | null, key: string): T | null {
  return result?.key === key ? (result.value ?? null) : null;
}

function currentError(result: QueryResult<unknown> | null, key: string): string | null {
  return result?.key === key ? (result.error ?? null) : null;
}

function createRequestFilters(days: number, storeFilter: string, categoryFilter: string): SalesFilters {
  return {
    days,
    storeId: storeFilter || undefined,
    category: categoryFilter || undefined,
  };
}

function useOnlineRefresh(setRefreshVersion: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    const handleOnline = () => setRefreshVersion((version) => version + 1);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [setRefreshVersion]);
}

function useDashboardSnapshot(options: ReadOptions) {
  const { model, filters, refreshVersion, queryKey } = options;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [apiReady, setApiReady] = useState(false);
  const [result, setResult] = useState<QueryResult<void> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!model || !filters) return;
    const controller = new AbortController();
    void Promise.all([
      getHealth(model, controller.signal),
      getDashboard(model, filters, controller.signal),
      getStores(model, filters, controller.signal),
      getAlerts(model, filters, controller.signal),
      getActivity(model, controller.signal),
    ])
      .then(([health, nextDashboard, nextStores, nextAlerts, nextActivity]) => {
        if (controller.signal.aborted) return;
        setApiReady(health.status === 'ok');
        setDashboard(nextDashboard);
        setStores(nextStores);
        setAlerts(nextAlerts);
        setActivity(nextActivity);
        setLastUpdated(new Date().toISOString());
        setResult({ key: queryKey });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setApiReady(false);
        setResult({
          key: queryKey,
          error: safeErrorMessage(error, model, 'loadError'),
        });
      });
    return () => controller.abort();
  }, [model, filters, refreshVersion, queryKey]);

  return {
    dashboard,
    stores,
    alerts,
    activity,
    apiReady,
    lastUpdated,
    error: currentError(result, queryKey),
    loading: Boolean(filters && result?.key !== queryKey),
  };
}

function useProductList(options: ReadOptions & { search: string; sort: string }) {
  const { model, filters, refreshVersion, queryKey, search, sort } = options;
  const [result, setResult] = useState<QueryResult<ProductSummary[]> | null>(null);

  useEffect(() => {
    if (!model || !filters) return;
    const controller = new AbortController();
    void getProducts(model, filters, {
      search,
      sort,
      signal: controller.signal,
    })
      .then((products) => {
        if (!controller.signal.aborted) setResult({ key: queryKey, value: products });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: queryKey,
            error: safeErrorMessage(error, model, 'requestError'),
          });
        }
      });
    return () => controller.abort();
  }, [model, filters, refreshVersion, queryKey, search, sort]);

  return {
    products: result?.value ?? [],
    error: currentError(result, queryKey),
    loading: Boolean(filters && result?.key !== queryKey),
  };
}

function useStoreDetail(options: ReadOptions & { storeId: string | null }) {
  const { model, filters, refreshVersion, queryKey, storeId } = options;
  const [result, setResult] = useState<QueryResult<StoreDetail> | null>(null);

  useEffect(() => {
    if (!model || !filters || !storeId) return;
    const controller = new AbortController();
    void getStore(model, storeId, filters, controller.signal)
      .then((store) => {
        if (!controller.signal.aborted) setResult({ key: queryKey, value: store });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: queryKey,
            error: safeErrorMessage(error, model, 'storeUnavailable'),
          });
        }
      });
    return () => controller.abort();
  }, [model, filters, refreshVersion, queryKey, storeId]);

  return {
    value: currentValue(result, queryKey),
    error: currentError(result, queryKey),
  };
}

function useProductDetail(options: ReadOptions & { productId: string | null }) {
  const { model, filters, refreshVersion, queryKey, productId } = options;
  const [result, setResult] = useState<QueryResult<ProductSummary> | null>(null);

  useEffect(() => {
    if (!model || !filters || !productId) return;
    const controller = new AbortController();
    void getProduct(model, productId, filters, controller.signal)
      .then((product) => {
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, value: product });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: queryKey,
            error: safeErrorMessage(error, model, 'productUnavailable'),
          });
        }
      });
    return () => controller.abort();
  }, [model, filters, refreshVersion, queryKey, productId]);

  return {
    value: currentValue(result, queryKey),
    error: currentError(result, queryKey),
  };
}

export function useWorkspaceData(options: WorkspaceDataOptions) {
  const {
    model,
    days,
    storeFilter,
    categoryFilter,
    activeView,
    selectedStoreId,
    selectedProductId,
    debouncedSearch,
    sort,
  } = options;
  const [refreshVersion, setRefreshVersion] = useState(0);
  useOnlineRefresh(setRefreshVersion);

  const dataQueryKey = `${days}:${storeFilter}:${categoryFilter}:${refreshVersion}`;
  const productQueryKey = `${dataQueryKey}:${debouncedSearch}:${sort}`;
  const filters = useMemo(
    () => (model && days > 0 ? createRequestFilters(days, storeFilter, categoryFilter) : null),
    [model, days, storeFilter, categoryFilter],
  );
  const snapshot = useDashboardSnapshot({
    model,
    filters,
    refreshVersion,
    queryKey: dataQueryKey,
  });
  const productList = useProductList({
    model,
    filters,
    refreshVersion,
    queryKey: productQueryKey,
    search: debouncedSearch,
    sort,
  });
  const storeDetailKey = `${dataQueryKey}:${selectedStoreId ?? ''}`;
  const productDetailKey = `${dataQueryKey}:${selectedProductId ?? ''}`;
  const storeDetail = useStoreDetail({
    model,
    filters,
    refreshVersion,
    queryKey: storeDetailKey,
    storeId: selectedStoreId,
  });
  const productDetail = useProductDetail({
    model,
    filters,
    refreshVersion,
    queryKey: productDetailKey,
    productId: selectedProductId,
  });
  const detail = selectDetail({
    activeView,
    selectedStoreId,
    selectedProductId,
    storeDetail,
    productDetail,
  });

  return {
    ...snapshot,
    products: productList.products,
    productError: productList.error,
    productsLoading: productList.loading,
    loadError: snapshot.error,
    dataLoading: snapshot.loading,
    refreshVersion,
    setRefreshVersion,
    filters,
    selectedStore: storeDetail.value,
    selectedProduct: productDetail.value,
    detailError: detail.error,
    detailLoading: detail.loading,
  };
}

function selectDetail({
  activeView,
  selectedStoreId,
  selectedProductId,
  storeDetail,
  productDetail,
}: {
  activeView: WorkspaceView;
  selectedStoreId: string | null;
  selectedProductId: string | null;
  storeDetail: ReturnType<typeof useStoreDetail>;
  productDetail: ReturnType<typeof useProductDetail>;
}) {
  const productView = activeView === 'products';
  const selected = productView ? productDetail : storeDetail;
  const hasSelection = productView ? selectedProductId !== null : activeView === 'stores' && selectedStoreId !== null;
  return {
    error: selected.error,
    loading: Boolean(hasSelection && !selected.value && !selected.error),
  };
}
