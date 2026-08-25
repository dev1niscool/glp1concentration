'use client';

import { useEffect, useState } from 'react';

const DISMISSAL_KEY = 'glp1-home-screen-prompt-dismissed-at';
const DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 15_000;

export function IPhoneInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const isIPhone = /iPhone/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = navigatorWithStandalone.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    let recentlyDismissed = false;
    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISSAL_KEY));
      recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISSAL_TTL_MS;
    } catch {
      recentlyDismissed = false;
    }

    if (!isIPhone || !isSafari || isStandalone || recentlyDismissed) return;

    const timeout = window.setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    } catch {
      // The prompt still closes when browser storage is unavailable.
    }
  }

  if (!visible) return null;

  return (
    <aside className="iphone-install-prompt" aria-label="Save this site to your iPhone Home Screen">
      <button type="button" onClick={dismiss} aria-label="Dismiss Home Screen suggestion">×</button>
      <strong>Save to your Home Screen</strong>
      <p>Tap the three dots at the bottom right, choose Share, then <b>Add to Home Screen</b>.</p>
      <span aria-hidden="true" />
    </aside>
  );
}
