# Toko Sembako Yoga - Smart POS & Inventory System

Aplikasi web kasir warung sembako dengan fitur lengkap OCR scan resi supplier, manajemen stok, dan notifikasi kadaluarsa.

## 🚀 Features

- **Database-ready local backend** - app can run via `npm start` with a local JSON database server for products, users, sales, and settings

- **Smart POS System** - Kasir cepat dengan autokomplete produk
- **Inventory Management** - Manajemen stok real-time dengan peringatan stok menipis
- **OCR Scan Resi Supplier** - Scan nota supplier otomatis dengan AI (Tesseract.js)
- **Expiry Date Tracking** - Notifikasi barang kadaluarsa
- **Sales Reports** - Dashboard laporan penjualan detail
- **PWA Ready** - Bisa diinstall di HP sebagai aplikasi
- **Offline Support** - Bekerja tanpa internet dengan Service Worker
- **Android APK** - Wrapper native untuk Android via Capacitor

## 📱 Akses Aplikasi

**Online Version (GitHub Pages):**
- https://smur1411-glitch.github.io/project/

**Local Development:**
1. Clone repo ini
2. Jalankan aplikasi dari root project:
   ```bash
   npm start
   ```
3. Buka http://localhost:8000
4. Untuk mode frontend murni tanpa backend, tetap bisa serve folder `frontend`:
   ```bash
   python -m http.server 8000
   # atau
   npx http-server frontend
   ```

**Public / Online Deployment (gratis):**
- Frontend dapat dipublish ke GitHub Pages, Netlify, atau Vercel.
- Pilihan backend gratis yang disarankan: Supabase free tier.
- Aplikasi tidak lagi hardcoded ke `localhost`; ia memakai `window.location.origin` di local dan `config.js` untuk backend online.
- Edit nilai di [config.js](config.js) sesuai URL Supabase atau backend publik Anda sebelum deploy.
- Jika backend tidak tersedia, app akan otomatis fallback ke browser storage (IndexedDB).

### Panduan deploy gratis (Supabase + GitHub Pages)
1. Buat akun di https://supabase.com
2. Klik `New project`, isi nama project, password, region.
3. Setelah dibuat, buka `Project settings` > `API`.
4. Copy `Project URL` dan `anon public key`.
5. Edit file [config.js](config.js) lalu ganti URL dan key tersebut.
6. Push repo ke GitHub.
7. Buka repo GitHub > Settings > Pages > Source: GitHub Actions.
8. Pastikan workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml) ada di repo.
9. Commit dan push, lalu tunggu Pages selesai dibuat.
10. Setelah halaman aktif, cek app berjalan di domain GitHub Pages.

## 📲 Install sebagai App

### Di Browser Desktop/Mobile:
1. Buka aplikasi di browser
2. Klik tombol **"Install App"** (muncul di atas)
3. Pilih "Install" atau "Add to Home Screen"

### Di Android via APK:
Lihat folder `/android` untuk build dan install APK native.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: LocalStorage & IndexedDB (Browser)
- **OCR**: Tesseract.js (Client-side OCR)
- **PWA**: Service Worker, Manifest.json
- **Mobile**: Capacitor Framework (Android Wrapper)

## 📁 File Structure

```
├── frontend/                 # Frontend app (HTML, CSS, JS, manifest, PWA)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── config.js
│   ├── manifest.json
│   ├── sw.js
│   └── icon.svg
├── backend/                 # Local backend / JSON API for development
│   ├── server.js
│   └── data/
├── database/                # Supabase schema & SQL scripts
│   ├── supabase-schema.sql
│   ├── supabase-auth-owner.sql
│   └── supabase-rls-secure.sql
├── android/                 # Android wrapper project
├── .github/                 # Deploy workflow / GitHub automation
├── package.json             # Project scripts
├── README.md                # Setup & usage
├── render.yaml              # Optional hosting config
├── www/                     # Static web bundle / deploy assets
└── scripts/                # Extra helper scripts
```

## 💾 Data Storage

Semua data disimpan **di browser lokal** menggunakan:
- **LocalStorage**: Produk, penjualan, pembelian
- **IndexedDB**: Cache untuk offline mode
- **Tidak ada cloud sync** - Privacy first!

## 🔧 Build APK

```bash
cd android
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

Atau gunakan Android Studio:
1. File > Open > pilih folder `android/`
2. Build > Build APK
3. Hasilnya di `android/app/build/outputs/apk/debug/`

## 📝 Fitur Detail

### OCR Resi Supplier
- Ambil foto nota supplier
- AI otomatis parse nama barang, qty, harga
- Manual input teks nota juga tersedia

### Manajemen Stok
- Catat stok awal setiap produk
- Track pembelian & penjualan real-time
- Alert stok habis (< 0) dan menipis (< min qty)

### Peringatan Kadaluarsa
- Set tanggal exp di setiap produk
- Dashboard badge merah untuk expired/mendekati
- Laporan kadaluarsa per kategori

### Dashboard
- Summary: Total modal, omset hari ini, profit
- Daftar produk dengan status stok
- Grafik penjualan vs pembelian

## 📊 Laporan

- **Penjualan**: Per hari/bulan, detail transaksi
- **Pembelian**: History supplier, modal analisa
- **Stok**: Inventory opname, nilai stok
- **Produk**: List semua dengan harga modal/jual

## ⚙️ Pengaturan

- Nama toko & kontak
- Kategori produk custom
- Pajak/fee default
- Reset database (clear all data)

## 📄 License

Free & Open Source untuk usaha sendiri

---

**Dibuat dengan ❤️ untuk Warung Sembako Pak Yoga**
