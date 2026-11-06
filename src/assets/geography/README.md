# Bundled offline geography

- `countries-110m.json`: world-atlas 2, Natural Earth 1:110m admin-0 TopoJSON, with ISO alpha-2 codes attached from mledoze/countries.
- `regions/*.json`: Natural Earth 1:10m admin-1 states/provinces, simplified to 3% with topology and small regions preserved. Natural Earth 1:110m admin-1 only includes selected countries, so the broader dataset supplies all ten requested countries. Each file is loaded only when its country is selected.
- `cities.json`: GeoNames cities15000 (CC BY 4.0), name, country, region name, optional ISO region code and population only. City-level coordinates (rounded to 0.01°) are bundled for capture location matching only; onboarding never reads or stores them. Region codes are matched from Natural Earth names.

Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/
Country source: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
Regions source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson
City source and attribution: GeoNames, https://www.geonames.org/ and https://download.geonames.org/export/dump/cities15000.zip

Runtime uses bundled local assets only; no external geography or city requests.