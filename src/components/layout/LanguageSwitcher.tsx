import { setLocaleAction } from '@/app/actions/locale-actions';
import { LOCALES, type Locale } from '@/lib/i18n/locales';
import { cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * The language selector: one control that opens, not four buttons in a row.
 *
 * A `<details>` disclosure rather than a scripted dropdown, for three reasons: it
 * opens without JavaScript, it is keyboard- and screen-reader-native (the browser
 * announces it as expandable), and it closes on a second tap with no state to
 * manage. Four buttons sitting open in the header competed with the navigation
 * for exactly the space the navigation needed.
 *
 * Each language is written in its own script, because a list that says "Arabic"
 * to somebody who reads Arabic is a list written for the wrong person.
 */
export function LanguageSwitcher({
  current,
  label,
  variant = 'menu',
}: {
  current: Locale;
  label: string;
  /**
   * `menu` fills the phone menu, `sidebar` fills the desktop column, `compact`
   * sits in the header as a dropdown.
   */
  variant?: 'menu' | 'compact' | 'sidebar';
}) {
  const active = LOCALES.find((entry) => entry.code === current) ?? LOCALES[0];
  const compact = variant === 'compact';
  const full = variant !== 'compact';

  return (
    <details className="dl-disclosure group relative">
      <summary
        className={cx(
          'flex items-center gap-2 rounded-lg text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100',
          compact ? 'min-h-9 px-2.5' : 'min-h-11 w-full px-2.5',
        )}
        aria-label={label}
      >
        <Icon name="globe" size={17} />
        <span className={compact ? 'hidden sm:inline' : 'inline'}>{active.native}</span>
        {full && variant === 'sidebar' ? null : null}
        <Icon name="chevronDown" size={15} className="dl-disclosure-icon text-slate-400" />
      </summary>

      <form
        action={setLocaleAction}
        className={cx(
          'z-50 rounded-xl border border-slate-200 bg-white p-1 shadow-lg',
          compact ? 'absolute end-0 mt-1 w-44' : 'mt-1',
        )}
      >
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {LOCALES.map((locale) => {
          const isActive = locale.code === current;
          return (
            <button
              key={locale.code}
              type="submit"
              name="locale"
              value={locale.code}
              disabled={!locale.ready}
              title={locale.ready ? undefined : `${locale.english} — coming soon`}
              lang={locale.code}
              aria-current={isActive ? 'true' : undefined}
              className={cx(
                'flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start text-sm',
                isActive
                  ? 'bg-brand-50 font-semibold text-brand-900'
                  : locale.ready
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'cursor-not-allowed text-slate-400',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{locale.native}</span>
              {isActive ? <Icon name="check" size={16} /> : null}
              {!locale.ready ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  soon
                </span>
              ) : null}
            </button>
          );
        })}
      </form>
    </details>
  );
}
