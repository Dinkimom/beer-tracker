import { describe, expect, it } from 'vitest';

import { isPwaCacheableStaticPath, shouldBypassServiceWorker } from './pwaCachePolicy';

describe('shouldBypassServiceWorker', () => {
  it('bypasses API and Next HMR', () => {
    expect(shouldBypassServiceWorker('/api/sprints')).toBe(true);
    expect(shouldBypassServiceWorker('/_next/webpack-hmr')).toBe(true);
    expect(shouldBypassServiceWorker('/site.webmanifest')).toBe(true);
  });

  it('does not bypass app navigations', () => {
    expect(shouldBypassServiceWorker('/')).toBe(false);
    expect(shouldBypassServiceWorker('/select-board')).toBe(false);
  });
});

describe('isPwaCacheableStaticPath', () => {
  it('allows hashed Next assets and public icons', () => {
    expect(isPwaCacheableStaticPath('/_next/static/chunks/app.js')).toBe(true);
    expect(isPwaCacheableStaticPath('/assets/icons/home.svg')).toBe(true);
    expect(isPwaCacheableStaticPath('/offline.html')).toBe(true);
    expect(isPwaCacheableStaticPath('/web-app-manifest-192x192.png')).toBe(true);
  });

  it('does not treat HTML routes as static cache', () => {
    expect(isPwaCacheableStaticPath('/')).toBe(false);
    expect(isPwaCacheableStaticPath('/planner/1/sprint/2')).toBe(false);
  });
});
