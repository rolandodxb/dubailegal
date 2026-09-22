'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { cx } from '@/components/ui/primitives';

export type MenuGroup = {
  title: string;
  items: { href: string; label: string; icon: IconName; badge?: number; description?: string }[];
};

/**
 * The phone menu.
 *
 * On a narrow screen the header cannot hold everything, so the options are
 * gathered behind one button and grouped: what a visitor can explore, and what
 * belongs to their own account. Each row is a full-width target at least 48px
 * tall, which is what a thumb actually hits.
 *
 * It closes on navigation, on the back gesture (the pathname changing), on a
 * press outside, and on Escape — and it is a real `<button>` with `aria-expanded`
 * so it is usable by keyboard and readable by a screen reader.
 */
export function MobileMenu({
  groups,
  label = 'Menu',
  signOut,
}: {
  groups: MenuGroup[];
  label?: string;
  /** The sign-out server action, rendered as a form: leaving is a POST. */
  signOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Any navigation closes it: the menu should never be left open behind a page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // The page behind a full-screen menu must not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="dl-mobile-menu"
        aria-label={open ? 'Close menu' : label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 sm:hidden"
      >
        <Icon name={open ? 'x' : 'menu'} size={22} />
      </button>

      {open ? (
        <div className="fixed inset-0 top-16 z-40 sm:hidden" role="dialog" aria-modal="true" id="dl-mobile-menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="dl-safe-bottom absolute inset-x-0 top-0 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white shadow-xl">
            <nav className="px-4 py-4" aria-label="All sections">
              {groups.map((group) => (
                <div key={group.title} className="mb-5 last:mb-1">
                  <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={`${group.title}-${item.href}-${item.label}`}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cx(
                              'flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5',
                              active ? 'bg-brand-50 text-brand-900' : 'text-slate-800 active:bg-slate-100',
                            )}
                          >
                            <Icon name={item.icon} size={19} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium">
                                {item.label}
                              </span>
                              {item.description ? (
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {item.badge && item.badge > 0 ? (
                              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold tabular-nums text-white">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            ) : (
                              <Icon name="chevronDown" size={16} className="-rotate-90 text-slate-300" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {signOut ? (
                <form action={signOut} className="mt-1">
                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-red-700 active:bg-red-50"
                  >
                    <Icon name="logout" size={19} />
                    Sign out
                  </button>
                </form>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
