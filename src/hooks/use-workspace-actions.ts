import { useState } from 'react';
import { ApiError, exportReport, ingestSales, updateAlert } from '../lib/api';
import { copy } from '../lib/presentation';
import type { PublicModel, SalesFilters } from '../lib/types';

interface WorkspaceActionsOptions {
  model: PublicModel | null;
  filters: SalesFilters | null;
  refresh: () => void;
}

interface Notice {
  message: string;
  tone: 'success' | 'error';
}

function safeActionError(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useWorkspaceActions({ model, filters, refresh }: WorkspaceActionsOptions) {
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'ingest' | 'export' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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
    setBusyAction('ingest');
    try {
      await ingestSales(model);
      setNotice({ message: copy(model, 'ingestSuccess'), tone: 'success' });
      refresh();
    } catch (error) {
      setNotice({
        message: safeActionError(error, copy(model, 'ingestFailure')),
        tone: 'error',
      });
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
    setNotice,
    saveAlert,
    addSales,
    downloadReport,
  };
}
