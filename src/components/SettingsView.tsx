import { Database, Moon, ShieldCheck, Sun } from 'lucide-react';
import { copy } from '../lib/presentation';
import type { PublicModel, ThemeMode } from '../lib/types';

interface SettingsViewProps {
  model: PublicModel;
  theme: ThemeMode;
  apiReady: boolean;
  onTheme: (theme: ThemeMode) => void;
}

export function SettingsView({ model, theme, apiReady, onTheme }: SettingsViewProps) {
  return (
    <div className="settings-layout">
      <section className="settings-section">
        <div className="settings-heading">
          <span className="settings-icon">
            <Sun size={18} aria-hidden="true" />
          </span>
          <div>
            <h2>{copy(model, 'themePreference')}</h2>
            <p>{copy(model, 'settingsDescription')}</p>
          </div>
        </div>
        <div className="theme-selector" role="group" aria-label={copy(model, 'themeLabel')}>
          <button
            type="button"
            className={theme === 'light' ? 'theme-option is-selected' : 'theme-option'}
            aria-pressed={theme === 'light'}
            onClick={() => onTheme('light')}
          >
            <Sun size={17} aria-hidden="true" />
            <span>{copy(model, 'lightTheme')}</span>
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'theme-option is-selected' : 'theme-option'}
            aria-pressed={theme === 'dark'}
            onClick={() => onTheme('dark')}
          >
            <Moon size={17} aria-hidden="true" />
            <span>{copy(model, 'darkTheme')}</span>
          </button>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-heading">
          <span className="settings-icon">
            <Database size={18} aria-hidden="true" />
          </span>
          <div>
            <h2>{copy(model, 'connectedStorage')}</h2>
            <p>{copy(model, 'storageDescription')}</p>
          </div>
        </div>
        <div className="settings-status-row">
          <span>{copy(model, 'localStorageStatus')}</span>
          <strong>
            <span className="status-dot" aria-hidden="true" />
            {copy(model, 'localStorageName')}
          </strong>
        </div>
        <div className="settings-status-row">
          <span>{copy(model, 'apiService')}</span>
          <strong>
            <span className={apiReady ? 'status-dot' : 'status-dot is-down'} aria-hidden="true" />
            {copy(model, apiReady ? 'apiReady' : 'apiUnavailable')}
          </strong>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-heading">
          <span className="settings-icon">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <h2>{copy(model, 'security')}</h2>
            <p>{copy(model, 'securityDescription')}</p>
          </div>
        </div>
        <div className="settings-status-row">
          <span>{copy(model, 'dataHandling')}</span>
          <span className="settings-value">{copy(model, 'dataHandlingDescription')}</span>
        </div>
      </section>
    </div>
  );
}
