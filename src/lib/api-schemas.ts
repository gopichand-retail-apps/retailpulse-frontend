import { z } from 'zod';
import type { PublicModel } from './types';

const metricSchema = z.object({
  revenueCents: z.number(),
  transactions: z.number(),
  unitsSold: z.number(),
  averageBasketCents: z.number(),
  grossMarginCents: z.number(),
  grossMarginPct: z.number(),
  revenueChangePct: z.number(),
  transactionsChangePct: z.number(),
  unitsChangePct: z.number(),
  averageBasketChangePct: z.number(),
});

const storeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    city: z.string(),
    region: z.string(),
    format: z.string(),
    squareFeet: z.number(),
  })
  .extend(metricSchema.shape);

const productSchema = z
  .object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    category: z.string(),
    unitPriceCents: z.number(),
    unitCostCents: z.number(),
    stockOnHand: z.number(),
    displayOrder: z.number().optional(),
  })
  .extend(metricSchema.shape);

export const dashboardSchema = z.object({
  period: z.object({ days: z.number(), from: z.string(), to: z.string() }),
  metrics: metricSchema,
  series: z.array(
    z.object({
      date: z.string(),
      revenueCents: z.number(),
      previousRevenueCents: z.number(),
      transactions: z.number(),
    }),
  ),
  stores: z.array(storeSchema),
  products: z.array(productSchema),
  categories: z.array(
    z.object({
      id: z.string(),
      revenueCents: z.number(),
      unitsSold: z.number(),
    }),
  ),
});

export const alertSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  metricKey: z.string(),
  operator: z.string(),
  threshold: z.number(),
  unit: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  enabled: z.boolean(),
  value: z.number(),
  triggered: z.boolean(),
});

export const activitySchema = z.object({
  eventName: z.string(),
  occurredAt: z.string(),
});

export const storesSchema = z.array(storeSchema);
export const productsSchema = z.array(productSchema);
export const alertsSchema = z.array(alertSchema);
export const activityListSchema = z.array(activitySchema);
export const productDetailSchema = productSchema;
export const storeDetailSchema = storeSchema.extend({
  series: dashboardSchema.shape.series,
  categories: dashboardSchema.shape.categories,
});

export const contentModelSchema = z
  .object({
    version: z.number().int().positive(),
    appId: z.literal('retailpulse'),
    locale: z.string().min(2),
    messages: z.record(z.string(), z.unknown()),
    data: z
      .object({
        app: z.object({
          name: z.string(),
          descriptor: z.string(),
          description: z.string(),
          apiBaseUrl: z.string().url(),
          allowedOrigins: z.array(z.string().url()).min(1),
          currency: z.string(),
          timezone: z.string(),
          exportFilename: z.string(),
        }),
        theme: z.object({
          storageKey: z.string(),
          default: z.enum(['light', 'dark']),
        }),
        navigation: z.array(
          z.object({
            id: z.enum(['overview', 'revenue', 'stores', 'products', 'alerts', 'settings']),
            label: z.string(),
            icon: z.string(),
          }),
        ),
        filters: z.object({
          defaultRangeId: z.string(),
          ranges: z.array(z.object({ id: z.string(), label: z.string(), days: z.number() })),
          categories: z.array(z.object({ id: z.string(), label: z.string(), color: z.string() })),
        }),
        validation: z.object({
          maximumRequestBytes: z.number(),
          minimumAlertThreshold: z.number(),
          maximumAlertThreshold: z.number(),
          maximumActivityItems: z.number(),
        }),
        reports: z.object({
          recordTypes: z.object({
            store: z.string(),
            product: z.string(),
          }),
          csvHeaders: z.array(z.string()),
        }),
        seed: z
          .object({
            version: z.number().int().positive(),
            stores: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                city: z.string(),
                region: z.string(),
                format: z.string(),
                squareFeet: z.number(),
                displayOrder: z.number(),
              }),
            ),
            products: z.array(
              z.object({
                id: z.string(),
                sku: z.string(),
                name: z.string(),
                category: z.string(),
                unitPriceCents: z.number(),
                unitCostCents: z.number(),
                stockOnHand: z.number(),
                displayOrder: z.number(),
              }),
            ),
            alerts: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                metricKey: z.string(),
                operator: z.string(),
                threshold: z.number(),
                unit: z.string(),
                severity: z.enum(['high', 'medium', 'low']),
                enabled: z.boolean(),
                displayOrder: z.number(),
              }),
            ),
            patterns: z.array(
              z.object({
                storeId: z.string(),
                productId: z.string(),
                units: z.number(),
                hour: z.number(),
                channel: z.string(),
              }),
            ),
            salesDays: z.number().int().positive(),
            maxUnitsVariation: z.number().int().positive(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type ContentModelEnvelope = z.infer<typeof contentModelSchema>;

export function toPublicModel(envelope: ContentModelEnvelope, apiBaseUrl = envelope.data.app.apiBaseUrl): PublicModel {
  return {
    modelVersion: envelope.version,
    app: {
      ...envelope.data.app,
      locale: envelope.locale,
      apiBaseUrl,
    },
    theme: envelope.data.theme,
    navigation: envelope.data.navigation,
    copy: envelope.messages,
    filters: envelope.data.filters,
    validation: envelope.data.validation,
    reports: envelope.data.reports,
    seed: envelope.data.seed,
  };
}
