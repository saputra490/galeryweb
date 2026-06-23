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

// 1. Konfigurasi Cloudinary
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

// 3. Middleware Utama
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Koneksi MongoDB dengan Proteksi Variabel Aman
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/galeri';
let db = null;

async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
        console.log("Database MongoDB Berhasil Terhubung!");
    } catch (err) {
        console.error("PERINGATAN KONEKSI DATABASE:", err.message);
        // Tetap biarkan aplikasi berjalan walaupun database cloud belum siap
    }
}
connectDB();

// 5. Middleware Autentikasi JWT
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Akses ditolak, silakan login!' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ status: 'error', message: 'Sesi habis, silakan login kembali!' });
        req.user = user;
        next();
    });
};

// --- ENDPOINT API UTAMA ---

// Halaman Utama otomatis mengarah ke login.html di dalam folder public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API Registrasi Pengguna
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ status: 'error', message: 'Data tidak lengkap!' });

        if (!db) return res.status(500).json({ status: 'error', message: 'Server Database belum siap terhubung!' });

        const usersCollection = db.collection('users');
        const userExists = await usersCollection.findOne({ username });
        if (userExists) return res.status(400).json({ status: 'error', message: 'Username sudah digunakan!' });

        await usersCollection.insertOne({ username, password, createdAt: new Date() });
        res.json({ status: 'success', message: 'Registrasi berhasil!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Login Pengguna dengan Proteksi Eror Undefined 'collection'
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validasi jika koneksi MongoDB cloud Anda belum aktif/gagal loading
        if (!db) {
            return res.status(500).json({ 
                status: 'error', 
                message: 'Koneksi database cloud Vercel Anda belum siap terhubung. SIlakan cek MONGODB_URI di Environment Variables!' 
            });
        }

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username, password });
        
        if (!user) {
            return res.status(401).json({ status: 'error', message: 'Username atau password salah!' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
        
        res.json({ status: 'success', token, message: 'Login sukses!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Mengambil Semua Foto di Galeri
app.get('/api/photos', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ status: 'error', message: 'Database belum terhubung!' });

        const photosCollection = db.collection('photos');
        const photos = await photosCollection.find({ userId: req.user.id }).sort({ uploadedAt: -1 }).toArray();
        res.json({ status: 'success', data: photos });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Unggah Foto Ke Cloudinary & Simpan ke MongoDB
app.post('/api/photos/upload', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'File gambar wajib diunggah!' });
        if (!db) return res.status(500).json({ status: 'error', message: 'Database tidak terdeteksi!' });

        const photosCollection = db.collection('photos');
        const newPhoto = {
            userId: req.user.id,
            imageUrl: req.file.path,
            publicId: req.file.filename,
            title: req.body.title || 'Tanpa Judul',
            uploadedAt: new Date()
        };

        await photosCollection.insertOne(newPhoto);
        res.json({ status: 'success', message: 'Foto berhasil disimpan di galeri!', data: newPhoto });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// API Menghapus Foto dari MongoDB & Cloudinary
app.delete('/api/photos/:id', authenticateToken, async (req, res) => {
    try {
        const photoId = req.params.id;
        if (!db) return res.status(500).json({ status: 'error', message: 'Database belum aktif!' });

        const photosCollection = db.collection('photos');
        const photo = await photosCollection.findOne({ _id: new ObjectId(photoId), userId: req.user.id });
        if (!photo) return res.status(404).json({ status: 'error', message: 'Foto tidak ditemukan!' });

        await cloudinary.uploader.destroy(photo.publicId);
        await photosCollection.deleteOne({ _id: new ObjectId(photoId) });

        res.json({ status: 'success', message: 'Foto berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server aktif berjalan di port ${PORT}`);
});

module.exports = app;
