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
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_super_aman_galeri_123';

// 1. Konfigurasi Cloudinary (Mengambil dari Environment Variables Vercel)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Setup Storage Cloudinary untuk Multer (Kamera & Galeri)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'galeri_foto_lengkap',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// 3. Middleware Utama
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Koneksi Database MongoDB Cloud (Aman & Anti-Crash)
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;

async function connectDB() {
    try {
        if (!MONGODB_URI) {
            console.error("PERINGATAN: MONGODB_URI belum dipasang di Environment Variables!");
            return;
        }
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log("Database MongoDB Berhasil Terhubung Sempurna!");
    } catch (err) {
        console.error("Gagal koneksi database cloud:", err.message);
    }
}
connectDB();

// 5. Middleware Autentikasi JWT (Proteksi API & Dashboard)
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Akses ditolak, silakan login dahulu!' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ status: 'error', message: 'Sesi habis, silakan login kembali!' });
        req.user = user;
        next();
    });
};

// --- ENDPOINT API UTAMA ---

// Akses Halaman Utama otomatis ke Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API: Registrasi Akun Baru
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ status: 'error', message: 'Username dan Password wajib diisi!' });
        if (!db) return res.status(500).json({ status: 'error', message: 'Database belum siap terhubung!' });

        const usersCollection = db.collection('users');
        const userExists = await usersCollection.findOne({ username });
        if (userExists) return res.status(400).json({ status: 'error', message: 'Username ini sudah terdaftar!' });

        await usersCollection.insertOne({ username, password, createdAt: new Date() });
        res.json({ status: 'success', message: 'Akun berhasil dibuat! Silakan login.' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Login Pengguna
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!db) return res.status(500).json({ status: 'error', message: 'Koneksi database Vercel Anda belum siap. Cek kembali MONGODB_URI!' });

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username, password });
        if (!user) return res.status(401).json({ status: 'error', message: 'Username atau password salah!' });

        // Buat token JWT
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        
        // Simpan token di Cookie HTTP-Only agar aman
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
        res.json({ status: 'success', token, message: 'Login sukses!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Mengambil Foto Berdasarkan Filter (Semua, Favorit, Sampah)
app.get('/api/photos', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ status: 'error', message: 'Database belum aktif!' });
        
        const type = req.query.type || 'all';
        const photosCollection = db.collection('photos');
        
        let query = { userId: req.user.id };

        // Logika Filter Tab Menu
        if (type === 'all') {
            query.isDeleted = { $ne: true }; // Foto yang tidak dihapus
        } else if (type === 'fav') {
            query.isFavorite = true;
            query.isDeleted = { $ne: true }; // Favorit dan tidak di sampah
        } else if (type === 'trash') {
            query.isDeleted = true; // Foto di dalam sampah
        }

        const photos = await photosCollection.find(query).sort({ uploadedAt: -1 }).toArray();
        res.json({ status: 'success', data: photos });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Unggah Foto Baru (Dari Kamera atau Galeri HP)
app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'Gagal mengunggah file gambar!' });
        if (!db) return res.status(500).json({ status: 'error', message: 'Database tidak terdeteksi!' });

        const photosCollection = db.collection('photos');
        const newPhoto = {
            userId: req.user.id,
            imageUrl: req.file.path, // Tautan URL asli Cloudinary
            publicId: req.file.filename,
            title: req.body.title || 'Tanpa Judul',
            isFavorite: false,
            isDeleted: false,
            uploadedAt: new Date()
        };

        await photosCollection.insertOne(newPhoto);
        res.json({ status: 'success', message: 'Foto berhasil disimpan ke galeri!', data: newPhoto });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Mengubah Status Favorit (Suka / Tidak Suka)
app.put('/api/photos/:id/favorite', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ status: 'error', message: 'Database offline!' });
        const { isFavorite } = req.body;
        
        await db.collection('photos').updateOne(
            { _id: new ObjectId(req.params.id), userId: req.user.id },
            { $set: { isFavorite: isFavorite } }
        );
        res.json({ status: 'success', message: 'Status favorit diperbarui!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Memindahkan Foto ke Tempat Sampah (Soft Delete)
app.put('/api/photos/:id/trash', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ status: 'error', message: 'Database offline!' });
        const { isDeleted } = req.body; // true = ke sampah, false = pulihkan
        
        await db.collection('photos').updateOne(
            { _id: new ObjectId(req.params.id), userId: req.user.id },
            { $set: { isDeleted: isDeleted } }
        );
        res.json({ status: 'success', message: isDeleted ? 'Foto dipindahkan ke sampah!' : 'Foto berhasil dipulihkan!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API: Menghapus Foto Permanen (Dari DB & Cloudinary)
app.delete('/api/photos/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ status: 'error', message: 'Database belum terhubung!' });
        
        const photosCollection = db.collection('photos');
        const photo = await photosCollection.findOne({ _id: new ObjectId(req.params.id), userId: req.user.id });
        
        if (!photo) return res.status(404).json({ status: 'error', message: 'Foto tidak ditemukan!' });

        // 1. Hapus aset gambar fisik dari Cloudinary
        await cloudinary.uploader.destroy(photo.publicId);

        // 2. Hapus data dokumen dari MongoDB
        await photosCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        res.json({ status: 'success', message: 'Foto dihapus secara permanen!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Menjalankan Server Utama
app.listen(PORT, () => {
    console.log(`Server aktif berjalan lancar di port ${PORT}`);
});

module.exports = app;
