# HIT location and teaching-time verification

Researched 2026-10-10, Asia/Shanghai. No app files or synced source files changed.

## Map data

Primary OpenStreetMap JSON successfully fetched from:
https://api.openstreetmap.org/api/0.6/map.json?bbox=126.620,45.739,126.630,45.747

Bundled geometry is `src/data/campus-map.json`; selected building source geometry is `docs/building-geometry.json`. The original API response was retained in the parent research workspace, outside this app repository. Fetch the API URL above to regenerate a fresh dataset; existing geometry remains the 2026-10-10 snapshot.

| Building | Primary feature | Latitude | Longitude | Version, feature timestamp |
| --- | --- | --- | --- | --- |
| 电机楼 / Diànjī Lóu | https://www.openstreetmap.org/way/319289955 | 45.7446964 | 126.62652675 | 7, 2026-03-18T08:41:46Z |
| 致知楼 / Zhìzhī Lóu | https://www.openstreetmap.org/way/319269944 | 45.74256165 | 126.62710715 | 3, 2026-03-18T08:41:46Z |
| 正心楼 / Zhèngxīn Lóu | https://www.openstreetmap.org/relation/4434311 | 45.74141605 | 126.62525825 | 3, 2019-05-15T00:27:14Z |

These positions are calculated midpoints of each feature's latitude/longitude bounding box. They are approximate building focus positions, NOT surveyed coordinates or entrance directions. OSM is community mapped; feature timestamps do not guarantee geometry was resurveyed on those dates. All exact geometry points come from primary OSM data, not sketches. Zhengxin is a multipolygon relation with six member-way segments; those segments should be joined before rendering a filled polygon, or rendered as independent outlines. Coordinates are longitude/latitude pairs in the minimal JSON.

OSM response specifies copyright OpenStreetMap and contributors and ODbL 1.0 license. Display linked attribution “© OpenStreetMap contributors” and retain data attribution/license with any redistributed geometry:
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

An offline vector schematic drawn from this small dataset avoids downloading map tiles. If using public standard OSM tiles, follow the separate tile policy; it prohibits bulk/offline prefetch:
https://operations.osmfoundation.org/policies/tiles/

No building photographs were selected because no suitable verified photo with explicit reuse permission was established. Do not use the unrelated railway or city photos shown as nearby places by Mapcarta.

## Official building corroboration

Official HIT classroom explanation identifies 电机楼 as Building 2, south of and connected to the main building; 正心楼 between gymnasium and canteen; 致知楼 as Building 18, diagonally opposite 学苑楼. Rooms: 电机楼 uses five digits; 正心 large classrooms use two digits, smaller classrooms three digits (four on floor ten); 致知 rooms use two digits. These are descriptions from a handbook, not current navigation promises.

https://jtxy.hit.edu.cn/_upload/article/files/f9/c5/e28e5a654b23924178861a26d1b8/1c04bd47-a5ea-4e7f-ace7-0df66a4dcf5d.pdf
https://seie.hit.edu.cn/_upload/article/files/16/ea/6c8b29474e3c830a3553b62b2ceb/802db333-c43d-473d-83d6-560e928c05c0-B.pdf

Official current campus map (link out; no permission to copy its imagery established):
https://map.hit.edu.cn/

Official 2026 spring graduate entry guide independently links that map and describes its building location/navigation services:
https://hitgs.hit.edu.cn/2026/0302/c17343a387747/page.htm

## Teaching times

The 2022 Student Handbook on HIT's academic affairs domain, printed page 162, provides these lesson periods, extracted by web search:

| Period | Local time |
| --- | --- |
| 1 | 08:00–08:50 |
| 2 | 08:55–09:45 |
| 3 | 10:00–10:50 |
| 4 | 10:55–11:45 |
| 5 | 13:45–14:35 |
| 6 | 14:40–15:30 |
| 7 | 15:45–16:35 |
| 8 | 16:40–17:30 |
| 9 | 18:30–19:20 |
| 10 | 19:25–20:15 |
| 11 | 20:30–21:20 |
| 12 | 21:25–22:15 |

https://jwc.hit.edu.cn/_upload/article/files/2b/7b/216eaf134daab54d9366020e720c/79135921-d22b-44a3-839e-2a0935e22206.pdf

The source is a 2022 handbook even though the search engine reports a recent indexed publication date. Direct web PDF fetch failed due to size; the search extraction includes the full table and printed page number. No current-term universal replacement timetable was verified. Use this as a dated validation reference and flag conflicting imported times rather than silently replacing them. The handbook has separate exam and experiment schedules; those must not be mistaken for normal class periods. The original JTXY PDF was verified for classroom explanations, but its lesson timing table was not successfully extracted during this research.
