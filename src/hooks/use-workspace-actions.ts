import { useRef, useState } from 'react';
import { ApiError, exportReport, ingestSales, updateAlert } from '../lib/api';
import { copy } from '../lib/presentation';
import type { PublicModel, SalesFilters } from '../lib/types';

interface WorkspaceActionsOptions {
  model: PublicModel | null;
  filters: SalesFilters | null;
  refresh: () => void;
}

export interface Notice {
  message: string;
  tone: 'success' | 'error' | 'pending';
}

function safeActionError(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Only a 4xx reply proves the server did not apply a write. A network error, a 5xx or an unreadable
 * reply leaves the outcome unknown, so the same intent must be retried with the same key.
 */
function isOutcomeUnknown(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status < 400 || error.status >= 500;
}

/**
 * Stable intent key for "add sample sales" (stable intent key pattern, decision D-11): created when the user
 * confirms, reused for every retry, discarded after a confirmed result or a definitive refusal. It lives only in
 * memory, so a reload starts a new intent. The request carries no payload, so there is nothing to replace it for.
 */
function useIngestIntent() {
  const keyRef = useRef<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  return {
    unconfirmed,
    claimKey(): string {
      keyRef.current ??= crypto.randomUUID();
      return keyRef.current;
    },
    awaitConfirmation() {
      setUnconfirmed(true);
    },
    settle() {
      keyRef.current = null;
      setUnconfirmed(false);
    },
  };
}

export function useWorkspaceActions({ model, filters, refresh }: WorkspaceActionsOptions) {
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'ingest' | 'export' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const ingestIntent = useIngestIntent();

  async function saveAlert(alertId: string, changes: { threshold: number; enabled: boolean }) {
    if (!model) return;
    setSavingAlertId(alertId);
    setAlertError(null);
    try {
      await updateAlert(model, alertId, changes);
      setNotice({ message: copy(model, 'alertSaved'), tone: 'success' });
      refresh();
    } catch (error) {
      setAlertError(safeActionError(error, copy(model, 'alertFailure')));
    } finally {
      setSavingAlertId(null);
    }
  }

  async function addSales() {
    if (!model) return;
    const idempotencyKey = ingestIntent.claimKey();
    setBusyAction('ingest');
    try {
      await ingestSales(model, idempotencyKey);
      ingestIntent.settle();
      setNotice({ message: copy(model, 'ingestSuccess'), tone: 'success' });
      refresh();
    } catch (error) {
      if (isOutcomeUnknown(error)) {
        ingestIntent.awaitConfirmation();
        setNotice({ message: copy(model, 'ingestAwaiting'), tone: 'pending' });
      } else {
        ingestIntent.settle();
        setNotice({ message: safeActionError(error, copy(model, 'ingestFailure')), tone: 'error' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function downloadReport() {
    if (!model || !filters) return;
    setBusyAction('export');
    try {
      const report = await exportReport(model, filters);
      const objectUrl = URL.createObjectURL(report);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = model.app.exportFilename;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setNotice({ message: copy(model, 'csvExported'), tone: 'success' });
    } catch (error) {
      setNotice({
        message: safeActionError(error, copy(model, 'exportFailure')),
        tone: 'error',
      });
    } finally {
      setBusyAction(null);
    }
  }

  return {
    savingAlertId,
    alertError,
    busyAction,
    notice,
    ingestUnconfirmed: ingestIntent.unconfirmed,
    setNotice,
    saveAlert,
    addSales,
    downloadReport,
  };
}
