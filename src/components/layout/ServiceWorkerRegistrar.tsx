'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on every page.
 *
 * Two things depend on it: an installed app opening without a network, and the
 * browser offering to install the app at all — Chrome will not show that offer
 * until a worker is registered and handling fetches. Push notifications register
 * it too, but waiting for somebody to switch those on would mean the app is not
 * installable until they do.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Once the page is interactive, so registering never delays anything.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
