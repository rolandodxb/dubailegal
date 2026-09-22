/**
 * Interaction check for the phone interface.
 *
 * The end-to-end suites fetch HTML, which proves what is rendered but cannot
 * prove what happens when somebody *taps* something. This drives a real headless
 * Chrome over the DevTools protocol and clicks the menu button, because the bug
 * it exists to catch was exactly that: the button looked right in the HTML and
 * did nothing on screen.
 *
 * It asserts:
 *   1. the menu button exists and is visible at phone width;
 *   2. tapping it opens a panel that is genuinely on screen — not merely present
 *      in the DOM, which is what a fixed-position panel trapped inside the
 *      header's backdrop-filter containing block would have been;
 *   3. the panel carries the grouped sections;
 *   4. there is no bottom navigation bar;
 *   5. tapping again closes it.
 *
 *   npm run ux:check            # against http://localhost:3100
 *   npm run ux:check -- <url>
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const BASE_URL = process.argv.find((arg) => arg.startsWith('http')) ?? 'http://localhost:3100';
const PORT = Number(process.env.UX_CHROME_PORT ?? 9333);
const PROFILE = '/tmp/dubai-legal-ux-profile';
const OUT_DIR = path.resolve('var/shots');

const PHONE = { width: 390, height: 844 };

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.info(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** A very small DevTools-protocol client: send, and wait for events. */
class Devtools {
  private socket: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private waiters = new Map<string, (params: unknown) => void>();

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }

  async open(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve(), { once: true });
      this.socket.addEventListener('error', () => reject(new Error('devtools socket failed')), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String((event as MessageEvent).data)) as {
        id?: number;
        method?: string;
        params?: unknown;
        result?: unknown;
        error?: { message: string };
      };
      if (message.id && this.pending.has(message.id)) {
        const entry = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      if (message.method && this.waiters.has(message.method)) {
        const waiter = this.waiters.get(message.method)!;
        this.waiters.delete(message.method);
        waiter(message.params);
      }
    });
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  event(name: string, timeoutMs = 15000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.waiters.set(name, resolve);
      setTimeout(() => {
        if (this.waiters.delete(name)) reject(new Error(`timed out waiting for ${name}`));
      }, timeoutMs);
    });
  }

  /** Evaluates an expression in the page and returns its value. */
  async evaluate<T>(expression: string): Promise<T> {
    const result = await this.send<{ result: { value: T } }>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result.value;
  }

  close(): void {
    this.socket.close();
  }
}

async function fetchJson(url: string): Promise<{ webSocketDebuggerUrl?: string }> {
  const response = await fetch(url);
  return (await response.json()) as { webSocketDebuggerUrl?: string };
}


/**
 * Whether a browser will give this origin the camera and the microphone.
 *
 * `getUserMedia` exists only in a *secure context*: HTTPS, or localhost. This
 * measures both the plain-HTTP LAN address and the HTTPS one, because the whole
 * point is that they differ — and that difference is why a video call worked on
 * this machine and failed on a phone.
 */
