# Panduan AutoDM (Bahasa Indonesia)

Panduan lama ini telah diganti karena alur login Instagram Meta berubah ke **Instagram API with
Instagram Login Unified Login**. Gunakan panduan berbahasa Inggris berikut sebagai sumber terbaru:

- [Konfigurasi lokal](configuration.md)
- [Setup Meta dan Unified Login](meta-setup.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)

Ringkasan alur setup:

1. Siapkan database PostgreSQL dan isi `DATABASE_URL` serta `DATABASE_URL_UNPOOLED`.
2. Isi `APP_SECRET` dan `CRON_SECRET` di `.env.local` untuk pengembangan lokal.
3. Jalankan migrasi database, lalu mulai aplikasi dan ganti password admin awal.
4. Di Meta, buat konfigurasi Facebook Login for Business untuk Unified Login, pilih token SUAT,
   lalu masukkan App ID, Configuration ID, dan App Secret ke **Settings → Instagram** di AutoDM.
5. Hubungkan akun Instagram Professional dan atur webhook memakai callback URL serta verify token
   yang ditampilkan oleh AutoDM.
6. Uji aturan komentar menggunakan akun penguji sebelum mengaktifkan aplikasi untuk pengguna lain.

Untuk produksi, baca [deployment.md](deployment.md) dan [meta-setup.md](meta-setup.md) secara
lengkap. Jangan kirim App Secret, token, password database, atau nilai `.env.local` lewat chat.
