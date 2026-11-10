import { BellRing, Check, CircleAlert, SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { compactCurrency, copy, percentage, quantity } from '../lib/presentation';
import type { AlertRule, PublicModel } from '../lib/types';

interface AlertsViewProps {
  model: PublicModel;
  alerts: AlertRule[];
  savingId: string | null;
  error: string | null;
  onSave: (id: string, changes: { threshold: number; enabled: boolean }) => void;
}

export function AlertsView({ model, alerts, savingId, error, onSave }: AlertsViewProps) {
  return (
    <div className="view-stack">
      <section className="alert-summary">
        <span className="alert-summary-icon">
          <BellRing size={19} aria-hidden="true" />
        </span>
        <div>
          <strong>{quantity(model, alerts.filter((alert) => alert.enabled && alert.triggered).length)}</strong>
          <span>{copy(model, 'triggeredStatus')}</span>
        </div>
        <div>
          <strong>{quantity(model, alerts.filter((alert) => alert.enabled).length)}</strong>
          <span>{copy(model, 'alertEnabled')}</span>
        </div>
        <p>{copy(model, 'alertsDescription')}</p>
      </section>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="alert-list">
        {alerts.map((alert) => (
          <AlertEditor key={alert.id} model={model} alert={alert} saving={savingId === alert.id} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

function AlertEditor({
  model,
  alert,
  saving,
  onSave,
}: {
  model: PublicModel;
  alert: AlertRule;
  saving: boolean;
  onSave: AlertsViewProps['onSave'];
}) {
  const [threshold, setThreshold] = useState(String(alert.threshold));
  const [enabled, setEnabled] = useState(alert.enabled);
  const parsedThreshold = Number(threshold);
  const valid = threshold.trim() !== '' && Number.isFinite(parsedThreshold);
  const value = formatAlertValue(model, alert.unit, alert.value);
  const safeThreshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 0;
  const thresholdLabel = formatAlertValue(model, alert.unit, safeThreshold);

  return (
    <form
      className="alert-editor"
      onSubmit={(event) => submitAlertForm(event, { alert, onSave, parsedThreshold, enabled, valid })}
    >
      <div className="alert-editor-main">
        <span className={`severity-mark severity-${alert.severity}`} aria-hidden="true">
          <SlidersHorizontal size={17} />
        </span>
        <div className="alert-copy">
          <div className="alert-title-row">
            <h2>{alert.title}</h2>
            <AlertStatus model={model} alert={alert} />
          </div>
          <p>{alert.description}</p>
        </div>
        <div className="alert-current">
          <span>{copy(model, 'currentPeriod')}</span>
          <strong>{value}</strong>
        </div>
      </div>
      <div className="alert-editor-controls">
        <label className="threshold-input">
          <span>{copy(model, 'alertThreshold')}</span>
          <span className="threshold-control">
            <span>{alert.operator}</span>
            <input
              aria-label={`${copy(model, 'alertThreshold')}: ${alert.title}`}
              type="number"
              step="any"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
          </span>
          <small>{thresholdLabel}</small>
        </label>
        <label className="switch-control">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>{enabled ? copy(model, 'enabledStatus') : copy(model, 'disabledStatus')}</span>
        </label>
        <button
          type="submit"
          className="button button-secondary"
          disabled={!valid || saving}
          aria-label={`${copy(model, 'saveAlert')}: ${alert.title}`}
        >
          {saving ? copy(model, 'saving') : copy(model, 'saveAlert')}
        </button>
      </div>
    </form>
  );
}

function formatAlertValue(model: PublicModel, unit: string, value: number): string {
  switch (unit) {
    case '%':
      return percentage(model, value);
    case 'currency':
      return compactCurrency(model, value);
    default:
      return quantity(model, value);
  }
}

function submitAlertForm(
  event: FormEvent<HTMLFormElement>,
  {
    alert,
    onSave,
    parsedThreshold,
    enabled,
    valid,
  }: {
    alert: AlertRule;
    onSave: AlertsViewProps['onSave'];
    parsedThreshold: number;
    enabled: boolean;
    valid: boolean;
  },
) {
  event.preventDefault();
  if (!valid) return;
  onSave(alert.id, { threshold: parsedThreshold, enabled });
}

function AlertStatus({ model, alert }: { model: PublicModel; alert: AlertRule }) {
  const triggered = alert.enabled && alert.triggered;
  return (
    <span className={`status-pill ${triggered ? `is-${alert.severity}` : ''}`}>
      {triggered ? (
        <>
          <CircleAlert size={13} aria-hidden="true" />
          {copy(model, 'triggeredStatus')}
        </>
      ) : (
        <>
          <Check size={13} aria-hidden="true" />
          {copy(model, 'withinRange')}
        </>
      )}
    </span>
  );
}
