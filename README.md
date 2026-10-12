# Tuisyen Smart

Sistem pengurusan tuisyen persendirian yang berjalan sepenuhnya offline. Kod aplikasi berada dalam folder `www/`. GitHub Actions membina fail APK Android secara automatik setiap kali kod dikemas kini.

## Struktur repo

```
www/                        Aplikasi (HTML, CSS, JS, ikon)
android-res/                Ikon pelancar Android + kunci tandatangan tetap
.github/workflows/          Arahan binaan APK automatik
capacitor.config.json       Tetapan pembungkus Android (Capacitor)
package.json                Senarai pakej Capacitor
```

## Memasang APK di telefon

1. Buka repo ini di GitHub → bahagian **Releases** (di sebelah kanan, atau di bawah pada telefon).
2. Pilih binaan terkini → tekan fail `TuisyenSmart-XX.apk` untuk muat turun.
3. Buka fail yang dimuat turun. Jika diminta, benarkan **"Pasang aplikasi tidak diketahui"** untuk Chrome / Pengurus Fail.
4. Tekan **Pasang**. Ikon Tuisyen Smart akan muncul di skrin utama.

Semua fail aplikasi dibungkus dalam APK. Tiada internet diperlukan dan data disimpan dalam telefon sahaja.

## Mengemas kini aplikasi

Setiap kali kod dalam `www/` dikemas kini dan dihantar (push) ke cabang `main`, GitHub membina APK baharu dan menerbitkannya di Releases. Pasang APK baharu terus di atas aplikasi lama: **jangan nyahpasang dahulu**, kerana menyahpasang akan memadam semua data dalam aplikasi.

Kemas kini boleh dipasang terus kerana semua binaan ditandatangani dengan kunci yang sama (`android-res/debug.keystore`). Jangan padam atau tukar fail ini. Simpan repo ini sebagai **Private**.

## Menjalankan di PC (pilihan)

```
cd www
python -m http.server 8080
```

Buka `http://localhost:8080` dalam Chrome atau Edge.
