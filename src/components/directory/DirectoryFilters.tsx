import Link from 'next/link';
import type { AccountType, Emirate, LegalArea } from '@prisma/client';
import { EMIRATES, LEGAL_AREAS, ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import type { DirectoryQuery } from '@/server/services/directory-service';
import {
  buttonClasses,
  Checkbox,
  ChipCheckbox,
  Field,
  Input,
  cx,
} from '@/components/ui/primitives';

type Facets = {
  areaCounts: Map<LegalArea, number>;
  emirateCounts: Map<Emirate, number>;
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
export function DirectoryFilters({
  query,
  facets,
}: {
  query: DirectoryQuery;
  facets: Facets;
}) {
  const selectedAreas = new Set(query.areas ?? []);
  const selectedEmirates = new Set(query.emirates ?? []);
  const kindCount = (kind: AccountType) => facets.kindCounts.get(kind) ?? 0;

  return (
    <form method="get" action="/directory" className="space-y-6">
      <Field label="Search" htmlFor="q" hint="Matches a name, headline or description.">
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query.q ?? ''}
          placeholder="e.g. arbitration, Al Habtoor, family law"
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Who are you looking for?</legend>
        <div className="mt-2 space-y-2">
          {(
            [
              { value: 'ALL' as const, label: 'Lawyers and firms' },
              { value: 'LAWYER' as const, label: ACCOUNT_TYPE_LABEL.LAWYER },
              { value: 'FIRM' as const, label: ACCOUNT_TYPE_LABEL.FIRM },
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
        <legend className="text-sm font-medium text-slate-800">Area of law</legend>
        <p className="mt-0.5 text-xs text-slate-500">Select any number. Leave clear to include all.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEGAL_AREAS.filter((area) => (facets.areaCounts.get(area.value) ?? 0) > 0).map((area) => (
            <ChipCheckbox
              key={area.value}
              id={`area-${area.value}`}
              name="areas"
              value={area.value}
              label={area.label}
              count={facets.areaCounts.get(area.value)}
              defaultChecked={selectedAreas.has(area.value)}
            />
          ))}
          {facets.areaCounts.size === 0 ? (
            <p className="text-xs text-slate-500">
              No published profile has listed an area of law yet.
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Emirate</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMIRATES.filter((emirate) => (facets.emirateCounts.get(emirate.value) ?? 0) > 0).map(
            (emirate) => (
              <ChipCheckbox
                key={emirate.value}
                id={`emirate-${emirate.value}`}
                name="emirates"
                value={emirate.value}
                label={emirate.label}
                count={facets.emirateCounts.get(emirate.value)}
                defaultChecked={selectedEmirates.has(emirate.value)}
              />
            ),
          )}
          {facets.emirateCounts.size === 0 ? (
            <p className="text-xs text-slate-500">
              No published profile has listed an emirate yet.
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">Refine</legend>
        <Checkbox
          id="verifiedOnly"
          name="verifiedOnly"
          label="Verified members only"
          description="Show only profiles whose documents have been approved by a reviewer."
          defaultChecked={query.verifiedOnly}
        />
        <Checkbox
          id="acceptsNewClients"
          name="acceptsNewClients"
          label="Accepting new clients"
          description="Hide members who have said they are not taking new instructions."
          defaultChecked={query.acceptsNewClients}
        />
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClasses('primary', 'md')}>
          Apply filters
        </button>
        <Link href="/directory" className={buttonClasses('secondary', 'md')}>
          Clear all
        </Link>
      </div>
    </form>
  );
}
