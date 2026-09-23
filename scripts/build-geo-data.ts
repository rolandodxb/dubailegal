/**
 * Builds the geographic reference data the directory cascades through.
 *
 *   npm run geo:build
 *
 * Source: GeoNames, CC BY 4.0 — see `data/geo/ATTRIBUTION.md`. Two files give the
 * whole world's administrative hierarchy:
 *
 *   admin1CodesASCII.txt  the first-level division of every country — a province,
 *                         a state, an emirate, a governorate, whatever that
 *                         country calls it. About 3,900 rows.
 *   admin2Codes.txt       the second level beneath it — a department, a
 *                         municipality, a county. About 46,000 rows.
 *
 * The generated files are deliberately plain JSON keyed by code, because they are
 * read at request time to answer "what are the provinces of Argentina" rather than
 * being shipped to a browser. Nothing here is imported by a client component: a
 * picker asks the server for one country's list when the country is chosen, which
 * keeps a 2 MB dataset out of the bundle.
 *
 * This is a build-time tool. It is not part of the application and is never
 * imported by it.
 */

process.loadEnvFile?.('.env');

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = 'https://download.geonames.org/export/dump';
const OUT_DIR = path.resolve('data/geo');

type Division = { code: string; name: string };

async function fetchText(file: string): Promise<string> {
  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) throw new Error(`GeoNames answered ${response.status} for ${file}`);
  return response.text();
}

async function main(): Promise<void> {
  console.info('Fetching GeoNames administrative divisions…');
  const [admin1Text, admin2Text] = await Promise.all([
    fetchText('admin1CodesASCII.txt'),
    fetchText('admin2Codes.txt'),
  ]);

  /** Country → its first-level divisions. */
  const first: Record<string, Division[]> = {};
  for (const line of admin1Text.split('\n')) {
    if (!line.trim()) continue;
    const [code, name] = line.split('\t');
    const country = code.split('.')[0];
    if (!country || !name) continue;
    (first[country] ??= []).push({ code, name });
  }

  /** First-level code → the divisions beneath it. */
  const second: Record<string, Division[]> = {};
  for (const line of admin2Text.split('\n')) {
    if (!line.trim()) continue;
    const [code, name] = line.split('\t');
    // "AR.14.056" — the parent is everything before the last dot.
    const parent = code.slice(0, code.lastIndexOf('.'));
    if (!parent || !name) continue;
    (second[parent] ??= []).push({ code, name });
  }

  // Alphabetical within each list, so a picker never shows an arbitrary order.
  for (const list of Object.values(first)) list.sort((a, b) => a.name.localeCompare(b.name));
  for (const list of Object.values(second)) list.sort((a, b) => a.name.localeCompare(b.name));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'admin1.json'), JSON.stringify(first));
  await writeFile(path.join(OUT_DIR, 'admin2.json'), JSON.stringify(second));

  const countries = Object.keys(first).length;
  const provinces = Object.values(first).reduce((sum, list) => sum + list.length, 0);
  const districts = Object.values(second).reduce((sum, list) => sum + list.length, 0);
  console.info(`  countries with divisions: ${countries}`);
  console.info(`  first-level divisions:    ${provinces}`);
  console.info(`  second-level divisions:   ${districts}`);
  console.info('  written to data/geo/admin1.json and data/geo/admin2.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
