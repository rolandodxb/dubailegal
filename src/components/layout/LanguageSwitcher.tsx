import { setLocaleAction } from '@/app/actions/locale-actions';
import { LOCALES, type Locale } from '@/lib/i18n/locales';
import { cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * The language switch.
 *
 * A form with a button per language rather than a dropdown, so it works with
 * JavaScript off and needs no client state: tapping a language posts the choice
 * and the page comes back in that language. Each name is written in its own
 * script, because a list that says "Arabic" to somebody who reads Arabic is a
 * list written for the wrong person.
 */
export function LanguageSwitcher({
  current,
  label,
  variant = 'inline',
}: {
  current: Locale;
  label: string;
  /** `inline` sits in a row; `stacked` fills the width of the phone menu. */
  variant?: 'inline' | 'stacked';
}) {
  const stacked = variant === 'stacked';

  return (
    <form action={setLocaleAction} className={stacked ? 'w-full' : 'inline-block'}>
      <p
        className={cx(
          'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400',
          stacked ? 'px-1 pb-1' : 'sr-only',
        )}
      >
        <Icon name="globe" size={14} />
        {label}
      </p>
      <div className={cx('flex flex-wrap gap-1', stacked && 'flex-col gap-0.5')} role="group" aria-label={label}>
        {LOCALES.map((locale) => {
          const active = locale.code === current;
          return (
            <button
              key={locale.code}
              type="submit"
              name="locale"
              value={locale.code}
              lang={locale.code}
              aria-current={active ? 'true' : undefined}
              className={cx(
                'rounded-lg text-sm font-medium transition-colors',
                stacked
                  ? 'flex min-h-12 w-full items-center gap-3 px-3 text-start'
                  : 'min-h-9 px-2.5 text-[13px]',
                active
                  ? stacked
                    ? 'bg-brand-50 text-brand-900'
                    : 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {stacked ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{locale.native}</span>
                  {active ? <Icon name="check" size={16} /> : null}
                </>
              ) : (
                locale.native
              )}
            </button>
          );
        })}
      </div>
    </form>
  );
}
