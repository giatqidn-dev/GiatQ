# GiatQ PWA v0.3.0 — READY AUTH

Frontend siap pakai untuk GitHub Pages.

## Flow
- Buka aplikasi → splash GiatQ.
- Jika session masih valid → langsung Hari Ini.
- Jika belum login / session habis → layar Masuk minimal: Nama + Kata sandi.
- User baru menekan Daftar satu kali, lalu otomatis login.

## Backend yang wajib dipakai
GiatQ Core v0.1.7 READY AUTH.

## Deploy
1. Replace Code.gs dengan Core v0.1.7.
2. Jalankan GIATQ_install(), GIATQ_validateSchema(), lalu GIATQ_health().
3. Edit deployment Apps Script yang sama → New version → Deploy.
4. Replace isi repo GitHub Pages dengan isi paket PWA v0.3.0 ini.
5. Tunggu GitHub Pages selesai publish, lalu refresh/reinstall PWA bila browser masih menyimpan cache lama.

## Catatan akun lama DEV
Akun U_DEV adalah data pengujian. v0.3.0 tidak menampilkan Session DEV dan tidak menerima DEV account sebagai flow pengguna. Buat akun nyata lewat Daftar satu kali.
