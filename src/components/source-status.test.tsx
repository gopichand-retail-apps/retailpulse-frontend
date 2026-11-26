import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AwaitingFirstSale, SourceBanner, SourceSettingsSection, UnavailableValue } from './SourceStatus';
import { copy, nestedCopy, sourceCoverageText, sourceCutoffText } from '../lib/presentation';
import type { SourceSummary } from '../lib/types';
import { awaitingSource, emptyPeriodSource, missingSource, model, source, staleSource } from '../test/fixtures';

const everyState: Array<[string, SourceSummary]> = [
  ['awaiting_first_sale', awaitingSource],
  ['empty_period', emptyPeriodSource],
  ['current', source],
  ['stale', staleSource],
  ['missing', missingSource],
];

describe('source status', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(everyState)('banner for %s names the source, its cutoff and its coverage', (state, summary) => {
    render(<SourceBanner model={model} source={summary} />);
    const banner = screen.getByRole('status', { name: copy(model, 'sourceTitle') });

    expect(within(banner).getByText(nestedCopy(model, 'sourceStates', state))).toBeVisible();
    expect(within(banner).getByText(nestedCopy(model, 'sourceConnections', summary.connection))).toBeVisible();
    expect(within(banner).getByText(sourceCutoffText(model, summary.cutoffAt))).toBeVisible();
    expect(within(banner).getByText(sourceCoverageText(model, summary.coverage))).toBeVisible();
    expect(banner).toHaveAttribute('data-state', state);
  });

  it('explains every state except a current one, which stays compact', () => {
    for (const [state, summary] of everyState) {
      const { unmount } = render(<SourceBanner model={model} source={summary} />);
      const description = nestedCopy(model, 'sourceStateDescriptions', state);
      if (state === 'current') expect(screen.queryByText(description)).toBeNull();
      else expect(screen.getByText(description)).toBeVisible();
      unmount();
    }
  });

  it('never presents an awaiting source as a zero', () => {
    render(<SourceBanner model={model} source={awaitingSource} />);

    expect(screen.getByText(copy(model, 'sourceNoCutoff'))).toBeVisible();
    expect(screen.queryByText(/^\$?0$/)).toBeNull();
  });

  it('offers the empty-install guidance and a route to the source settings', async () => {
    const user = userEvent.setup();
    const onReviewSource = vi.fn();
    const { rerender } = render(
      <AwaitingFirstSale model={model} sampleSalesAvailable={false} onReviewSource={onReviewSource} />,
    );

    expect(screen.getByRole('heading', { name: copy(model, 'awaitingPanelTitle') })).toBeVisible();
    expect(screen.getByText(copy(model, 'awaitingPanelBody'))).toBeVisible();
    expect(screen.getByText(copy(model, 'ingestUnavailable'))).toBeVisible();
    await user.click(screen.getByRole('button', { name: copy(model, 'awaitingPanelAction') }));
    expect(onReviewSource).toHaveBeenCalledOnce();

    rerender(<AwaitingFirstSale model={model} sampleSalesAvailable onReviewSource={onReviewSource} />);
    expect(screen.queryByText(copy(model, 'ingestUnavailable'))).toBeNull();
  });

  it('keeps the visible dash and a screen-reader label for an unavailable figure', () => {
    render(<UnavailableValue model={model} />);

    expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(copy(model, 'notAvailable'))).toBeInTheDocument();
  });

  it.each([[awaitingSource], [source]])(
    'settings section reports the source and keeps the external feed disabled',
    (summary) => {
      render(<SourceSettingsSection model={model} source={summary} />);

      expect(screen.getByRole('heading', { name: copy(model, 'sourceTitle') })).toBeVisible();
      expect(screen.getByText(nestedCopy(model, 'sourceStates', summary.state))).toBeVisible();
      expect(screen.getByText(nestedCopy(model, 'sourceConnections', summary.connection))).toBeVisible();
      expect(screen.getByText(copy(model, 'externalFeedLabel'))).toBeVisible();
      expect(screen.getByText(copy(model, 'externalFeedStatus'))).toBeVisible();
    },
  );
});
