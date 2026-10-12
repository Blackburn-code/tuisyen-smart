# Tuisyen Smart

Sistem pengurusan tuisyen persendirian yang berjalan **sepenuhnya offline**. Data disimpan dalam peranti sahaja (IndexedDB), tiada pelayan luar, tiada CDN. GitHub Actions membina fail APK Android secara automatik setiap kali kod dikemas kini.

## Modul

| Menu | Fungsi utama |
|---|---|
| Dashboard | Pelajar aktif, kelas hari ini, kutipan, bil, tunggakan, perbelanjaan bulan ini, peringatan bil, kelas akan datang |
| Pelajar | Tambah/kemas kini, ID automatik (P0001…), carian, tapis status/sekolah/tingkatan, profil dengan sejarah kelas, kehadiran, bil, bayaran dan keputusan, nyahaktif tanpa padam sejarah |
| Subjek | Kadar tersendiri: bulanan, setiap kelas atau mengikut jam |
| Pakej Tuisyen | Beberapa subjek pada satu harga; caj berganda bagi subjek dalam pakej disekat |
| Pendaftaran subjek | Dari profil pelajar; kadar dipersetujui dikunci supaya perubahan harga tidak mengubah bil lama |
| Jadual Kelas | Paparan harian/mingguan/bulanan, carian, semakan pertindihan, kelas ganti, ulang mingguan, amaran kelas hampir bermula |
| Kehadiran | Hadir, lewat, tidak hadir, cuti, dibatalkan; peratus automatik mengikut polisi; satu rekod setiap pelajar setiap kelas |
| Yuran dan Bil | Bil manual & penjanaan bil bulanan pukal (bulanan, kelas, jam, pakej), diskaun, caj tambahan, semakan pendua, status automatik |
| Bayaran dan Resit | Tunai, pindahan bank, DuitNow; bayaran separa; satu bayaran ke beberapa bil; kredit lebihan; pembatalan tanpa padam rekod; cetak resit |
| Perbelanjaan | Kategori boleh disunting, ringkasan mengikut kategori |
| Prestasi Akademik | Ujian, markah, peratus, gred automatik, graf perkembangan mengikut subjek |
| Laporan | 8 laporan dengan julat tarikh, cetak dan eksport CSV |
| Sandaran Data | Eksport/import JSON dengan semakan format, pengesahan sebelum ganti, panduan pindah data Android ↔ PC |
| Tetapan | Maklumat pusat, tempoh bayar, awalan no. bil/resit, polisi kehadiran, skala gred |

Formula utama:
- Jumlah bil = Jumlah butiran caj − Diskaun + Caj tambahan
- Baki bil = Jumlah bil − Bayaran yang diperuntukkan
- Peratus kehadiran = Kelas dihadiri ÷ Kelas layak dikira × 100 (kelas dibatalkan & cuti tidak dikira)
- Peratus markah = Markah diperoleh ÷ Markah penuh × 100

Semua wang disimpan dalam **sen (integer)** untuk elak ralat perpuluhan.

## Struktur repo

```
www/                        Aplikasi
  index.html, style.css     Struktur & reka bentuk (responsif + cetakan)
  app.js                    Teras: navigasi, borang, kewangan, dashboard, tetapan
  db.js                     IndexedDB: 15 stor, transaksi atomik, sandaran
  js/students.js            Pelajar
  js/catalog.js             Subjek, pakej, pendaftaran
  js/schedule.js            Jadual kelas & kehadiran
  js/billing.js             Bil, bayaran, resit
  js/expenses.js            Perbelanjaan
  js/academic.js            Prestasi akademik & graf
  js/reports.js             Laporan
  js/backup.js              Sandaran & pemulihan
  manifest.json, service-worker.js, icons/   PWA (untuk pelayar)
android-res/                Ikon Android, plugin asli (cetak & simpan fail), kunci tandatangan tetap
.github/workflows/          Binaan APK automatik
capacitor.config.json, package.json        Pembungkus Android (Capacitor)
```

## Memasang APK di telefon

1. Buka repo ini di GitHub → **Releases**.
2. Pilih binaan terkini → tekan `TuisyenSmart-XX.apk`.
3. Buka fail. Jika diminta, benarkan **"Pasang aplikasi tidak diketahui"**.
4. Tekan **Pasang**.

## Mengemas kini aplikasi

Pasang APK baharu terus di atas yang lama. **Jangan nyahpasang dahulu** — menyahpasang memadam semua data. Kemas kini boleh dipasang terus kerana semua binaan ditandatangani dengan kunci yang sama (`android-res/debug.keystore`). Jangan padam fail ini dan simpan repo sebagai **Private**.

## Cetak dan simpan fail dalam APK

- **Cetak** (resit, bil, laporan) membuka dialog cetak Android. Pilih pencetak atau **Simpan sebagai PDF** untuk dikongsi melalui WhatsApp.
- **Eksport CSV/sandaran** membuka menu kongsi Android: pilih Google Drive, Fail atau WhatsApp.

## Menjalankan di PC

```
cd www
python -m http.server 8080
```

Buka `http://localhost:8080` dalam Chrome atau Edge. Untuk pasang sebagai aplikasi PC, tekan ikon *Install* di bar alamat. Data di PC dan telefon adalah berasingan; gunakan Sandaran Data untuk memindahkan.

## Keselamatan

Aplikasi tidak menghantar data ke mana-mana pelayan dan tidak mempunyai kata laluan. Gunakan kunci skrin peranti. Fail sandaran mengandungi maklumat peribadi pelajar — simpan di tempat selamat.
