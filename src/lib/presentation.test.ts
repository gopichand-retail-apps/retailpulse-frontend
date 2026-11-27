import { describe, expect, it } from 'vitest';
import {
  categoryName,
  compactCurrency,
  copy,
  currency,
  figureAvailability,
  interpolate,
  nestedCopy,
  percentage,
  quantity,
  shortDate,
  sourceCoverageText,
  sourceCutoffText,
  timestamp,
} from './presentation';
import { awaitingSource, emptyPeriodSource, missingSource, model, source, staleSource } from '../test/fixtures';

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

  it('fills named placeholders and leaves unknown ones visible', () => {
    expect(interpolate('{covered} of {total} days', { covered: 4, total: 30 })).toBe('4 of 30 days');
    expect(interpolate('{covered} of {missing}', { covered: 4 })).toBe('4 of {missing}');
    expect(interpolate('no placeholders', { covered: 4 })).toBe('no placeholders');
  });

  it('describes the reporting cutoff and coverage from the content model', () => {
    expect(sourceCoverageText(model, { daysWithSales: 28, daysInPeriod: 30 })).toBe('28 of 30 days with sales');
    expect(sourceCutoffText(model, null)).toBe('No sale committed yet');
    expect(sourceCutoffText(model, '2026-11-01T12:30:00.000Z')).toBe(timestamp(model, '2026-11-01T12:30:00.000Z'));
  });

  it('shows sales figures once a sale exists and stock only when a source feeds it', () => {
    expect(figureAvailability(awaitingSource)).toEqual({ sales: false, stock: false });
    expect(figureAvailability(source)).toEqual({ sales: true, stock: true });
    expect(figureAvailability(emptyPeriodSource)).toEqual({ sales: true, stock: true });
    expect(figureAvailability(staleSource)).toEqual({ sales: true, stock: true });
    expect(figureAvailability(missingSource)).toEqual({ sales: true, stock: false });
  });
});
