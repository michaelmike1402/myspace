import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const root = path.resolve(import.meta.dirname, "..");
const sourcePath = process.argv[2];
if (sourcePath) {
  const raw = JSON.parse(
    fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, ""),
  );
  const nodes = new Map(
    raw.elements
      .filter((e) => e.type === "node")
      .map((e) => [e.id, [e.lon, e.lat]]),
  );
  const features = raw.elements
    .filter(
      (e) =>
        e.type === "way" &&
        (e.tags?.building ||
          e.tags?.highway ||
          e.tags?.leisure ||
          e.tags?.landuse),
    )
    .flatMap((e) => {
      const coordinates = e.nodes.map((id) => nodes.get(id)).filter(Boolean);
      if (coordinates.length < 2) return [];
      const closed = e.nodes[0] === e.nodes.at(-1) && coordinates.length >= 4;
      return [
        {
          type: "Feature",
          properties: {
            id: e.id,
            kind: e.tags.building
              ? "building"
              : e.tags.highway
                ? "road"
                : "area",
            name: e.tags.name || "",
          },
          geometry: {
            type: closed && !e.tags.highway ? "Polygon" : "LineString",
            coordinates:
              closed && !e.tags.highway ? [coordinates] : coordinates,
          },
        },
      ];
    });
  const ways = new Map(
    raw.elements.filter((e) => e.type === "way").map((e) => [e.id, e]),
  );
  for (const relation of raw.elements.filter(
    (e) => e.type === "relation" && e.tags?.building,
  )) {
    for (const member of relation.members.filter((m) => m.type === "way")) {
      const coordinates = (ways.get(member.ref)?.nodes || [])
        .map((id) => nodes.get(id))
        .filter(Boolean);
      if (coordinates.length > 1)
        features.push({
          type: "Feature",
          properties: {
            id: member.ref,
            relationId: relation.id,
            kind: "building-outline",
            name: relation.tags.name || "",
          },
          geometry: { type: "LineString", coordinates },
        });
    }
  }
  fs.writeFileSync(
    path.join(root, "src/data/campus-map.json"),
    JSON.stringify({
      type: "FeatureCollection",
      attribution: "© OpenStreetMap contributors",
      license: "ODbL 1.0",
      source:
        "https://api.openstreetmap.org/api/0.6/map.json?bbox=126.620,45.739,126.630,45.747",
      retrieved: "2026-10-10",
      features,
    }),
  );
  console.log(`Prepared ${features.length} public OSM features.`);
}
// Pass a module directory only when using a bundled runtime; standard Node resolves sharp locally.
if (process.argv[3]) {
  const require = createRequire(path.join(process.argv[3], "package.json"));
  const sharp = require("sharp");
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["icon-maskable.png", 512],
  ]) {
    let image = sharp(path.join(root, "public/icon.svg")).resize(
      name === "icon-maskable.png" ? 360 : size,
      name === "icon-maskable.png" ? 360 : size,
    );
    if (name === "icon-maskable.png")
      image = image.extend({
        top: 76,
        bottom: 76,
        left: 76,
        right: 76,
        background: "#111113",
      });
    await image.png().toFile(path.join(root, "public", name));
  }
  console.log("Prepared PWA icons.");
}
