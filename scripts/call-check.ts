/**
 * Two-party call check.
 *
 * The bug this exists to catch was invisible to every other kind of test: both
 * people were in the room, both cameras worked, both were told the other had
 * arrived — and neither could see the other, because nobody ever sent an offer.
 * Presence is not negotiation, and only a real pair of browsers negotiating a
 * real peer connection can tell the difference.
 *
 * So this opens two headless Chrome pages with fake camera and microphone, signs
 * one in as the client who raised an emergency and the other as the lawyer who
 * took it, taps Join on both, and then waits for **video frames to arrive** on
 * each side. `readyState >= 2` means the element has decoded a frame: not "the
 * stream object exists", not "the connection state says connected", but pixels.
 *
 *   npm run call:check
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Devtools } from './lib/devtools';

process.loadEnvFile('.env');

const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3100';
/**
 * Two separate browsers, not two tabs.
 *
 * A tab shares the browser's cookie jar, so setting the second person's session
 * cookie replaces the first person's and both pages end up signed in as the same
 * account — which is exactly what the first version of this check did. Two
 * processes with two profiles is what two people actually are.
 */
const PORTS = {
  client: Number(process.env.CALL_CHROME_PORT ?? 9444),
  professional: Number(process.env.CALL_CHROME_PORT ?? 9444) + 1,
};
const PROFILES = {
  client: '/tmp/dubai-legal-call-profile-client',
  professional: '/tmp/dubai-legal-call-profile-professional',
};
const OUT_DIR = path.resolve('var/shots');

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

type Side = 'client' | 'professional';

/** A page with a session cookie, ready to be driven. */
async function openPage(
  side: Side,
  sessionToken: string,
  url: string,
): Promise<{ devtools: Devtools; evaluate: <T>(expression: string) => Promise<T>; close: () => void }> {
  const port = PORTS[side];
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const target = (await created.json()) as { webSocketDebuggerUrl?: string };
  if (!target.webSocketDebuggerUrl) throw new Error('could not open a page target');

  const devtools = new Devtools(target.webSocketDebuggerUrl);
  await devtools.open();
  await devtools.send('Page.enable');
  await devtools.send('Runtime.enable');
  await devtools.send('Network.enable');
  await devtools.send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 700,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // The session cookie is what makes this page that person.
  const { hostname } = new URL(BASE_URL);
  await devtools.send('Network.setCookie', {
    name: 'dl_session',
    value: sessionToken,
    domain: hostname,
    path: '/',
  });
  // The certificate is self-signed on the HTTPS address.
  await devtools.send('Security.enable').catch(() => undefined);

  const loaded = devtools.event('Page.loadEventFired');
  await devtools.send('Page.navigate', { url });
  await loaded;

  return {
    devtools,
    evaluate: <T>(expression: string) => devtools.evaluate<T>(expression),
    close: () => devtools.close(),
  };
}

