import { describe, expect, it } from 'vitest';
import {
  categoryName,
  compactCurrency,
  copy,
  currency,
  nestedCopy,
  percentage,
  quantity,
  shortDate,
  timestamp,
} from './presentation';
import { model } from '../test/fixtures';

describe('presentation helpers', () => {
  it('reads top-level and nested content with explicit validation', () => {
    expect(copy(model, 'overviewTitle')).toBe('Sales overview');
    expect(() => copy(model, 'missing')).toThrow('The content model is missing the "missing" string.');
    expect(nestedCopy(model, 'errors', 'notFound')).toBe('The requested resource was not found.');
    expect(() => nestedCopy(model, 'missing', 'value')).toThrow('The content model is missing "missing.value".');
    expect(() => nestedCopy(model, 'errors', 'missing')).toThrow('The content model is missing "errors.missing".');
    expect(() =>
      nestedCopy({ ...model, copy: { ...model.copy, errors: { invalid: 1 } } }, 'errors', 'invalid'),
    ).toThrow('The content value "errors.invalid" is invalid.');
  });

  it('formats monetary, percentage, quantity, and date values by locale', () => {
    expect(currency(model, 12345)).toBe('$123');
    expect(currency(model, 12345, 2)).toBe('$123.45');
    expect(compactCurrency(model, 12345678)).toContain('$123.5K');
    expect(percentage(model, 12.34)).toBe('+12.3%');
    expect(quantity(model, 1234)).toBe('1,234');
    expect(shortDate(model, '2026-11-01T22:00:00.000Z')).toBe('Nov 1');
    expect(timestamp(model, '2026-11-01T12:30:00.000Z')).toContain('Nov 1');
  });

  it('uses the configured category label and preserves unknown IDs', () => {
    expect(categoryName(model, 'apparel')).toBe('Apparel');
    expect(categoryName(model, 'unmapped')).toBe('unmapped');
  });
});
