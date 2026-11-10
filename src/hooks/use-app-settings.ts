import { useEffect, useState } from 'react';
import { loadModel } from '../lib/api';
import type { PublicModel, ThemeMode } from '../lib/types';

interface AppSettings {
  model: PublicModel | null;
  bootstrapFailed: boolean;
  offline: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export function useAppSettings(): AppSettings {
  const [model, setModel] = useState<PublicModel | null>(null);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const controller = new AbortController();
    void loadModel(controller.signal)
      .then((loadedModel) => {
        if (controller.signal.aborted) return;
        setModel(loadedModel);
        const storedTheme = window.localStorage.getItem(loadedModel.theme.storageKey);
        setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : loadedModel.theme.default);
        document.title = `${loadedModel.app.name} | ${loadedModel.app.descriptor}`;
        document.documentElement.lang = loadedModel.app.locale.split('-')[0];
        setDocumentDescription(loadedModel.app.description);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBootstrapFailed(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (model) window.localStorage.setItem(model.theme.storageKey, theme);
  }, [model, theme]);

  return { model, bootstrapFailed, offline, theme, setTheme };
}

function setDocumentDescription(value: string) {
  let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement('meta');
    description.name = 'description';
    document.head.append(description);
  }
  description.content = value;
}
