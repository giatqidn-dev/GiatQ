# READY AUTH

- Login hanya Nama + Kata sandi.
- Registrasi: Nama, WhatsApp, Kota/Kabupaten, Kata sandi.
- Password tidak disimpan dalam teks asli.
- Session tersimpan 30 hari dan aplikasi auto-login selama session valid.
- 5 percobaan kata sandi gagal mengunci login sementara.
- Database profil admin: REGISTRATIONS.
- Database kredensial terpisah: AUTH_CREDENTIALS.
- Fast checklist, queue offline, race-condition fix, dan desktop redesign tetap dipertahankan.
