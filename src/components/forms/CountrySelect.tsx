'use client';

import { useMemo, useState } from 'react';
import { ALL_COUNTRIES } from '@/lib/countries';
import { Input } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * A country picker over the whole world.
 *
 * A `<select>` with every country is usable but unpleasant — two hundred entries
 * and no way to search — so this is a search box over a list: type a few letters,
 * tap the country. It falls back to the whole list when the query is empty, and
 * says so when nothing matches rather than showing a blank panel.
 *
 * The value posted is the two-letter ISO code, which is what the verification
 * rules are written against.
 *
 * `names` is an optional map from code to a localised label. Where it has an
 * entry it is both shown and searched, so a reader can type the country in their
 * own language; where it does not, the English name is used exactly as before.
 */
export function CountrySelect({
  id,
  name,
  defaultValue = '',
  label,
  hint,
  required = false,
  error,
  placeholder = 'Search for a country…',
  emptyOption = 'Not specified',
  onChange,
  names,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  emptyOption?: string;
  /** Told the chosen code, so a caller can react to the country. */
  onChange?: (code: string) => void;
  names?: Record<string, string>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(defaultValue);
  const choose = (code: string) => {
    setSelected(code);
    onChange?.(code);
  };
  const [open, setOpen] = useState(false);

  const labelFor = (country: (typeof ALL_COUNTRIES)[number]) =>
    names?.[country.code] ?? country.name;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter((country) => {
      const label = names?.[country.code] ?? country.name;
      return label.toLowerCase().includes(needle) || country.name.toLowerCase().includes(needle);
    });
  }, [query, names]);

  const selectedCountry = ALL_COUNTRIES.find((country) => country.code === selected);
  const selectedName = selectedCountry ? labelFor(selectedCountry) : '';

  return (
    <div>
      <label htmlFor={`${id}-search`} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? (
          <span className="ms-1 text-brand-700" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}

      {/* What is actually submitted. */}
      <input type="hidden" name={name} value={selected} />

      <div className="mt-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-start text-sm ${
            error ? 'border-red-400' : 'border-slate-300'
          }`}
        >
          <Icon name="globe" size={16} className="shrink-0 text-slate-400" />
          <span className={`min-w-0 flex-1 truncate ${selectedName ? 'text-slate-900' : 'text-slate-400'}`}>
            {selectedName || emptyOption}
          </span>
          <Icon name="chevronDown" size={16} className="shrink-0 text-slate-400" />
        </button>
      </div>

      {open ? (
        <div className="mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <Input
            id={`${id}-search`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            aria-label={placeholder}
          />
          <ul className="mt-2 max-h-64 overflow-y-auto overscroll-contain" role="listbox">
            {matches.length === 0 ? (
              <li className="px-2 py-3 text-sm text-slate-500">No country matches that.</li>
            ) : (
              matches.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.code === selected}
                    onClick={() => {
                      choose(country.code);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start text-sm ${
                      country.code === selected
                        ? 'bg-brand-50 font-semibold text-brand-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {names?.[country.code] ?? country.name}
                    </span>
                    {country.nationalId ? (
                      <span className="shrink-0 text-[11px] text-slate-400">{country.nationalId}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
