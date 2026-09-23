'use client';

import { useEffect, useState } from 'react';
import { Field, Input, Select } from '@/components/ui/primitives';
import { emirateOfDivision } from '@/lib/geo-emirates';

/**
 * Where a professional works, asked the way the country they chose asks it.
 *
 * The directory is worldwide, so "which emirate" is not a question that can be
 * put to everybody: a lawyer in Argentina answers with a province and then a
 * department, one in Japan with a prefecture, one in Egypt with a governorate.
 * The cascade follows the country:
 *
 *   country  →  its first-level divisions  →  the divisions beneath those
 *
 * The lists are fetched from `/api/geo/divisions` when a choice is made, because
 * the whole world's second level is 47,000 entries — sending that to every visitor
 * so they can pick one department would be absurd.
 *
 * Nothing here assumes the United Arab Emirates, but it does not forget them
 * either: when the country is `AE` the chosen division is also submitted as
 * `primaryEmirate`, so the emirate column, the emirate filter and every receipt
 * written before the platform went worldwide keep working unchanged.
 */

type Division = { code: string; name: string };
type Place = { countryCode: string; divisionCode: string; districtCode: string; locality: string };
type Country = { code: string; name: string };

export function PlacePicker({
  countries,
  defaultCountry = '',
  defaultDivision = '',
  defaultDistrict = '',
  defaultLocality = '',
  labels,
  errors,
  onCountryChange,
  unnamed = false,
  onPlaceChange,
}: {
  countries: Country[];
  defaultCountry?: string;
  defaultDivision?: string;
  defaultDistrict?: string;
  defaultLocality?: string;
  labels: {
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
  errors?: { country?: string; division?: string };
  /** Told to the form so it can show the UAE-only fields only for the UAE. */
  onCountryChange?: (code: string) => void;
  /** True when the caller reads these values itself — a repeatable row, say. */
  unnamed?: boolean;
  /** Told the whole place whenever any part of it changes. */
  onPlaceChange?: (place: Place) => void;
}) {
  const [country, setCountry] = useState(defaultCountry);
  const [division, setDivision] = useState(defaultDivision);
  const [district, setDistrict] = useState(defaultDistrict);
  const [locality, setLocality] = useState(defaultLocality);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<Division[]>([]);
  const [divisionLabel, setDivisionLabel] = useState<string>(labels.division);
  const [districtLabel, setDistrictLabel] = useState<string>(labels.district);
  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // The first-level list for the chosen country. Re-fetched whenever the country
  // changes, because one country's provinces mean nothing in another.
  useEffect(() => {
    if (!country) {
      setDivisions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/geo/divisions?country=${encodeURIComponent(country)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { divisions?: Division[]; label?: string } | null) => {
        if (cancelled || !body) return;
        setDivisions(body.divisions ?? []);
        if (body.label) setDivisionLabel(body.label);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    onCountryChange?.(country);
  }, [country, onCountryChange]);

  /**
   * Tells the caller what the place now is.
   *
   * Called from the handlers rather than from an effect. An effect that depends on
   * a callback the parent recreates on every render is a loop: the callback changes,
   * the effect runs, the parent stores a new array, the parent re-renders, the
   * callback changes again — and the page never finishes a frame. A choice is an
   * event, so it is reported as one.
   */
  const report = (next: Partial<Place>) => {
    onPlaceChange?.({
      countryCode: next.countryCode ?? country,
      divisionCode: next.divisionCode ?? division,
      districtCode: next.districtCode ?? district,
      locality: next.locality ?? locality,
    });
  };

  // The list beneath the chosen division. Its name comes from the country too — a
  // department in Argentina, a municipality in Brazil, a district in Turkey.
  useEffect(() => {
    if (!country || !division) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetch(
      `/api/geo/divisions?country=${encodeURIComponent(country)}&division=${encodeURIComponent(division)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { divisions?: Division[]; label?: string } | null) => {
        if (cancelled || !body) return;
        setDistricts(body.divisions ?? []);
        if (body.label) setDistrictLabel(body.label);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, division]);

  // A division that belonged to the previous country is no longer valid, and
  // neither is a district that belonged to the previous division.
  useEffect(() => {
    if (division && !division.startsWith(`${country}.`)) setDivision('');
  }, [country, division]);

  useEffect(() => {
    if (district && !district.startsWith(`${division}.`)) setDistrict('');
  }, [division, district]);

  const emirate = emirateOfDivision(division);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* The country decides everything below it, so it is submitted first. */}
      <Field
        label={labels.country}
        htmlFor="primaryCountryCode"
        required
        hint={labels.countryHint}
        error={errors?.country}
      >
        <Select
          id="primaryCountryCode"
          name={unnamed ? undefined : "primaryCountryCode"}
          required
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            report({ countryCode: event.target.value });
          }}
          error={errors?.country}
        >
          <option value="">{labels.chooseCountry}</option>
          {countries.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={divisionLabel}
        htmlFor="primaryDivisionCode"
        hint={divisions.length > 0 ? labels.divisionHint : labels.localityHint}
        error={errors?.division}
      >
        <Select
          id="primaryDivisionCode"
          name={unnamed ? undefined : "primaryDivisionCode"}
          value={division}
          disabled={divisions.length === 0 || loading}
          onChange={(event) => {
            setDivision(event.target.value);
            report({ divisionCode: event.target.value });
          }}
          error={errors?.division}
        >
          <option value="">
            {divisions.length === 0 ? labels.optional : labels.chooseDivision}
          </option>
          {divisions.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      {/* The level beneath the province — a department, a municipality. A separate
          control rather than the same one changing under the reader's hand: the
          province stays chosen while its departments load. */}
      <Field
        label={districtLabel}
        htmlFor="primaryDistrictCode"
        hint={districts.length > 0 ? labels.districtHint : labels.localityHint}
      >
        <Select
          id="primaryDistrictCode"
          name={unnamed ? undefined : "primaryDistrictCode"}
          value={district}
          disabled={districts.length === 0 || loadingDistricts}
          onChange={(event) => {
            setDistrict(event.target.value);
            report({ districtCode: event.target.value });
          }}
        >
          <option value="">
            {districts.length === 0 ? labels.optional : labels.chooseDivision}
          </option>
          {districts.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      {/* The emirate, when the division is one of the seven. Derived rather than
          asked, so a UAE professional never answers the same question twice. */}
      {emirate && !unnamed ? <input type="hidden" name="primaryEmirate" value={emirate} /> : null}

      <Field label={labels.locality} htmlFor="primaryLocality" hint={labels.localityHint}>
        <Input
          id="primaryLocality"
          name={unnamed ? undefined : 'primaryLocality'}
          maxLength={160}
          value={locality}
          onChange={(event) => {
            setLocality(event.target.value);
            report({ locality: event.target.value });
          }}
        />
      </Field>
    </div>
  );
}
