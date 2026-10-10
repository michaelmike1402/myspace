export type Building = {
  key: string;
  name: string;
  pinyin: string;
  english: string;
  coordinates: [number, number] | null;
  osmWay?: number;
  source: string;
  verifiedOn: string;
  note: string;
  outline?: [number, number][];
};
export const buildings: Building[] = [
  {
    key: "电机楼",
    name: "电机楼",
    pinyin: "Diànjī lóu",
    english: "Electrical Engineering Building",
    coordinates: [45.7446964, 126.62652675],
    osmWay: 319289955,
    source: "https://www.openstreetmap.org/way/319289955",
    verifiedOn: "2026-10-10",
    note: "Pusat batas geometri OSM way 319289955, versi 7. Posisi perkiraan gedung, bukan pintu masuk.",
  },
  {
    key: "正心",
    name: "正心楼",
    pinyin: "Zhèngxīn lóu",
    english: "Zhengxin Building",
    coordinates: [45.74141605, 126.62525825],
    source: "https://www.openstreetmap.org/relation/4434311",
    verifiedOn: "2026-10-10",
    note: "Pusat batas geometri OSM relation 4434311, versi 3. Posisi perkiraan gedung, bukan pintu masuk.",
  },
  {
    key: "致知",
    name: "致知楼",
    pinyin: "Zhìzhī lóu",
    english: "Zhizhi Building",
    coordinates: [45.74256165, 126.62710715],
    osmWay: 319269944,
    source: "https://www.openstreetmap.org/way/319269944",
    verifiedOn: "2026-10-10",
    note: "Pusat batas geometri OSM way 319269944, versi 3. Posisi perkiraan gedung, bukan pintu masuk.",
  },
];
export const findBuilding = (name: string) =>
  buildings.find((b) => b.key === name || b.name === name);
export const timingSource =
  "https://jwc.hit.edu.cn/_upload/article/files/2b/7b/216eaf134daab54d9366020e720c/79135921-d22b-44a3-839e-2a0935e22206.pdf";
