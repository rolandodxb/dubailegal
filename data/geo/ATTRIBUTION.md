# Geographic reference data

`admin1.json` and `admin2.json` in this directory hold the world's administrative
divisions, used by the directory to cascade country → province → department.

## Source

Both files are generated from [GeoNames](https://www.geonames.org/) by
`scripts/build-geo-data.ts`:

- `admin1.json` — from [`admin1CodesASCII.txt`](https://download.geonames.org/export/dump/admin1CodesASCII.txt),
  the first-level division of each country: 228 countries, 3,865 divisions.
- `admin2.json` — from [`admin2Codes.txt`](https://download.geonames.org/export/dump/admin2Codes.txt),
  47,643 second-level divisions, each keyed by the code of the division it sits under.

## Licence

GeoNames data is licensed **Creative Commons Attribution 4.0 (CC BY 4.0)** —
https://creativecommons.org/licenses/by/4.0/

You may use it commercially, including in a closed-source application, provided
the attribution below is kept. It is not a copyleft licence: it places no
condition on the licensing of this application's own source code. (This is why
the similarly-shaped `country-state-city` package was rejected — it is GPL-3.0,
which would have required releasing this application under the GPL.)

## Attribution

> This product uses data from [GeoNames](https://www.geonames.org/), licensed under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

That line is also rendered in the application's footer and on the directory's
"where we operate" note, so the attribution travels with the data.

## Regenerating

```
npm run geo:build
```

The generator fetches both source files and rewrites the JSON here. It is a
build-time tool: nothing in the application downloads anything at runtime.
