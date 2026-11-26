import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CircleCheck, CircleDashed, Clock, Hourglass, Radio, Unplug } from 'lucide-react';
import { copy, nestedCopy, sourceCoverageText, sourceCutoffText } from '../lib/presentation';
import type { PublicModel, SourceState, SourceSummary } from '../lib/types';

const stateIcons: Record<SourceState, LucideIcon> = {
  awaiting_first_sale: Hourglass,
  empty_period: CircleDashed,
  current: CircleCheck,
  stale: Clock,
  missing: Unplug,
};

interface SourceProps {
  model: PublicModel;
  source: SourceSummary;
}

function SourceCutoff({ model, source }: SourceProps) {
  const text = sourceCutoffText(model, source.cutoffAt);
  return source.cutoffAt === null ? <>{text}</> : <time dateTime={source.cutoffAt}>{text}</time>;
}

function SourceFacts({ model, source }: SourceProps) {
  return (
    <dl className="source-facts">
      <div>
        <dt>{copy(model, 'sourceStatusLabel')}</dt>
        <dd>{nestedCopy(model, 'sourceConnections', source.connection)}</dd>
      </div>
      <div>
        <dt>{copy(model, 'sourceCutoffLabel')}</dt>
        <dd>
          <SourceCutoff model={model} source={source} />
        </dd>
      </div>
      <div>
        <dt>{copy(model, 'sourceCoverageLabel')}</dt>
        <dd>{sourceCoverageText(model, source.coverage)}</dd>
      </div>
    </dl>
  );
}

/** Freshness of the figures on screen. A current source stays compact; every other state explains itself. */
export function SourceBanner({ model, source }: SourceProps) {
  const Icon = stateIcons[source.state];
  return (
    <section
      className={`source-banner is-${source.state}`}
      role="status"
      aria-label={copy(model, 'sourceTitle')}
      data-state={source.state}
    >
      <div className="source-banner-state">
        <Icon size={16} aria-hidden="true" />
        <strong>{nestedCopy(model, 'sourceStates', source.state)}</strong>
      </div>
      {source.state === 'current' ? null : (
        <p className="source-banner-description">{nestedCopy(model, 'sourceStateDescriptions', source.state)}</p>
      )}
      <SourceFacts model={model} source={source} />
    </section>
  );
}

export function AwaitingFirstSale({
  model,
  sampleSalesAvailable,
  onReviewSource,
}: {
  model: PublicModel;
  sampleSalesAvailable: boolean;
  onReviewSource: () => void;
}) {
  return (
    <section className="panel awaiting-panel">
      <span className="awaiting-icon" aria-hidden="true">
        <Hourglass size={20} />
      </span>
      <h2>{copy(model, 'awaitingPanelTitle')}</h2>
      <p>{copy(model, 'awaitingPanelBody')}</p>
      {sampleSalesAvailable ? null : <p className="awaiting-note">{copy(model, 'ingestUnavailable')}</p>}
      <button type="button" className="button button-secondary" onClick={onReviewSource}>
        {copy(model, 'awaitingPanelAction')}
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </section>
  );
}

export function UnavailableValue({ model }: { model: PublicModel }) {
  return (
    <span className="unavailable-value">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{copy(model, 'notAvailable')}</span>
    </span>
  );
}

export function SourceSettingsSection({ model, source }: SourceProps) {
  return (
    <section className="settings-section">
      <div className="settings-heading">
        <span className="settings-icon">
          <Radio size={18} aria-hidden="true" />
        </span>
        <div>
          <h2>{copy(model, 'sourceTitle')}</h2>
          <p>{copy(model, 'sourceDescription')}</p>
        </div>
      </div>
      <div className="settings-status-row">
        <span>{copy(model, 'sourceStateLabel')}</span>
        <strong>{nestedCopy(model, 'sourceStates', source.state)}</strong>
      </div>
      <div className="settings-status-row">
        <span>{copy(model, 'sourceStatusLabel')}</span>
        <strong>
          <span className={source.connection === 'none' ? 'status-dot is-down' : 'status-dot'} aria-hidden="true" />
          {nestedCopy(model, 'sourceConnections', source.connection)}
        </strong>
      </div>
      <div className="settings-status-row">
        <span>{copy(model, 'sourceCutoffLabel')}</span>
        <span className="settings-value">
          <SourceCutoff model={model} source={source} />
        </span>
      </div>
      <div className="settings-status-row">
        <span>{copy(model, 'sourceCoverageLabel')}</span>
        <span className="settings-value">{sourceCoverageText(model, source.coverage)}</span>
      </div>
      <div className="settings-status-row">
        <span>{copy(model, 'externalFeedLabel')}</span>
        <span className="settings-value">{copy(model, 'externalFeedStatus')}</span>
      </div>
    </section>
  );
}
