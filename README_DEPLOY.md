# GiatQ PWA v0.2.4 — Onboarding

Brand: **GiatQ — Biasakan yang baik**  
Backend minimum: **GiatQ Core v0.1.6**

## Isi versi ini
- Icon Android/PWA diperbaiki dan dibuat maskable dengan kontras yang benar.
- Splash GiatQ saat aplikasi dibuka.
- Registrasi profil satu kali setelah session valid.
- Data registrasi tersimpan ke sheet `REGISTRATIONS`.
- Persistent session dari v0.2.3.
- Instant checklist + batch sync dari v0.2.1.
- Redesign UI dari v0.2.2.
- Service worker baru agar update GitHub Pages lebih cepat terbaca.

## Urutan deploy
1. Replace `Code.gs` dengan GiatQ Core v0.1.6.
2. Apps Script: Save → `GIATQ_validateSchema()` → `GIATQ_health()`.
3. Manage deployments → Edit → New version → Deploy.
4. Replace isi repo GitHub Pages dengan isi ZIP PWA v0.2.4.
5. Tunggu GitHub Pages selesai build/publish.
6. Karena icon Android lama biasanya masih dicache, hapus/uninstall GiatQ yang lama dari homescreen lalu install ulang.

## Pengujian DEV
Jika browser masih memiliki session DEV yang valid, splash akan langsung menuju registrasi atau dashboard.
Jika reinstall menghapus site storage, masukkan DEV session token satu kali lagi. Setelah tersimpan, session tetap dipertahankan selama masih valid.

## Registrasi admin database
Field yang disimpan:
- nama lengkap
- WhatsApp
- email
- kota/kabupaten
- aktivitas/profesi
- sumber mengetahui GiatQ
- consent
- status
- waktu registrasi/update

## Produksi
Token manual hanya untuk testing. Tahap produksi sebaiknya memakai Google Login/OTP; session GiatQ tetap dibuat dan disimpan otomatis setelah autentikasi.
