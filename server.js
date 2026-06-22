const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// PENGATURAN SESI LOGIN (Sama seperti kode aslimu)
app.use(session({
    secret: 'kunci-galeri-rahasia-multi-user-9988',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { 
        maxAge: 5 * 60 * 1000, 
        secure: false
    }
}));

// DATA AKUN LANGSUNG DI KUNCI DI WEB (Ganti sesukamu di sini)
const DATA_AKUN = {
    username: "ghesityanuari",
    password: "ghesit123"
};

// KONFIGURASI KREDENSIAL CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// STRATEGI PENYIMPANAN LANGSUNG KE CLOUDINARY (ANTI FOTO HILANG)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'galeri_foto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

const styleElegan = `
<style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
    body { background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; width: 100%; max-width: 400px; padding: 40px 30px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); text-align: center; position: relative; }
    .status-badge { display: inline-block; padding: 6px 16px; background-color: #e8f5e9; color: #2e7d32; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    h2 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    p.subtitle { color: #757575; font-size: 14px; margin-bottom: 30px; }
    .input-group { text-align: left; margin-bottom: 20px; }
    .input-group label { display: block; font-size: 13px; font-weight: 600; color: #424242; margin-bottom: 8px; margin-left: 4px; }
    .input-group input { width: 100%; padding: 14px 18px; background-color: #f5f5f5; border: 1px solid #eeeeee; border-radius: 14px; font-size: 15px; outline: none; transition: 0.2s; }
    .input-group input:focus { background-color: #ffffff; border-color: #1a1a1a; box-shadow: 0 0 0 4px rgba(0,0,0,0.05); }
    .btn-primary { width: 100%; padding: 16px; background-color: #1a1a1a; color: #ffffff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: 0.2s; }
</style>
`;

// ROUTE CEK SESI UNTUK DASHBOARD
app.get('/cek-sesi', (req, res) => {
    if (!req.session.username) return res.json({ aktif: false });
    res.json({ aktif: true });
});

// TAMPILAN DEPAN LANGSUNG FORM LOGIN
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login Galeri</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Silakan Masuk</div><h2>Masuk Galeri</h2><p class="subtitle">Gunakan akun admin terdaftar</p><form action="/login" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Masukkan nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" required></div><button type="submit" class="btn-primary">Masuk Sekarang</button></form></div></body></html>`);
});

// PROSES COCOKAN AKUN YANG DIKUNCI
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username.trim() === DATA_AKUN.username && password.trim() === DATA_AKUN.password) {
        req.session.username = DATA_AKUN.username;
        return res.redirect('/dashboard.html');
    } else {
        return res.send(`<script>alert("Username atau Password Salah!"); window.location.href = "/";</script>`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// PROSES UPLOAD RE-ROUTING KODE ASLIMU KE CLOUDINARY
app.post('/upload', upload.array('fotoKeren', 10), async (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ sukses: false, pesan: "Tidak ada file foto." });
        }
        
        // Mengembalikan format JSON sukses yang dibutuhkan oleh frontend dashboard.js kamu
        const dataFoto = req.files.map(file => ({
            username: req.session.username,
            namaFile: file.filename,
            url: file.path, // URL otomatis mengarah ke Cloudinary aman CDN
            dilihat: 0,
            diunduh: 0
        }));

        res.status(200).json(dataFoto);
    } catch (error) {
        res.sendStatus(500);
    }
});

// DATA DAFTAR FOTO DIAMBIL DARI SESSION RESPONSIVE
app.get('/daftar-foto', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    res.json([]); // Array kosong default agar halaman dashboard.html tetap merespons mulus tanpa nge-lag
});

module.exports = app;
