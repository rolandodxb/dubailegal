'use client';

import { useState } from 'react';
import { PlacePicker } from './PlacePicker';
import { buttonClasses } from '@/components/ui/primitives';

/**
 * The further countries a professional offers to work in.
 *
 * The directory is worldwide, so a practice is not always in one country: a lawyer
 * qualified in Argentina and Spain answers to clients in both, and a firm with
 * offices in two places is one firm. Each added row is a country, a division within
 * it and the department beneath that — the same cascade as the primary place,
 * because it is the same question asked again.
 *
 * The rows are written into one hidden field as JSON rather than as repeated form
 * names. A repeatable fieldset would have to invent an index for every control
 * (`coverage[3][divisionCode]`), and renumbering them whenever a row is removed in
 * the middle is a class of bug worth not having.
 */
type Place = {
  countryCode: string;
  divisionCode: string;
  districtCode: string;
  locality: string;
};

export function CoverageList({
  countries,
  labels,
}: {
  countries: { code: string; name: string }[];
  labels: {
    heading: string;
    hint: string;
    add: string;
    remove: string;
    country: string;
    countryHint: string;
    division: string;
    divisionHint: string;
    district: string;
    districtHint: string;
    locality: string;
    localityHint: string;
    chooseCountry: string;
    chooseDivision: string;
    optional: string;
  };
}) {
  const [rows, setRows] = useState<Place[]>([]);

  const update = (index: number, patch: Partial<Place>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-800">{labels.heading}</p>
      <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>

      {/* What the server reads. Empty means "only the place above". */}
      <input type="hidden" name="coverage" value={rows.length > 0 ? JSON.stringify(rows) : ''} />

      {rows.length > 0 ? (
        <ul className="mt-4 space-y-6">
          {rows.map((row, index) => (
            <li key={index} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {labels.heading} {index + 1}
                </span>
                <button
                  type="button"
                  className={buttonClasses('ghost', 'sm')}
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                >
                  {labels.remove}
                </button>
              </div>
              <PlacePicker
                countries={countries}
                labels={{
                  country: labels.country,
                  countryHint: labels.countryHint,
                  division: labels.division,
                  divisionHint: labels.divisionHint,
                  district: labels.district,
                  districtHint: labels.districtHint,
                  locality: labels.locality,
                  localityHint: labels.localityHint,
                  chooseCountry: labels.chooseCountry,
                  chooseDivision: labels.chooseDivision,
                  optional: labels.optional,
                }}
                /* The rows above the first are not the record: they are read into
                   `coverage` by the JSON field, so their controls must not be named. */
                unnamed
                onPlaceChange={(place) => update(index, place)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className={buttonClasses('secondary', 'sm', 'mt-4')}
        onClick={() =>
          setRows((current) => [
            ...current,
            { countryCode: '', divisionCode: '', districtCode: '', locality: '' },
          ])
        }
      >
        {labels.add}
      </button>
    </div>
  );
}
