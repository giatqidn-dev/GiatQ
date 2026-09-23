# GiatQ PWA v0.2.3 — Persistent Session

Patch ini membuat Session DEV/produksi tidak meminta token lagi setiap buka selama session masih valid.

Perubahan:
- warm start dari cache sebelum backend selesai merespons;
- auth screen tidak ditampilkan ketika token lokal masih ada;
- session hanya dihapus bila backend benar-benar menyatakan session invalid/expired;
- error jaringan/cold-start Apps Script tidak melempar user ke halaman login;
- GitHub Pages memakai API_MODE=direct agar tidak mencoba `/api` yang tidak tersedia dan menambah delay;
- service worker cache bump ke v0.2.3.

Backend tetap GIATQ Core v0.1.5.