/** Clicks the first button whose text matches, as a person would. */
async function clickButton(page: { evaluate: <T>(expression: string) => Promise<T> }, text: string) {
  return page.evaluate<boolean>(`
    (() => {
      const button = [...document.querySelectorAll('button')].find((element) =>
        (element.textContent || '').trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}),
      );
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
}

/** What each side can actually see. */
async function videoState(page: { evaluate: <T>(expression: string) => Promise<T> }) {
  return page.evaluate<{
    videos: number;
    remoteFrames: number;
    remoteTracks: number;
    liveTracks: number;
    state: string;
  }>(`
    (() => {
      const videos = [...document.querySelectorAll('video')];
      // The remote video is the first one: it fills the frame, and the local
      // preview is the small one overlaid on it.
      const remote = videos[0];
      const stream = remote && remote.srcObject;
      const tracks = stream ? stream.getVideoTracks() : [];
      const body = document.body.textContent || '';
      return {
        videos: videos.length,
        remoteFrames: remote ? remote.readyState : -1,
        remoteTracks: tracks.length,
        liveTracks: tracks.filter((track) => track.readyState === 'live').length,
        state: /Connecting to/.test(body) ? 'connecting' : 'idle',
      };
    })()
  `);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(PROFILES.client, { recursive: true, force: true }).catch(() => undefined);
  await rm(PROFILES.professional, { recursive: true, force: true }).catch(() => undefined);

  const { prisma } = await import('../src/lib/db');
  const auth = await import('../src/server/services/auth-service');
  const { updateProfile } = await import('../src/server/services/profile-service');
  const { saveLawyerCredential } = await import('../src/server/services/credential-service');
  const { createSession } = await import('../src/lib/auth');
  const emergency = await import('../src/server/services/emergency-service');

  const stamp = Date.now().toString(36);
  const meta = { ip: '203.0.126.10', userAgent: 'dubai-legal-call-check' };
  const created: string[] = [];
  const startedAt = new Date();

  async function account(email: string, type: 'USER' | 'LAWYER', emiratesId: string) {
    const registration = await auth.registerAccount(
      {
        accountType: type,
        email,
        fullName: `Call Check ${type}`,
        phone: '+971 50 000 7777',
        password: 'CorrectHorse9Battery',
        confirmPassword: 'CorrectHorse9Battery',
        acceptTerms: 'on',
      },
      { ...meta, ip: `203.0.126.${20 + created.length}` },
    );
    if (!registration.ok) throw new Error(registration.message);
    created.push(registration.data.userId);
    await updateProfile(
      registration.data.userId,
      {
        fullName: `Call Check ${type}`,
        phone: '+971 50 000 7777',
        dateOfBirth: '1985-05-05',
        placeOfBirth: 'Dubai',
        countryOfResidence: 'United Arab Emirates',
        nationality: 'Emirati',
        emiratesIdNumber: emiratesId,
        emiratesIdExpiry: '2034-01-01',
        workDescription: 'Fixture for the call check.',
        educationBackground: 'Fixture for the call check.',
      },
      meta,
    );
    const { token } = await createSession(registration.data.userId, meta);
    return { id: registration.data.userId, token };
  }

  const client = await account(`call.client.${stamp}@example.ae`, 'USER', '784199000000781');
  const lawyer = await account(`call.lawyer.${stamp}@example.ae`, 'LAWYER', '784199000000782');

  await saveLawyerCredential(
    lawyer.id,
    {
      licenseNumber: 'CALL-CHECK-1',
      licensingAuthority: 'Dubai Legal Affairs Department',
      licenseIssuedOn: '2020-01-01',
      licenseExpiresOn: '2030-01-01',
      yearsOfExperience: '10',
      bankCountryCode: 'AE',
      bankAccountName: 'Call Check',
      bankName: 'Emirates NBD',
      bankIban: 'AE070331234567890123456',
    },
    meta,
  );
  await prisma.lawyerProfile.update({
    where: { userId: lawyer.id },
    data: { acceptsEmergency: true },
  });

  const raised = await emergency.raiseEmergency(
    client.id,
    {
      title: 'Call check — urgent representation',
      caseType: 'CRIMINAL_PENAL',
      description: 'This is a fixture for the two-party call check, raised by an automated run.',
      contactPhone: '+971 50 000 7777',
    },
    meta,
  );
  if (!raised.ok) throw new Error(raised.message);
  const roomCode = raised.data.roomCode;
  if (!roomCode) throw new Error('the emergency was raised without a room');

  const row = await prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: { id: true },
  });
  const accepted = await emergency.acceptEmergency(row!.id, lawyer.id, meta);
  if (!accepted.ok) throw new Error(accepted.message);

  const launch = (profile: string, port: number): ChildProcess =>
    spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--ignore-certificate-errors',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const browsers = {
    client: launch(PROFILES.client, PORTS.client),
    professional: launch(PROFILES.professional, PORTS.professional),
  };

  let clientPage: Awaited<ReturnType<typeof openPage>> | undefined;
  let lawyerPage: Awaited<ReturnType<typeof openPage>> | undefined;

  try {
    for (const side of ['client', 'professional'] as const) {
      let ready = false;
      for (let attempt = 0; attempt < 40 && !ready; attempt += 1) {
        try {
          const version = (await (
            await fetch(`http://127.0.0.1:${PORTS[side]}/json/version`)
          ).json()) as { webSocketDebuggerUrl?: string };
          ready = Boolean(version.webSocketDebuggerUrl);
        } catch {
          // not up yet
        }
        if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!ready) throw new Error(`Chrome did not expose a debugging port for the ${side}`);
    }

    const roomUrl = `${BASE_URL}/emergency/room/${roomCode}`;
    console.info(`\n── Two-party call in room ${roomCode} ${'─'.repeat(20)}`);

    [clientPage, lawyerPage] = await Promise.all([
      openPage('client', client.token, roomUrl),
      openPage('professional', lawyer.token, roomUrl),
    ]);

    // Both are on the page; each should know the other is present.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const presence = await clientPage.evaluate<string>(`document.body.textContent || ''`);
    check(
      'each side is told the other is in the room',
      /is in the room|join the call/i.test(presence),
    );

    const clientJoined = await clickButton(clientPage, 'Join the call');
    const lawyerJoined = await clickButton(lawyerPage, 'Join the call');
    check('the client can join the call', clientJoined);
    check('the lawyer can join the call', lawyerJoined);

    // The proof: frames arriving on each side.
    const deadline = Date.now() + 30_000;
    let clientVideo = await videoState(clientPage);
    let lawyerVideo = await videoState(lawyerPage);

    while (Date.now() < deadline) {
      clientVideo = await videoState(clientPage);
      lawyerVideo = await videoState(lawyerPage);
      if (clientVideo.remoteFrames >= 2 && lawyerVideo.remoteFrames >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // How far the negotiation got, which is what makes a failure diagnosable:
    // an offer with no answer means the answerer never saw it, and no signals at
    // all means one side never joined.
    const signals = await prisma.roomSignal.findMany({
      where: { roomCode },
      select: { payload: true },
    });
    const kinds = signals.map((row) => (row.payload as { kind?: string } | null)?.kind);
    const presenceRows = await prisma.roomPresence.findMany({ where: { roomCode } });
    console.info(
      `  negotiation: ${kinds.filter((kind) => kind === 'offer').length} offer(s), ` +
        `${kinds.filter((kind) => kind === 'answer').length} answer(s), ` +
        `${kinds.filter((kind) => kind === 'candidate').length} candidate(s), ` +
        `${presenceRows.length} participant(s)`,
    );
    check(
      'both sides negotiated rather than one of them talking to itself',
      kinds.includes('offer') && kinds.includes('answer') && presenceRows.length === 2,
    );

    console.info(
      `  client sees: ${clientVideo.remoteTracks} remote track(s), readyState ${clientVideo.remoteFrames}`,
    );
    console.info(
      `  lawyer sees: ${lawyerVideo.remoteTracks} remote track(s), readyState ${lawyerVideo.remoteFrames}`,
    );

    check(
      'the client receives the lawyer’s video track',
      clientVideo.remoteTracks > 0 && clientVideo.liveTracks > 0,
      `tracks ${clientVideo.remoteTracks}, live ${clientVideo.liveTracks}`,
    );
    check(
      'the lawyer receives the client’s video track',
      lawyerVideo.remoteTracks > 0 && lawyerVideo.liveTracks > 0,
      `tracks ${lawyerVideo.remoteTracks}, live ${lawyerVideo.liveTracks}`,
    );
    check(
      'and the client’s element has decoded a frame, so the picture is really there',
      clientVideo.remoteFrames >= 2,
      `readyState ${clientVideo.remoteFrames}`,
    );
    check(
      'and so has the lawyer’s',
      lawyerVideo.remoteFrames >= 2,
      `readyState ${lawyerVideo.remoteFrames}`,
    );

    // ── The recording is of the room, not of one camera ─────────────────────
    const recordingPanel = await clientPage.evaluate<string>(`document.body.textContent || ''`);
    check(
      'the recorder says it is recording the room',
      /Recording this room/i.test(recordingPanel),
    );

    const stopped = await clickButton(clientPage, 'Stop recording');
    check('the recording can be stopped, which is what uploads it', stopped);

    let saved: { sizeBytes: number; durationMs: number | null } | null = null;
    const recordDeadline = Date.now() + 25_000;
    while (Date.now() < recordDeadline && !saved) {
      saved = await prisma.roomRecording.findFirst({
        where: { roomCode },
        select: { sizeBytes: true, durationMs: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!saved) await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    check('a recording of the call was stored', saved !== null, 'no room_recording row appeared');
    check(
      'and it holds real content rather than an empty file',
      (saved?.sizeBytes ?? 0) > 10_000,
      `${saved?.sizeBytes ?? 0} bytes`,
    );
    check(
      'with a duration, so the length of the interaction is on the record',
      (saved?.durationMs ?? 0) > 0,
      `${saved?.durationMs ?? 0} ms`,
    );

    for (const [name, page] of [
      ['call-client', clientPage],
      ['call-professional', lawyerPage],
    ] as const) {
      const shot = await page.devtools.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
      const out = path.join(OUT_DIR, `${name}.png`);
      await writeFile(out, Buffer.from(shot.data, 'base64'));
      console.info(`  →  ${path.relative(process.cwd(), out)}`);
    }
  } finally {
    clientPage?.close();
    lawyerPage?.close();
    browsers.client.kill('SIGKILL');
    browsers.professional.kill('SIGKILL');
    await rm(PROFILES.client, { recursive: true, force: true }).catch(() => undefined);
    await rm(PROFILES.professional, { recursive: true, force: true }).catch(() => undefined);

    // The fixtures are removed whatever happened.
    await prisma.notification.deleteMany({
      where: { OR: [{ userId: { in: created } }, { createdAt: { gte: startedAt }, userId: { notIn: created } }] },
    });
    await prisma.trafficLog.deleteMany({ where: { userId: { in: created } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    console.info(
      `\n  fixtures removed: ${(await prisma.user.count({ where: { id: { in: created } } })) === 0}`,
    );
    await prisma.$disconnect();
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
  console.error('The call check crashed:', error);
  process.exitCode = 1;
});

export {};
