9const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { MongoClient } = require('mongodb');
const fs = require('fs'); // Modul tambahan untuk membaca file secara utuh

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser('kunci_rahasia_galeri')); 

// Atur folder statis
app.use(express.static(path.resolve(__dirname, 'public')));

// KONEKSI MONGODB MODEL SERVERLESS
const uri = process.env.MONGODB_URI || process.env.URI_MONGODB;
let cachedClient = null;
let cachedDb = null;

async function hubungkanKeDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  if (!uri) {
    throw new Error("Variabel database (MONGODB_URI / URI_MONGODB) tidak terdefinisi!");
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('galeri_db');
  
  cachedClient = client;
  cachedDb = db;
  return { client, db };
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

// MIDDLEWARE PENGAMAN AKSES
function pastikanLogin(req, res, next) {
  const usernameCookie = req.signedCookies.user_session;
  if (!usernameCookie) {
    return res.redirect('/');
  }
  next();
}

// 1. RUTE UTAMA (Menggunakan fs.readFileSync untuk memecahkan eror 416)
app.get('/', (req, res) => {
  const usernameCookie = req.signedCookies.user_session;
  if (usernameCookie) {
    return res.redirect('/dashboard');
  }
  try {
    const htmlKosongFix = fs.readFileSync(path.resolve(__dirname, 'public', 'login.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlKosongFix);
  } catch (err) {
    res.status(500).send("Gagal memuat halaman login statis.");
  }
});

// 2. RUTE DASHBOARD UTAMA
app.get('/dashboard', pastikanLogin, (req, res) => {
  try {
    const dashboardHtml = fs.readFileSync(path.resolve(__dirname, 'public', 'dashboard.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(dashboardHtml);
  } catch (err) {
    res.status(500).send("Gagal memuat halaman dashboard.");
  }
});

// 3. RUTE DAFTAR AKUN (REGISTER)
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.send("Username dan password wajib diisi!");

    const { db } = await hubungkanKeDatabase();
    const penggunaDb = db.collection('pengguna');
    
    const userExist = await penggunaDb.findOne({ username });
    if (userExist) return res.send("Username sudah digunakan!");

    await penggunaDb.insertOne({ username, password });
    res.send("<script>alert('Akun berhasil dibuat!'); window.location='/';</script>");
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal mendaftarkan akun.");
  }
});

// 4. RUTE MASUK AKUN (LOGIN)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { db } = await hubungkanKeDatabase();
    const penggunaDb = db.collection('pengguna');
    
    const user = await penggunaDb.findOne({ username, password });
    if (user) {
      res.cookie('user_session', username, { signed: true, maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
      res.redirect('/dashboard');
    } else {
      res.send("<script>alert('Username atau password salah!'); window.location='/';</script>");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan sistem.");
  }
});

// 5. RUTE AMBIL DATA FOTO
app.get('/api/foto', pastikanLogin, async (req, res) => {
  try {
    const { db } = await hubungkanKeDatabase();
    const fotoDb = db.collection('foto');
    const daftarFoto = await fotoDb.find({}).toArray();
    res.json(daftarFoto);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat foto" });
  }
});

// 6. RUTE UNGGAH FOTO BARU
app.post('/api/upload', pastikanLogin, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Foto gagal diunggah");

    const { db } = await hubungkanKeDatabase();
    const fotoDb = db.collection('foto');
    await fotoDb.insertOne({
      url: req.file.path,
      public_id: req.file.filename,
      oleh: req.signedCookies.user_session,
      diunggahPada: new Date()
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal menyimpan data foto.");
  }
});

// 7. RUTE KELUAR AKUN (LOGOUT)
app.get('/logout', (req, res) => {
  res.clearCookie('user_session');
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server aktif di port ${PORT}`);
});

module.exports = app;

