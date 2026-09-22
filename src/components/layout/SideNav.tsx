'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/icons';
import { cx } from '@/components/ui/primitives';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Unread or outstanding count shown as a small counter. */
  badge?: number;
};

function Counter({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold tabular-nums text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * The desktop sidebar. Hidden below 640px, where the header's menu button takes
 * over and carries the same entries — grouped, because a phone menu is a list
 * rather than a column.
 */
export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="hidden sm:block">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className={active ? 'text-slate-900' : 'text-slate-500'}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge && item.badge > 0 ? <Counter count={item.badge} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
