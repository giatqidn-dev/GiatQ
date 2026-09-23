# GiatQ PWA v0.2.5 — Session UX + Checklist Race Fix

Perubahan utama:
- Logout sekarang meminta konfirmasi dan menjelaskan bahwa menutup aplikasi tidak perlu logout.
- Session tetap disimpan di localStorage seperti sebelumnya.
- Memperbaiki race condition Fast Sync: event baru saat request berjalan tidak lagi terhapus.
- Response sync lama tidak lagi menimpa optimistic state terbaru.
- refreshAll me-reapply queue lokal sebelum render, sehingga checklist tidak flicker/hilang-muncul saat server sedikit tertinggal.
- Cache service worker dinaikkan ke v0.2.5.

Backend: tetap GIATQ Core v0.1.6 REGISTRATION. Tidak perlu patch backend baru.
