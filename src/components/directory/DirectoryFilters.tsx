import Link from 'next/link';
import type { AccountType, Emirate, LegalArea } from '@prisma/client';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, emirateLabel, legalAreaLabel } from '@/lib/i18n/labels';
import { EMIRATES, LEGAL_AREAS } from '@/lib/constants';
import type { DirectoryQuery } from '@/server/services/directory-service';
import {
  buttonClasses,
  Checkbox,
  ChipCheckbox,
  Field,
  Input,
  cx,
} from '@/components/ui/primitives';
import { countryName } from '@/lib/i18n/country-names';

type Facets = {
  areaCounts: Map<LegalArea, number>;
  emirateCounts: Map<Emirate, number>;
  /** Published listings by ISO alpha-2 country code. */
  countryCounts: Map<string, number>;
  kindCounts: Map<AccountType, number>;
  totalPublished: number;
};

/**
 * Directory filters.
 *
 * A plain GET form: it works with JavaScript disabled and every filter ends up
 * in the URL, so a filtered view can be bookmarked and shared. Counts are the
 * real number of published profiles in each category, and a category with no
 * profiles is not offered.
 */
export async function DirectoryFilters({
  query,
  facets,
}: {
  query: DirectoryQuery;
  facets: Facets;
}) {
  const { t } = await getI18n();
  const labels = t.publicPages.directoryFilters;
  const { effectiveLocale } = await getI18n();
  const selectedAreas = new Set(query.areas ?? []);
  const selectedEmirates = new Set(query.emirates ?? []);
  const selectedCountries = new Set(query.countries ?? []);
  // The emirate list is a question about the United Arab Emirates only, so it is
  // asked only when that is the country being looked at — or when no country has
  // been chosen and the emirates are still a fair way to narrow the results.
  const emiratesRelevant = selectedCountries.size === 0 || selectedCountries.has('AE');
  const countryCodes = [...facets.countryCounts.keys()].sort((a, b) =>
    countryName(effectiveLocale, a, a).localeCompare(countryName(effectiveLocale, b, b)),
  );
  const kindCount = (kind: AccountType) => facets.kindCounts.get(kind) ?? 0;

  return (
    <form method="get" action="/directory" className="space-y-6">
      <Field label={t.common.search} htmlFor="q" hint={labels.searchHint}>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query.q ?? ''}
          placeholder={labels.searchPlaceholder}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">{labels.whoFor}</legend>
        <div className="mt-2 space-y-2">
          {(
            [
              { value: 'ALL' as const, label: labels.lawyersAndFirms },
              { value: 'LAWYER' as const, label: accountTypeLabel(t, 'LAWYER') },
              { value: 'FIRM' as const, label: accountTypeLabel(t, 'FIRM') },
            ]
          ).map((option) => {
            const count = option.value === 'ALL' ? facets.totalPublished : kindCount(option.value);
            const checked = (query.kind ?? 'ALL') === option.value;
            return (
              <label
                key={option.value}
                htmlFor={`kind-${option.value}`}
                className={cx(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm',
                  'has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:font-medium has-checked:text-brand-800',
                  checked ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-slate-300',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    id={`kind-${option.value}`}
                    type="radio"
                    name="kind"
                    value={option.value}
                    defaultChecked={checked}
                    className="h-4 w-4 accent-brand-700"
                  />
                  {option.label}
                </span>
                <span className="text-xs text-slate-500">{count}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">{labels.areaOfLaw}</legend>
        <p className="mt-0.5 text-xs text-slate-500">{labels.areaHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGAL_AREAS.filter((area) => (facets.areaCounts.get(area.value) ?? 0) > 0).map((area) => (
            <ChipCheckbox
              key={area.value}
              id={`area-${area.value}`}
              name="areas"
              value={area.value}
              label={legalAreaLabel(t, area.value)}
              count={facets.areaCounts.get(area.value)}
              defaultChecked={selectedAreas.has(area.value)}
            />
          ))}
          {facets.areaCounts.size === 0 ? (
            <p className="text-xs text-slate-500">{labels.noAreas}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">{labels.country}</legend>
        <p className="mt-0.5 text-xs text-slate-500">{labels.countryHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {countryCodes.map((code) => (
            <ChipCheckbox
              key={code}
              id={`country-${code}`}
              name="countries"
              value={code}
              label={countryName(effectiveLocale, code, code)}
              count={facets.countryCounts.get(code)}
              defaultChecked={selectedCountries.has(code)}
            />
          ))}
          {countryCodes.length === 0 ? (
            <p className="text-xs text-slate-500">{labels.noCountries}</p>
          ) : null}
        </div>
      </fieldset>

      {emiratesRelevant ? (
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">{labels.emirate}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMIRATES.filter((emirate) => (facets.emirateCounts.get(emirate.value) ?? 0) > 0).map(
            (emirate) => (
              <ChipCheckbox
                key={emirate.value}
                id={`emirate-${emirate.value}`}
                name="emirates"
                value={emirate.value}
                label={emirateLabel(t, emirate.value)}
                count={facets.emirateCounts.get(emirate.value)}
                defaultChecked={selectedEmirates.has(emirate.value)}
              />
            ),
          )}
          {facets.emirateCounts.size === 0 ? (
            <p className="text-xs text-slate-500">{labels.noEmirates}</p>
          ) : null}
        </div>
      </fieldset>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">{labels.refine}</legend>
        <Checkbox
          id="verifiedOnly"
          name="verifiedOnly"
          label={t.directory.verifiedOnly}
          description={labels.verifiedOnlyHint}
          defaultChecked={query.verifiedOnly}
        />
        <Checkbox
          id="acceptsNewClients"
          name="acceptsNewClients"
          label={labels.acceptsNewClients}
          description={labels.acceptsNewClientsHint}
          defaultChecked={query.acceptsNewClients}
        />
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClasses('primary', 'md')}>
          {labels.apply}
        </button>
        <Link href="/directory" className={buttonClasses('secondary', 'md')}>
          {labels.clearAll}
        </Link>
      </div>
    </form>
  );
}
