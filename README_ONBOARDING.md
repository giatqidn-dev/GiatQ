# GiatQ PWA v0.2.4 — Splash, Icon, Registration

Perubahan:
1. Ikon PWA baru: logo biru pada latar putih, termasuk maskable icon Android.
2. Splash screen GiatQ muncul setiap app dibuka sebelum masuk ke halaman berikutnya.
3. Onboarding registrasi satu kali: nama, WhatsApp, email, kota/kabupaten, profesi, sumber GiatQ.
4. Data registrasi tersimpan ke sheet REGISTRATIONS melalui Core v0.1.6.
5. Session v0.2.3 tetap dipertahankan: token DEV tidak diminta lagi selama session masih valid.
6. Fast Sync dari v0.2.1 tetap dipertahankan.
7. Service worker dibuat network-first untuk navigasi supaya update GitHub Pages lebih cepat terbaca.

PENTING IKON ANDROID:
Setelah upload v0.2.4, hapus/uninstall GiatQ yang sudah terpasang dari homescreen lalu install ulang.
Android sering menyimpan icon manifest lama walaupun file sudah diperbarui.
