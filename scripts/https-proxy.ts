/**
 * HTTPS for the local network.
 *
 * A browser only grants a page access to the camera and the microphone in a
 * *secure context*: `https://…` or `http://localhost`. That is why a video call
 * works when the app is opened at `http://localhost:3100` and fails with
 * "camera and microphone could not be opened" at `http://192.168.1.85:3100` —
 * the address a phone has to use. A service worker, and therefore installing the
 * app, is refused for the same reason.
 *
 * This is a small TLS terminator in front of the application: it listens on 3443
 * with a certificate that names the LAN address, and forwards to the app on 3100,
 * announcing the real protocol in `x-forwarded-proto` so the session cookie is
 * marked Secure exactly when it should be.
 *
 *   npm run https
 *
 * The certificate is self-signed, so each device shows a warning once; after
 * accepting it the origin counts as secure and the camera works. To remove the
 * warning, issue the certificate from a local authority the device trusts
 * (`mkcert -install` on the device, then `mkcert 192.168.1.85`) and point
 * TLS_CERT/TLS_KEY at it.
 */

import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.HTTPS_PORT ?? 3443);
const TARGET_PORT = Number(process.env.HTTPS_TARGET_PORT ?? 3100);
const HOST = process.env.HTTPS_HOST ?? '0.0.0.0';
const CERT = process.env.TLS_CERT ?? 'var/tls/cert.pem';
const KEY = process.env.TLS_KEY ?? 'var/tls/key.pem';

for (const file of [CERT, KEY]) {
  if (!existsSync(path.resolve(file))) {
    console.error(
      `\n  Missing ${file}.\n\n` +
        `  Create a certificate that names this machine's address:\n\n` +
        `    mkdir -p var/tls && openssl req -x509 -newkey rsa:2048 -nodes -days 825 \\\n` +
        `      -keyout var/tls/key.pem -out var/tls/cert.pem \\\n` +
        `      -subj "/CN=Legal Dash (local)" \\\n` +
        `      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:<this machine>"\n`,
    );
    process.exit(1);
  }
}

const server = createServer({ cert: readFileSync(path.resolve(CERT)), key: readFileSync(path.resolve(KEY)) }, (req, res) => {
  const headers = { ...req.headers, 'x-forwarded-proto': 'https', 'x-forwarded-for': req.socket.remoteAddress ?? '' };
  // The app's own notion of its address stays whatever APP_URL says; the Host
  // header is passed through so a redirect or a cookie is never confused.
  const upstream = httpRequest(
    { host: '127.0.0.1', port: TARGET_PORT, method: req.method, path: req.url, headers },
    (proxied) => {
      res.writeHead(proxied.statusCode ?? 502, proxied.headers);
      proxied.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`The application did not answer on port ${TARGET_PORT}: ${error.message}\n`);
  });

  // Server-sent events (the call signalling and the room stream) must not be
  // buffered: they have to reach the browser as they are written.
  res.setHeader('X-Accel-Buffering', 'no');
  req.pipe(upstream);
});

server.listen(PORT, HOST, () => {
  console.info(`  HTTPS on https://<this machine>:${PORT}  →  http://127.0.0.1:${TARGET_PORT}`);
});

export {};
