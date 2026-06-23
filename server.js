const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Melayani file statis frontend (jika ada folder public)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. DATABASE & CLOUDINARY CONFIGURATION
// ==========================================
const uri = process.env.MONGODB_URI || process.env.URI_MONGODB;

if (!uri) {
  console.error("PENTING: Variabel MONGODB_URI atau URI_MONGODB tidak ditemukan di Environment Variables!");
}

// Konfigurasi Kredensial Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Multer Storage ke Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'galeri_foto_app',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  },
});
const upload = multer({ storage: storage });

// Koneksi Global Database MongoDB
let db;
MongoClient.connect(uri)
  .then(client => {
    console.log('=== KONEKSI DATABASE MONGODB BERHASIL AKTIF ===');
    db = client.db('galeri_db');
  })
  .catch(error => {
    console.error('=== GAGAL TERHUBUNG KE MONGODB ===', error);
  });

// ==========================================
// 3. AUTHENTICATION ROUTES (REGISTRASI & LOGIN)
// ==========================================

// Fitur Registrasi Pengguna Baru
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Semua kolom formulir wajib diisi!' });
    }

    const usersCollection = db.collection('users');
    const userExists = await usersCollection.findOne({ $or: [{ username }, { email }] });
    
    if (userExists) {
      return res.status(400).json({ message: 'Username atau Email sudah terdaftar!' });
    }

    const newUser = { username, password, email, createdAt: new Date() };
    await usersCollection.insertOne(newUser);

    res.status(201).json({ success: true, message: 'Akun berhasil dibuat! Silakan login.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal registrasi', error: error.message });
  }
});

// Fitur Login Pengguna
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    // Set cookie sesi sederhana untuk penanda login frontend
    res.cookie('user_session', user._id.toString(), { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.status(200).json({ success: true, message: 'Login sukses!', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Gagal login', error: error.message });
  }
});

// Fitur Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user_session');
  res.status(200).json({ success: true, message: 'Berhasil keluar dari sistem.' });
});

// ==========================================
// 4. CORE FEATURES ROUTES (UPLOAD & AMBIL FOTO)
// ==========================================

// Mengunggah Foto Baru ke Cloudinary dan Simpan Tautannya ke MongoDB
app.post('/api/photos/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File gambar wajib dipilih!' });
    }

    const { title, description, userId } = req.body;
    const photosCollection = db.collection('photos');

    const newPhoto = {
      title: title || 'Tanpa Judul',
      description: description || '',
      imageUrl: req.file.path, // Tautan gambar otomatis dari Cloudinary
      cloudinaryId: req.file.filename,
      userId: userId || 'anonymous',
      uploadedAt: new Date()
    };

    await photosCollection.insertOne(newPhoto);
    res.status(201).json({ success: true, message: 'Foto sukses diunggah!', data: newPhoto });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunggah foto', error: error.message });
  }
});

// Mengambil Semua Daftar Foto dari Database
app.get('/api/photos', async (req, res) => {
  try {
    const photosCollection = db.collection('photos');
    const photos = await photosCollection.find().sort({ uploadedAt: -1 }).toArray();
    res.status(200).json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data foto', error: error.message });
  }
});

// Rute Utama / Landing Page Induk
app.get('/', (req, res) => {
  res.send(`
    <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
      <h1>📸 API Server Galeri Foto Aktif Sempurna</h1>
      <p>Koneksi Database dan Cloud Storage berjalan dengan normal di Vercel.</p>
    </div>
  `);
});

// ==========================================
// 5. SERVER RUNNER
// ==========================================
app.listen(PORT, () => {
  console.log(`Server berjalan lancar di port ${PORT}`);
});