async function mediaSupport(devtools: Devtools, url: string): Promise<{
  secureContext: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
}> {
  const loaded = devtools.event('Page.loadEventFired');
  await devtools.send('Page.navigate', { url });
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 600));
  return devtools.evaluate(`
    ({
      secureContext: window.isSecureContext === true,
      mediaDevices: typeof navigator.mediaDevices !== 'undefined',
      getUserMedia: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    })
  `);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(PROFILE, { recursive: true, force: true });

  const chrome: ChildProcess = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      // The local certificate is self-signed. A browser shows a warning once and
      // then treats the origin as secure, which is exactly what the check wants
      // to measure.
      '--ignore-certificate-errors',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let devtools: Devtools | undefined;
  try {
    // Wait for the debugging endpoint to answer.
    let version: { webSocketDebuggerUrl?: string } = {};
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
        if (version.webSocketDebuggerUrl) break;
      } catch {
        // not up yet
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!version.webSocketDebuggerUrl) throw new Error('Chrome did not expose a debugging port');

    // A fresh page target of its own, so no session juggling is needed.
    const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = (await created.json()) as { webSocketDebuggerUrl?: string };
    if (!target.webSocketDebuggerUrl) throw new Error('could not open a page target');

    devtools = new Devtools(target.webSocketDebuggerUrl);
    await devtools.open();
    await devtools.send('Page.enable');
    await devtools.send('Runtime.enable');
    await devtools.send('Emulation.setDeviceMetricsOverride', {
      width: PHONE.width,
      height: PHONE.height,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await devtools.send('Emulation.setTouchEmulationEnabled', { enabled: true });

    const locale = process.env.UX_LOCALE;
    if (locale) {
      await devtools.send('Network.enable');
      await devtools.send('Network.setCookie', {
        name: 'dl_locale',
        value: locale,
        domain: 'localhost',
        path: '/',
      });
    }

    const loaded = devtools.event('Page.loadEventFired');
    await devtools.send('Page.navigate', { url: `${BASE_URL}/?tab=community` });
    await loaded;
    // The menu is a client component; give React a moment to attach.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    console.info(`\n── Phone interface at ${PHONE.width}×${PHONE.height} ${'─'.repeat(18)}`);

    const button = await devtools.evaluate<{ found: boolean; visible: boolean; expanded: string | null }>(`
      (() => {
        const el = document.querySelector('button[aria-controls="dl-mobile-menu"]');
        if (!el) return { found: false, visible: false, expanded: null };
        const box = el.getBoundingClientRect();
        return {
          found: true,
          visible: box.width > 0 && box.height > 0 && box.top >= 0,
          expanded: el.getAttribute('aria-expanded'),
        };
      })()
    `);
    check('the menu button is there at phone width', button.found);
    check('and is visible', button.visible);
    check('and starts closed', button.expanded === 'false');

    // Tap it, as a thumb would.
    await devtools.evaluate(`
      document.querySelector('button[aria-controls="dl-mobile-menu"]').click()
    `);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const opened = await devtools.evaluate<{
      present: boolean;
      onScreen: boolean;
      height: number;
      groups: string[];
      links: number;
      bottomBar: boolean;
      expanded: string | null;
    }>(`
      (() => {
        const panel = document.getElementById('dl-mobile-menu');
        const button = document.querySelector('button[aria-controls="dl-mobile-menu"]');
        if (!panel) return { present: false, onScreen: false, height: 0, groups: [], links: 0, bottomBar: false, expanded: button?.getAttribute('aria-expanded') ?? null };
        const box = panel.getBoundingClientRect();
        const groups = [...panel.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
        const links = panel.querySelectorAll('a').length;
        // A bottom navigation bar would sit at the bottom edge, full width.
        const bottomBar = [...document.querySelectorAll('nav')].some((nav) => {
          const r = nav.getBoundingClientRect();
          return r.width > 300 && Math.abs(r.bottom - window.innerHeight) < 4 && r.height > 30 && r.height < 90;
        });
        return {
          present: true,
          onScreen: box.height > 100 && box.top < window.innerHeight && box.width > 300,
          height: Math.round(box.height),
          groups,
          links,
          bottomBar,
          expanded: button?.getAttribute('aria-expanded') ?? null,
        };
      })()
    `);

    check('tapping it opens the panel', opened.present, 'no #dl-mobile-menu in the DOM');
    check(
      'and the panel is actually on screen, not just in the DOM',
      opened.onScreen,
      `height ${opened.height}px`,
    );
    check('the button reports itself expanded', opened.expanded === 'true');
    check('the panel carries grouped sections', opened.groups.length >= 2, opened.groups.join(' / '));
    check('with links to navigate by', opened.links >= 4, `${opened.links} links`);
    check('and there is no bottom navigation bar', !opened.bottomBar);

    const direction = await devtools.evaluate<string>(
      `document.documentElement.getAttribute('dir') ?? 'ltr'`,
    );
    if (locale) {
      console.info(`  language ${locale}, writing direction ${direction}`);
      check(
        `the page is laid out ${locale === 'ar' ? 'right to left' : 'left to right'} in ${locale}`,
        locale === 'ar' ? direction === 'rtl' : direction === 'ltr',
      );
    }

    const shot = await devtools.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
    const out = path.join(OUT_DIR, `menu-open-phone${locale ? `-${locale}` : ''}.png`);
    await writeFile(out, Buffer.from(shot.data, 'base64'));
    console.info(`  →  ${path.relative(process.cwd(), out)}`);

    // And closing it again.
    await devtools.evaluate(`
      document.querySelector('button[aria-controls="dl-mobile-menu"]').click()
    `);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const closed = await devtools.evaluate<boolean>(
      `document.getElementById('dl-mobile-menu') === null`,
    );
    check('tapping again closes it', closed);

    // ── Camera and microphone across origins ────────────────────────────────
    const secureUrl = process.env.UX_SECURE_URL;
    const insecureUrl = process.env.UX_INSECURE_URL;

    if (insecureUrl) {
      const media = await mediaSupport(devtools, insecureUrl);
      console.info(`\n── Camera access ${'─'.repeat(44)}`);
      console.info(`  ${insecureUrl}`);
      check(
        'plain HTTP on a network address is not a secure context',
        !media.secureContext,
      );
      check(
        'so the browser withholds the camera and microphone there',
        !media.getUserMedia,
        'getUserMedia was available, which would mean the media check is meaningless',
      );
    }

    if (secureUrl) {
      const media = await mediaSupport(devtools, secureUrl);
      console.info(`  ${secureUrl}`);
      check('HTTPS is a secure context', media.secureContext);
      check('and the camera and microphone are available', media.getUserMedia);
    }
  } finally {
    devtools?.close();
    chrome.kill('SIGKILL');
    await rm(PROFILE, { recursive: true, force: true }).catch(() => undefined);
  }

  console.info(`\n${'═'.repeat(62)}`);
  console.info(`  ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.error('\n  Failures:');
    for (const failure of failures) console.error(`   · ${failure}`);
  }
  console.info('═'.repeat(62));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('The interaction check crashed:', error);
  process.exitCode = 1;
});

export {};
