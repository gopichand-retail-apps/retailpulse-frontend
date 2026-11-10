import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API mode configuration', () => {
  it('uses the default mock API and development-only legacy override', async () => {
    const { isMock, resolveApiBaseUrl } = await import('./config');

    expect(isMock).toBe(true);
    expect(resolveApiBaseUrl('http://127.0.0.1:5702/api/v1')).toBe('http://127.0.0.1:5702/api/v1');
    expect(resolveApiBaseUrl('http://127.0.0.1:5702/api/v1', ' https://mock.example.test/api/v1 ')).toBe(
      'https://mock.example.test/api/v1',
    );
  });

  it('prefers an explicit mock URL and rejects non-HTTP protocols', async () => {
    vi.stubEnv('VITE_MOCK_API_BASE_URL', 'https://mock.example.test/api/v1');
    const { resolveApiBaseUrl } = await import('./config');

    expect(resolveApiBaseUrl('http://127.0.0.1:5702/api/v1')).toBe('https://mock.example.test/api/v1');
    vi.stubEnv('VITE_MOCK_API_BASE_URL', '');
    expect(() => resolveApiBaseUrl('ftp://example.test/api/v1')).toThrow(
      'The selected API base URL must use HTTP or HTTPS.',
    );
  });

  it('requires explicit endpoints for production mock and live builds', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_MOCK_API_BASE_URL', '');
    const mockConfig = await import('./config');
    expect(() => mockConfig.resolveApiBaseUrl('http://127.0.0.1:5702/api/v1')).toThrow(
      'VITE_MOCK_API_BASE_URL is required in production when VITE_IS_MOCK=true.',
    );

    vi.resetModules();
    vi.stubEnv('VITE_IS_MOCK', 'false');
    vi.stubEnv('VITE_REAL_API_BASE_URL', '');
    const liveConfig = await import('./config');
    expect(liveConfig.isMock).toBe(false);
    expect(() => liveConfig.resolveApiBaseUrl('http://127.0.0.1:5702/api/v1')).toThrow(
      'VITE_REAL_API_BASE_URL is required when VITE_IS_MOCK=false.',
    );
  });

  it('rejects invalid mode values and malformed URLs', async () => {
    vi.stubEnv('VITE_IS_MOCK', 'sometimes');
    await expect(import('./config')).rejects.toThrow('VITE_IS_MOCK must be "true" or "false".');

    vi.resetModules();
    vi.stubEnv('VITE_IS_MOCK', 'true');
    const config = await import('./config');
    expect(() => config.resolveApiBaseUrl('not-an-absolute-url')).toThrow(
      'The selected API base URL must be an absolute HTTP(S) URL.',
    );
  });
});
