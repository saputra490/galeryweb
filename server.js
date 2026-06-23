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

// KONEKSI MONGODB SERVERLESS (Aman & Menggunakan Promise)
const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  console.error("PENTING: Variabel MONGODB_URI belum diatur di Environment Variables Vercel!");
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect(); // Menyimpan promise koneksi
}

async function dapatkanKoleksi(namaKoleksi) {
  if (!clientPromise) {
    throw new Error("Koneksi database belum diinisialisasi.");
  }
  const koneksiDb = await clientPromise;
  const db = koneksiDb.db('galeri_db');
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

// Membaca file statis langsung dari root folder proyek
app.use(express.static(__dirname));

// MIDDLEWARE PENGAMAN DASHBOARD
async function pastikanLogin(req, res, next) {
  const usernameCookie = req.signedCookies.user_session;
  if (!usernameCookie) {
    return res.redirect('/');
  }
  next();
}

// 1. RUTE UTAMA (Menyajikan halaman login/index pertama kali)
app.get('/', (req, res) => {
  const usernameCookie = req.signedCookies.user_session;
  if (usernameCookie) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. RUTE DAFTAR AKUN (REGISTER)
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.send("Username dan password wajib diisi!");
    }

    const penggunaDb = await dapatkanKoleksi('pengguna');
    const userExist = await penggunaDb.findOne({ username });
    if (userExist) {
      return res.send("Username sudah digunakan, cari nama lain!");
    }

    await penggunaDb.insertOne({ username, password });
    res.send("<script>alert('Akun berhasil dibuat! Silakan login.'); window.location='/';</script>");
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal mendaftarkan akun. Pastikan MONGODB_URI di Vercel sudah benar.");
  }
});

// 3. RUTE MASUK AKUN (LOGIN)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const penggunaDb = await dapatkanKoleksi('pengguna');
    const user = await penggunaDb.findOne({ username, password });

    if (user) {
      res.cookie('user_session', username, { signed: true, maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      res.redirect('/dashboard');
    } else {
      res.send("<script>alert('Username atau password salah!'); window.location='/';</script>");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan sistem saat proses login.");
  }
});

// 4. RUTE DASHBOARD UTAMA
app.get('/dashboard', pastikanLogin, async (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// 5. RUTE AMBIL DATA FOTO
app.get('/api/foto', pastikanLogin, async (req, res) => {
  try {
    const fotoDb = await dapatkanKoleksi('foto');
    const daftarFoto = await fotoDb.find({}).toArray();
    res.json(daftarFoto);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat foto dari database" });
  }
});

// 6. RUTE UNGGAH FOTO BARU
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
    res.status(500).send("Gagal menyimpan data foto ke Cloudinary/MongoDB.");
  }
});

// 7. RUTE KELUAR AKUN (LOGOUT)
app.get('/logout', (req, res) => {
  res.clearCookie('user_session');
  res.redirect('/');
});

// MENJALANKAN SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server aktif di port ${PORT}`);
});

module.exports = app;
