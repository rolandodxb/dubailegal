import Link from 'next/link';
import { cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import type { Dictionary } from '@/lib/i18n';



/**
 * The landing page's tabs.
 *
 * Plain links rather than a client-side tab widget: they work with JavaScript
 * off, they can be shared and bookmarked, and the page behind them is rendered on
 * the server — which is what keeps the community tab as quick as any other page.
 */
export function LandingTabs({ active, t }: { active: string; t: Dictionary }) {
  const TABS = [
    { value: 'home', label: t.tabs.home, href: '/', icon: 'home' as const },
    { value: 'community', label: t.tabs.community, href: '/?tab=community', icon: 'community' as const },
  ];

  return (
    <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
      <nav className="dl-container flex items-center gap-1 py-2" aria-label={t.tabs.home}>
        {TABS.map((tab) => {
          const current = tab.value === active;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              aria-current={current ? 'page' : undefined}
              className={cx(
                'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors sm:flex-none',
                current
                  ? 'bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon name={tab.icon} size={17} />
              {tab.label}
            </Link>
          );
        })}
        <Link
          href="/blog"
          className="ml-auto hidden min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex"
        >
          {t.tabs.allBoards}
          <Icon name="arrowRight" size={16} className="rtl:rotate-180" />
        </Link>
      </nav>
    </div>
  );
}
