import { env } from './env';

/**
 * The ICE servers a browser should use for a call.
 *
 * Built on the server for two reasons: credentials for a TURN relay must not be
 * baked into the client bundle at build time, and a relay can then be added by
 * setting a variable rather than by rebuilding the application.
 *
 * STUN alone is enough for two devices on the same network. A phone on mobile
 * data talking to a laptop behind a router needs the relay: neither can accept a
 * direct connection, so without it the call sits at "connecting" and then gives
 * up. That is the difference between "it works at my desk" and "it works".
 */
export function iceServersForClient(): { urls: string; username?: string; credential?: string }[] {
  const servers: { urls: string; username?: string; credential?: string }[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (env.turnUrl) {
    servers.push({
      urls: env.turnUrl,
      ...(env.turnUsername ? { username: env.turnUsername } : {}),
      ...(env.turnCredential ? { credential: env.turnCredential } : {}),
    });
  }

  return servers;
}
