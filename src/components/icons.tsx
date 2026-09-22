import type { ReactNode } from 'react';

/**
 * Monochrome line icons.
 *
 * One geometry language throughout: a 24x24 box, 1.75px strokes, round caps and
 * joins, `fill="none"` and `stroke="currentColor"`. Because they inherit the
 * current colour they are black and white wherever they are used, and they never
 * look like a different product from one screen to the next.
 *
 * No emoji anywhere in the interface: emoji render differently on every
 * platform, cannot be aligned to a text baseline, and carry colour the design
 * does not control.
 */

const ICONS = {
  // ── Navigation ──────────────────────────────────────────────────────────
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  briefcase: (
    <>
      <path d="M3.5 8.5h17V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
      <path d="M9 8.5V6.5A2 2 0 0 1 11 4.5h2a2 2 0 0 1 2 2v2" />
      <path d="M3.5 13.5h17" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13h4l1.4 2.8h6.2L16.5 13h4" />
      <path d="M5.5 5h13l2 8v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-5z" />
    </>
  ),
  users: (
    <>
      <path d="M15.5 20.5v-1.7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1.7" />
      <circle cx="9.2" cy="7.8" r="3.4" />
      <path d="M16.8 14.9a4 4 0 0 1 3.7 4v1.6" />
      <path d="M16.2 4.6a3.4 3.4 0 0 1 0 6.5" />
    </>
  ),
  calendar: (
    <>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M4 11h16" />
      <path d="M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  star: (
    <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7.5 20v-8M12 20V6.5M16.5 20v-5.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  fileText: (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M9 13.5h6M9 16.5h4" />
    </>
  ),
  idCard: (
    <>
      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z" />
      <circle cx="9" cy="10.8" r="2.2" />
      <path d="M5.8 15.6a3.6 3.6 0 0 1 6.4 0" />
      <path d="M14.5 10h3.5M14.5 13.5h3.5" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3.2l7 2.9v5.4c0 4.2-2.9 7.7-7 8.8-4.1-1.1-7-4.6-7-8.8V6.1z" />
      <path d="M8.8 11.9l2.3 2.2 4.2-4.6" />
    </>
  ),
  lock: (
    <>
      <path d="M5.5 10.5h13A1.5 1.5 0 0 1 20 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V12a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8l4.7 4.7" />
    </>
  ),
  mail: (
    <>
      <path d="M3.5 6.5h17v11h-17z" />
      <path d="M3.8 7.2 12 13l8.2-5.8" />
    </>
  ),
  mailPlus: (
    <>
      <path d="M3.5 6.5h13v11h-13z" />
      <path d="M3.8 7.2 10 11.6l4.2-3" />
      <path d="M18 12.5v6M15 15.5h6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 16.5H6l1.4-2.3V10a4.6 4.6 0 0 1 9.2 0v4.2z" />
      <path d="M10.4 19.2a1.9 1.9 0 0 0 3.2 0" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4.2v15.3" />
      <path d="M6.5 7.5h11" />
      <path d="M6.5 7.5 4 13.2h5z" />
      <path d="M17.5 7.5 15 13.2h5z" />
      <path d="M9 20h6" />
    </>
  ),
  folder: (
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h3.7l2 2.5H19A1.5 1.5 0 0 1 20.5 10v8A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
  ),
  activity: <path d="M3 12.5h3.8l2.4-6.5 3.9 12 2.4-5.5H21" />,
  sliders: (
    <>
      <path d="M4 8.5h9M19 8.5h1" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M4 15.5h3M13 15.5h7" />
      <circle cx="10" cy="15.5" r="2.2" />
    </>
  ),
  send: (
    <>
      <path d="M21 3.5 3.5 10.8l7 2.7 2.7 7z" />
      <path d="M21 3.5 10.5 13.5" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M11 6l-6 6 6 6" />
      <path d="M5 12h14" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M13 6l6 6-6 6" />
      <path d="M19 12H5" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </>
  ),

  // ── Domain ──────────────────────────────────────────────────────────────
  mapPin: (
    <>
      <path d="M12 20.5s6-5.6 6-10.2a6 6 0 1 0-12 0c0 4.6 6 10.2 6 10.2z" />
      <circle cx="12" cy="10.2" r="2.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3 1.9" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.7 12h16.6" />
      <path d="M12 3.5c2.3 2.4 3.5 5.4 3.5 8.5S14.3 18.1 12 20.5c-2.3-2.4-3.5-5.4-3.5-8.5S9.7 5.9 12 3.5z" />
    </>
  ),
  phone: (
    <path d="M6.4 3.6h2.9l1.5 3.9-2 1.5a11.4 11.4 0 0 0 5.2 5.2l1.5-2 3.9 1.5v2.9a1.9 1.9 0 0 1-2.1 1.9A15.8 15.8 0 0 1 4.5 5.7a1.9 1.9 0 0 1 1.9-2.1z" />
  ),
  building: (
    <>
      <path d="M4 20.5V6.5A1.5 1.5 0 0 1 5.5 5h6A1.5 1.5 0 0 1 13 6.5v14" />
      <path d="M13 10.5h5.5A1.5 1.5 0 0 1 20 12v8.5" />
      <path d="M2.8 20.5h18.4" />
      <path d="M7 9h3M7 12.5h3M7 16h3M15.8 14h1.6M15.8 17.2h1.6" />
    </>
  ),
  check: <path d="M5 12.6l4.5 4.4L19 7.6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  video: (
    <>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h8.5A1.5 1.5 0 0 1 15 7.5v9A1.5 1.5 0 0 1 13.5 18H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M15 10.8l5-2.8v8l-5-2.8z" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6v5M12 16h.01" />
    </>
  ),
  creditCard: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v7A1.5 1.5 0 0 1 19.5 17h-15A1.5 1.5 0 0 1 3 15.5z" />
      <path d="M3 11h18" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3.6 20a6.6 6.6 0 0 1 12.8 0" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.4 12.3l2.5 2.4 4.7-5" />
    </>
  ),
  minus: <path d="M6 12h12" />,
  alertTriangle: (
    <>
      <path d="M12 4.2 20.6 19H3.4z" />
      <path d="M12 10v3.8M12 16.8h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v4.6M12 8.2h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4.5h10V9" />
      <path d="M5 9h14a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5h-2.5" />
      <path d="M7.5 17.5H5A1.5 1.5 0 0 1 3.5 16v-5.5A1.5 1.5 0 0 1 5 9" />
      <path d="M7.5 13.5h9v6h-9z" />
    </>
  ),
  message: (
    <>
      <path d="M4 5.5h16v11H9.5L4 20.5z" />
      <path d="M8.5 9.5h7M8.5 12.5h4.5" />
    </>
  ),
  lifeBuoy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M6 6l3.6 3.6M18 6l-3.6 3.6M6 18l3.6-3.6M18 18l-3.6-3.6" />
    </>
  ),
  phoneCall: (
    <>
      <path d="M5 4.5h3.2l1.6 4-2 1.4a11.5 11.5 0 0 0 5.3 5.3l1.4-2 4 1.6V18a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L4.5 17.5z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  arrowUp: <path d="M12 19V6m-6 6 6-6 6 6" />,
  arrowDown: <path d="M12 5v13m6-6-6 6-6-6" />,
  community: (
    <>
      <path d="M4 6.5h16v10H9l-5 4z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" />
    </>
  ),
  paperclip: (
    <>
      <path d="M20 11.5 12.2 19.3a4.9 4.9 0 0 1-6.9-6.9l8.3-8.3a3.3 3.3 0 0 1 4.6 4.6l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6.2v5.3c0 4 2.9 7.4 7 8.9 4.1-1.5 7-4.9 7-8.9V6.2z" />
      <path d="M9.3 12.2l1.9 1.9 3.6-3.9" />
    </>
  ),
  microphone: (
    <>
      <path d="M12 4.5a2.6 2.6 0 0 1 2.6 2.6v4.4a2.6 2.6 0 0 1-5.2 0V7.1A2.6 2.6 0 0 1 12 4.5z" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
      <path d="M12 17v3M9 20h6" />
    </>
  ),
  record: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Supply only when the icon carries meaning no adjacent text conveys. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}

/** A filled star for rating displays, where the fill itself carries meaning. */
export function StarIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z"
        fill="currentColor"
      />
    </svg>
  );
}
