'use client';

import { useState } from 'react';
import { initials } from '@/lib/format';
import { cx } from './ui/primitives';

/**
 * Profile picture with an initials fallback.
 *
 * The photo is served through /api/avatar/[userId] rather than from a public
 * directory, because profile photos live in the same private store as identity
 * documents. That route decides who may see it — and it refuses people who have
 * no reason to be shown the photo.
 *
 * The fallback is therefore not decoration. A refused or missing photo used to
 * render as a broken-image icon, because an `<img>` with a source that answers
 * 404 has nothing else to show. Any failure — a refusal, a photo that was never
 * uploaded, a connection that dropped — now degrades to the person's initials,
 * which is what the component shows when there is no photo at all.
 */
export function Avatar({
  userId,
  name,
  hasPhoto,
  size = 48,
  shape = 'circle',
  className,
}: {
  userId: string;
  name: string;
  hasPhoto: boolean;
  size?: number;
  /** Organisations read better as a rounded square; people as a circle. */
  shape?: 'circle' | 'rounded';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  if (hasPhoto && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${userId}`}
        alt=""
        style={dimension}
        onError={() => setFailed(true)}
        className={cx('shrink-0 object-cover ring-1 ring-slate-200', radius, className)}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center bg-slate-100 font-semibold text-slate-600 ring-1 ring-slate-200',
        radius,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
