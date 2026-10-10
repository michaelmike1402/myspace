import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpRight, LocateFixed, MapPin } from "lucide-react";
import { buildings, findBuilding } from "../data/buildings";
import { Button } from "./ui/button";
import campus from "../data/campus-map.json";
export function CampusMap({ building }: { building: string }) {
  const selected = findBuilding(building),
    el = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!el.current || !selected?.coordinates) return;
    const center = selected.coordinates;
    const m = L.map(el.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 15,
      maxZoom: 20,
      maxBounds: [
        [45.738, 126.618],
        [45.748, 126.632],
      ],
      maxBoundsViscosity: 0.7,
    }).setView(center, 15);
    map.current = m;
    m.attributionControl.setPrefix(false);
    m.attributionControl.addAttribution(
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · ODbL',
    );
    L.geoJSON(campus as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const kind = feature?.properties.kind;
        const focused =
          feature?.properties.id === selected.osmWay ||
          feature?.properties.name === selected.name;
        return {
          color: focused ? "#eee" : kind === "road" ? "#67676c" : "#6b6b72",
          weight: focused ? 2 : kind === "road" ? 2 : 1,
          fillColor: kind === "building" ? "#38383f" : "#212127",
          fillOpacity: 0.8,
          opacity: kind === "road" ? 0.7 : 0.9,
        };
      },
    }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    for (const b of buildings) {
      if (b.coordinates) {
        if (b.outline)
          L.polygon(b.outline, {
            color: b.key === selected.key ? "#fff" : "#888",
            weight: 1.5,
            fillColor: "#777",
            fillOpacity: 0.3,
          }).addTo(m);
        const label = document.createElement("span");
        label.textContent = b.name;
        L.marker(b.coordinates, {
          icon: L.divIcon({
            className: `campus-marker ${b.key === selected.key ? "selected-marker" : ""}`,
            html: "<span></span>",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        })
          .addTo(m)
          .bindTooltip(label, {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            className: "map-label",
          });
      }
    }
    const timeout = setTimeout(() => {
      m.invalidateSize();
      m.flyTo(center, 18, {
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 2.2,
      });
    }, 300);
    return () => {
      clearTimeout(timeout);
      m.remove();
      map.current = null;
    };
  }, [selected?.key]);
  return (
    <section className="campus-map">
      <div className="map-heading">
        <div>
          <span className="eyebrow">CAMPUS, IN FOCUS</span>
          <h3>{selected?.name || building || "Lokasi belum diisi"}</h3>
          <small>{selected?.pinyin || "Gedung belum terverifikasi"}</small>
        </div>
        <MapPin size={22} />
      </div>
      {selected?.coordinates ? (
        <>
          <div
            ref={el}
            className="map-canvas"
            aria-label={`Peta ${selected.name}`}
          />
          <Button
            className="map-recenter"
            variant="secondary"
            size="sm"
            onClick={() =>
              map.current?.flyTo(selected.coordinates!, 18, {
                duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? 0
                  : 1.5,
              })
            }
          >
            <LocateFixed size={14} />
            Focus
          </Button>
          <p className="map-offline">
            Peta kampus tersimpan · tersedia offline · utara di atas
          </p>
        </>
      ) : (
        <div className="map-placeholder">
          <MapPin size={28} />
          <p>Koordinat gedung belum diverifikasi.</p>
        </div>
      )}
      <div className="map-source">
        <p>{selected?.note || "Cari nama gedung melalui peta kampus resmi."}</p>
        <div>
          <a
            href={selected?.source || "https://map.hit.edu.cn/"}
            target="_blank"
            rel="noreferrer"
          >
            Sumber lokasi <ArrowUpRight size={12} />
          </a>
          <a href="https://map.hit.edu.cn/" target="_blank" rel="noreferrer">
            Peta resmi HIT <ArrowUpRight size={12} />
          </a>
        </div>
        <small>
          WGS84 · data © OpenStreetMap contributors, ODbL · verifikasi{" "}
          {selected?.verifiedOn || "belum tersedia"}. Pin bukan pintu masuk atau
          petunjuk rute.
        </small>
      </div>
    </section>
  );
}
