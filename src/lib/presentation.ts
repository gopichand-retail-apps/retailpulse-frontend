import type { PublicModel } from './types';

export function copy(model: PublicModel, key: string): string {
  const value = model.copy[key];
  if (typeof value !== 'string') throw new TypeError(`The content model is missing the "${key}" string.`);
  return value;
}

export function nestedCopy(model: PublicModel, section: string, key: string): string {
  const values = model.copy[section];
  if (typeof values !== 'object' || values === null || !(key in values)) {
    throw new TypeError(`The content model is missing "${section}.${key}".`);
  }
  const value = values[key];
  if (typeof value !== 'string') throw new TypeError(`The content value "${section}.${key}" is invalid.`);
  return value;
}

export function currency(model: PublicModel, cents: number, precision: 0 | 2 = 0): string {
  return new Intl.NumberFormat(model.app.locale, {
    style: 'currency',
    currency: model.app.currency,
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(cents / 100);
}

export function compactCurrency(model: PublicModel, cents: number): string {
  return new Intl.NumberFormat(model.app.locale, {
    style: 'currency',
    currency: model.app.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function percentage(model: PublicModel, value: number): string {
  return `${new Intl.NumberFormat(model.app.locale, {
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value)}%`;
}

export function quantity(model: PublicModel, value: number): string {
  return new Intl.NumberFormat(model.app.locale).format(value);
}

export function shortDate(model: PublicModel, value: string): string {
  return new Intl.DateTimeFormat(model.app.locale, {
    month: 'short',
    day: 'numeric',
    timeZone: model.app.timezone,
  }).format(new Date(value));
}

export function timestamp(model: PublicModel, value: string): string {
  return new Intl.DateTimeFormat(model.app.locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: model.app.timezone,
  }).format(new Date(value));
}

export function categoryName(model: PublicModel, id: string): string {
  return model.filters.categories.find((category) => category.id === id)?.label ?? id;
}
