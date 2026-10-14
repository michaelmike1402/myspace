# MYSPACE

Your everyday, in order. Dashboard personal dengan enam modul, desain monochrome, dan penyimpanan lokal. Dibangun dengan React, TypeScript, Vite, Tailwind CSS, komponen shadcn/ui berbasis Radix, Dexie/IndexedDB, dan Zustand.

## Jalankan

Prasyarat: Node.js 22.12+ dan pnpm 11.25.0.

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Buka URL yang ditampilkan. Untuk menguji PWA/offline gunakan build produksi, bukan dev server:

```sh
pnpm test
pnpm build
pnpm preview
```

Browser tests (Chromium desktop dan WebKit dengan ukuran iPhone 13):

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

## Enam modul

- **Timetable:** minggu Senin–Minggu, next/current class, Hanzi dan pinyin, detail dosen/ruang, edit satu pertemuan atau seluruh tanggal tersimpan dalam seri, tambah/hapus kelas, validasi jam, deteksi bentrok. Tidak membentuk recurrence dari rentang minggu teks.
- **Debt tracker:** dua kolom Utang/Piutang; IDR dan CNY; alasan, jatuh tempo opsional, pembayaran parsial/lunas, riwayat timestamp Asia/Shanghai. Pembayaran berlebih ditolak; IDR disimpan sebagai rupiah bulat dan CNY sebagai fen agar penjumlahan tepat.
- **Quick convert:** IDR ⇄ CNY dengan satu kurs manual bersama. Kurs awal kosong; setiap hasil tersimpan mempertahankan kurs pada saat itu. Tidak ada API kurs.
- **Countdown hub:** beberapa event, waktu UTC+8, recurrence mingguan/bulanan/tahunan, edit/hapus. Tanggal akhir bulan disesuaikan tanpa menggeser tanggal acuan.
- **Subscriptions:** siklus mingguan/bulanan/tahunan dengan interval khusus; active/paused/cancelled; catat pembayaran dan majukan satu siklus; pengingat dashboard sesuai jumlah hari pilihan. Tidak membayar otomatis atau mengirim push ketika aplikasi tertutup.
- **Randomizer:** beberapa daftar tersimpan, 2–100 opsi, animasi rolling, hasil terakhir tersimpan. Pemilihan memakai Web Crypto dengan rejection sampling; satu baris satu peluang. Opsi duplikat berarti peluang lebih besar bagi teks itu.

Dashboard mendukung drag menggunakan handle setelah Customize, tombol urut untuk keyboard/touch, show/hide, dan ukuran normal/wide. Preferensi Dark/Light/System tersimpan; reduced motion dihormati.

## Data awal dan verifikasi

Sumber asli disalin ke `src/data/master-timetable.json`; berkas referensi di luar aplikasi tidak diubah. Semua pertemuan hanya berasal dari daftar `dates` dalam master (minggu 7–14, 12 Oktober–6 Desember 2026). Jadwal sesudah cakupan tersebut tidak diasumsikan.

Semua tanggal kelas adalah tanggal lokal `Asia/Shanghai`; instan dihitung dengan UTC+8 secara eksplisit, bukan zona waktu perangkat. Jam master cocok dengan panduan resmi HIT **2022**, halaman cetak 162. Penerapannya pada semester 2026 belum dapat dipastikan, sehingga setiap kelas awal diberi penanda belum dikonfirmasi. Pengguna dapat mengonfirmasi setelah memeriksa jadwal kampus. Pinyin adalah bantuan baca; nama pribadi bisa mempunyai pelafalan lain.

Peta vektor kampus disertakan dalam bundle agar berfungsi **offline**, dengan geometri publik OpenStreetMap. Tidak ada pengunduhan tile, foto gedung rekaan, token map, atau layanan berbayar. Titik fokus adalah pusat batas geometri gedung, bukan koordinat pintu masuk atau petunjuk rute. Geometri OSM bersifat kontribusi komunitas dan bisa tertinggal dari kondisi nyata. Sumber, versi, dan lisensi: [docs/SOURCES.md](docs/SOURCES.md).

## MYSPACE v2 · Phase 1

**Search & commands:** tekan `Ctrl+K` / `Cmd+K` atau tombol Search di topbar. Kata Indonesia/English dicocokkan langsung, tanpa membedakan huruf besar/kecil, termasuk potongan kata. Contoh: `jadwal`, `add debt`, `buat countdown`, `tambah subscription`, `convert uang`, dan `catatan`. Gunakan ↑/↓ lalu Enter, sentuh hasil, atau Escape/klik backdrop untuk menutup. Shortcut tidak mengganti form yang sedang terbuka; tutup form terlebih dahulu agar isian tidak hilang.

