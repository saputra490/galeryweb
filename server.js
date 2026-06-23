const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser('kunci_rahasia_galeri')); 

// KONEKSI MONGODB DINAMIS (ANTISIPASI VERCEL SERVERLESS RESET)
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function dapatkanKoleksi(namaKoleksi) {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  const db = client.db('galeri_db');
  return db.collection(namaKoleksi);
}

// KONFIGURASI CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'galeri_foto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});
const upload = multer({ storage: storage });

// PERBAIKAN UTAMA: Menggunakan __dirname langsung karena aset berada di root `photo-app`
app.use(express.static(__dirname));

// MIDDLEWARE CEK LOGIN (Mencegah user masuk dashboard sebelum login)
async function pastikanLogin(req, res, next) {
  const usernameCookie = req.signedCookies.user_session;
  if (!usernameCookie) {
    return res.redirect('/login');
  }
  next();
}

// 1. RUTE DAFTAR AKUN (REGISTER)
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.send("Username dan password wajib diisi!");
    }

    const penggunaDb = await dapatkanKoleksi('pengguna');
    
    // Cek apakah username sudah terdaftar
    const userExist = await penggunaDb.findOne({ username });
    if (userExist) {
      return res.send("Username sudah digunakan, cari nama lain!");
    }

    // Simpan akun ke MongoDB Cloud
    await penggunaDb.insertOne({ username, password });
    res.send("<script>alert('Akun berhasil dibuat! Silakan login.'); window.location='/login';</script>");
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal mendaftarkan akun ke database cloud.");
  }
});

// 2. RUTE MASUK AKUN (LOGIN)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const penggunaDb = await dapatkanKoleksi('pengguna');

    // Cari user di MongoDB
    const user = await penggunaDb.findOne({ username, password });

    if (user) {
      // Simpan session login ke cookie browser selama 1 hari agar tidak gampang keluar sendiri
      res.cookie('user_session', username, { signed: true, maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      res.redirect('/dashboard');
    } else {
      res.send("<script>alert('Username atau password salah!'); window.location='/login';</script>");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan pada server saat login.");
  }
});

// 3. RUTE DASHBOARD UTAMA (Diproteksi harus login dulu)
app.get('/dashboard', pastikanLogin, async (req, res) => {
  // PERBAIKAN: Langsung membaca index.html dari root folder proyek
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// 4. RUTE AMBIL DAFTAR FOTO DARI MONGODB
app.get('/api/foto', pastikanLogin, async (req, res) => {
  try {
    const fotoDb = await dapatkanKoleksi('foto');
    const daftarFoto = await fotoDb.find({}).toArray();
    res.json(daftarFoto);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat foto" });
  }
});

// 5. RUTE UNGGAH FOTO BARU
app.post('/api/upload', pastikanLogin, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Foto gagal diunggah");

    const fotoDb = await dapatkanKoleksi('foto');
    await fotoDb.insertOne({
      url: req.file.path,
      public_id: req.file.filename,
      oleh: req.signedCookies.user_session,
      diunggahPada: new Date()
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal menyimpan data foto ke database cloud.");
  }
});

// 6. RUTE KELUAR AKUN (LOGOUT)
app.get('/logout', (req, res) => {
  res.clearCookie('user_session');
  res.redirect('/login');
});

// MENJALANKAN SERVER LOCAL / CLOUD
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server aktif di port ${PORT}`);
});

module.exports = app;

