# GiatQ PWA v0.2.0

Brand: **GiatQ — Biasakan yang baik**  
Warna utama: **#28A3FE** (biru langit dari logo)

## Isi versi ini
- Login Google (siap setelah Client ID diisi) + Session DEV untuk testing.
- Dashboard Hari Ini.
- Checklist live.
- Progress kegiatan jumlah/durasi/jarak.
- Persentase pencapaian harian.
- KegiatanKU: tambah, ubah, arsip.
- Jadwal harian atau hari tertentu.
- Laporan harian yang direbuild saat dibuka.
- Menu Premium tetap terlihat dan membuka paywall.
- Offline app shell + antrean checklist/progress untuk sync ulang.
- Cloudflare Pages Function `/api` sebagai proxy aman/praktis ke Apps Script.

## Kenapa ada /api proxy?
Apps Script ContentService melakukan redirect ke `script.googleusercontent.com`. Direct browser fetch dari PWA eksternal, terutama POST pada mobile, dapat bermasalah karena CORS/redirect. Karena itu paket ini menyertakan Cloudflare Pages Function yang menjadi lapisan tipis:

PWA → `/api` (same origin) → Apps Script → Google Sheets

Business logic dan database tetap berada di Apps Script + Google Sheets.

## 1. Update Apps Script
Gunakan `GIATQ_AppsScript_Core_v0.1.3_PWA_API.zip`, lalu deploy ulang deployment Web App yang sama sebagai **new version**.

## 2. Testing awal tanpa Google Login
1. Di Apps Script jalankan `GIATQ_devIssueSession()`.
2. Copy `session_token` dari Execution log.
3. Pada halaman login PWA pilih **Masuk dengan Session DEV**.
4. Paste token.

## 3. Google Login produksi
Buat OAuth 2.0 Web Client ID untuk GiatQ di Google Cloud Console.
- Authorized JavaScript origin: domain PWA final, contoh `https://giatq.pages.dev`
- Setelah mendapat Client ID, isi `GOOGLE_CLIENT_ID` di `config.js`.
- Di Apps Script jalankan:
  `GIATQ_setGoogleClientId('xxxxx.apps.googleusercontent.com')`
- Deploy Apps Script new version lagi.

## 4. Deploy ke Cloudflare Pages
Paling rapi gunakan Git integration atau Wrangler agar folder `functions/` ikut terdeploy.
Set Environment Variable opsional:
- `GIATQ_GAS_URL` = URL Apps Script `/exec`

Jika env tidak diisi, function memakai URL GiatQ yang sudah tertanam di source paket ini.

## 5. PWA install
Setelah HTTPS aktif, buka GiatQ dari Chrome/Android lalu pilih **Add to Home Screen / Install app**.

## Catatan keamanan
- Jangan simpan client secret OAuth di frontend. Yang dipakai PWA hanya **Client ID**, bukan secret.
- Session token GiatQ disimpan di localStorage pada versi awal. Untuk versi produksi lanjutan, bisa ditingkatkan ke token rotation + device sessions atau cookie same-site pada proxy.
- Fitur Premium masih berupa paywall/entitlement foundation; pembayaran belum diaktifkan.
