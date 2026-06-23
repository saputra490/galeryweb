const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_super_aman_123';

// 1. Konfigurasi Cloudinary (Mengambil dari Environment Variables Vercel)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Setup Storage Cloudinary untuk Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'galeri_foto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// 3. Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Koneksi MongoDB Aman
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/galeri');
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db();
        console.log("Terhubung ke MongoDB");
    } catch (err) {
        console.error("Gagal koneksi database:", err.message);
    }
}
connectDB();

// 5. Middleware Autentikasi JWT (Melindungi halaman Dashboard/API)
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Akses ditolak, silakan login!' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ status: 'error', message: 'Token tidak valid atau kedaluwarsa!' });
        req.user = user;
        next();
    });
};

// --- ENDPOINT API LENGKAP ---

// Cek status server backend
app.get('/status-server', (req, res) => {
    res.send("<h1>📸 API Server Galeri Foto Aktif Sempurna</h1><p>Koneksi database & Cloudinary berjalan dengan normal di Vercel.</p>");
});

// Arahkan halaman utama ke halaman login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API Registrasi Pengguna
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ status: 'error', message: 'Data tidak lengkap!' });

        const usersCollection = db.collection('users');
        const userExists = await usersCollection.findOne({ username });
        if (userExists) return res.status(400).json({ status: 'error', message: 'Username sudah terdaftar!' });

        await usersCollection.insertOne({ username, password, createdAt: new Date() });
        res.json({ status: 'success', message: 'Registrasi berhasil!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Login Pengguna
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ username, password });
        if (!user) return res.status(401).json({ status: 'error', message: 'Username atau password salah!' });

        // Buat token JWT
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        
        // Simpan token di HTTP-Only Cookie agar aman
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
        res.json({ status: 'success', token, message: 'Login sukses!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Mengambil Semua Foto (Hanya jika sudah login)
app.get('/api/photos', authenticateToken, async (req, res) => {
    try {
        const photosCollection = db.collection('photos');
        const photos = await photosCollection.find({ userId: req.user.id }).sort({ uploadedAt: -1 }).toArray();
        res.json({ status: 'success', data: photos });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Mengunggah Foto Ke Cloudinary & Menyimpan Link ke MongoDB
app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'Gagal mengunggah file gambar!' });

        const photosCollection = db.collection('photos');
        const newPhoto = {
            userId: req.user.id,
            imageUrl: req.file.path, // URL dari Cloudinary
            publicId: req.file.filename,
            title: req.body.title || 'Tanpa Judul',
            uploadedAt: new Date()
        };

        await photosCollection.insertOne(newPhoto);
        res.json({ status: 'success', message: 'Foto berhasil disimpan!', data: newPhoto });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Menghapus Foto dari MongoDB & Cloudinary
app.delete('/api/photos/:id', authenticateToken, async (req, res) => {
    try {
        const photoId = req.params.id;
        const photosCollection = db.collection('photos');

        const photo = await photosCollection.findOne({ _id: new ObjectId(photoId), userId: req.user.id });
        if (!photo) return res.status(404).json({ status: 'error', message: 'Foto tidak ditemukan!' });

        // Hapus dari Cloudinary terlebih dahulu
        await cloudinary.uploader.destroy(photo.publicId);

        // Hapus dari MongoDB
        await photosCollection.deleteOne({ _id: new ObjectId(photoId) });
        res.json({ status: 'success', message: 'Foto berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});

module.exports = app;
