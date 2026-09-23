# GiatQ PWA v0.2.2 — INSTANT CHECKLIST

Checklist sekarang optimistic/offline-first:
1. Tap langsung mengubah UI dan persentase lokal, tanpa menunggu jaringan.
2. Event masuk local queue.
3. Tap beruntun selama ~220ms digabung.
4. Queue dikirim sekali ke Core `syncEvents`.
5. Setelah server selesai, state direkonsiliasi dengan bundle resmi dari Sheet.

Hasil: respons tap terasa instan, sementara penyimpanan Google Sheets berlangsung di belakang layar.