**Quick Capture:** klik tombol lingkaran di tepi layar untuk Quick Note, Tambah utang, Tambah countdown, atau Quick convert. Geser memakai mouse/sentuhan; tombol menempel ke sisi terdekat. Saat fokus keyboard, ←/→ memilih sisi, ↑/↓ menggeser vertikal, Home/End ke atas/bawah, Enter/Space membuka menu. Tombol meredup setelah 5 detik tanpa interaksi. Posisi menyesuaikan viewport, safe area, dan preferensi reduced motion.

Quick Note menyimpan teks dan timestamp Shanghai; riwayat dapat dibuka dari kedua akses cepat. Catatan serta posisi tombol ikut dalam export/import backup. Data v1 yang belum memiliki field baru memperoleh default saat dibaca, tanpa reset atau penanaman ulang timetable. Gunakan versi ini atau yang lebih baru untuk membuka backup yang berisi Quick Notes; versi aplikasi lama belum mengenali field tambahan tersebut.

Detail arsitektur, daftar berkas, dan cakupan pengujian: [docs/PHASE1.md](docs/PHASE1.md).

## Penyimpanan dan backup

Data berada di IndexedDB bernama `myspace-v1` pada **origin dan profil browser ini**. Tidak ada akun aplikasi, backend, tracking, atau sinkronisasi antarperangkat. Memindahkan alamat hosting, memakai browser lain, atau menghapus site data menghasilkan penyimpanan berbeda. Pembukaan pertama menanam data awal satu kali. Update aplikasi tidak menimpa data pengguna.

Settings & backup menyediakan export JSON dan import dengan preview, validasi schema/ID/jumlah/tanggal, serta konfirmasi penggantian. Import merupakan transaksi atomik dan memicu unduhan salinan data sebelumnya. Simpan backup di lokasi yang aman; JSON berisi seluruh data personal tanpa enkripsi. Browser dapat membuang penyimpanan, khususnya saat kehabisan ruang; tombol permintaan persistent storage tersedia tetapi keputusan ada pada browser.

PWA harus dibuka sekali secara online hingga caching selesai. Setelah itu shell aplikasi, keenam modul, data lokal, dan peta vektor dapat dibuka offline. Tautan eksternal sumber memerlukan internet. Update service worker memakai prompt agar tidak mengganti aplikasi di tengah edit. iPhone: Safari → Share → Add to Home Screen. Instalasi memerlukan HTTPS (atau localhost).

## GitHub Pages

Workflow `.github/workflows/deploy.yml` menjalankan unit tests, build, browser tests, lalu deploy. Tidak memerlukan secret atau token frontend.

1. Buat repository GitHub dan push **isi folder `myspace`** sebagai root repository ke branch `main`.
2. Repository → Settings → Pages → Source: **GitHub Actions**.
3. Jalankan workflow atau push commit baru.
4. URL proyek: `https://USERNAME.github.io/REPOSITORY/`.

Workflow mengatur `VITE_BASE_PATH` otomatis dari nama repository. Untuk domain kustom atau repository `USERNAME.github.io`, gunakan `/` sebagai base. Untuk build lokal default `./` menjaga aset relatif. Navigasi modul memakai hash sehingga reload tidak menghasilkan 404 pada Pages.

**Privasi publikasi:** frontend beserta timetable awal masuk ke file build dan dapat dibaca siapa saja yang mengakses situs/repository. Debt, countdown, subscription, history, dan preferensi yang diisi melalui aplikasi tetap hanya di browser masing-masing. Untuk penggunaan pribadi tanpa membuka timetable awal ke publik, gunakan hosting privat atau ubah seed sebelum publikasi.

## Struktur

`src/lib/domain.ts` — validasi, uang, kalender, backup; `src/lib/store.ts` — transaksi IndexedDB dan reactive state; `src/components/` — modul dan UI; `src/data/` — seed dan geometri bersumber; `tests/` — domain/storage/browser tests.

Geometri dapat diregenerasi dari respons API OSM pada bbox yang dicatat di SOURCES:

```sh
node scripts/prepare-assets.mjs /path/to/osm-source.json
```

Ikon PNG dan SVG sudah disertakan; tidak perlu generator untuk setup normal.

## Batas pengujian

Emulasi iPhone menggunakan WebKit desktop dengan viewport/touch iPhone; ini tidak menggantikan tes pemasangan PWA pada iPhone fisik. Pengingat subscription berjalan saat dashboard dibuka, bukan melalui penjadwal sistem operasi.

Referensi deploy: [Vite GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages). Referensi offline: [Vite PWA precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache).
