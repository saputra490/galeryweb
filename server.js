const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();

// Konfigurasi Cloudinary menggunakan Variabel Lingkungan Vercel (Environment Variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

app.use(session({
    secret: 'kunci-galeri-rahasia-multi-user-9988',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 5 * 60 * 1000, secure: false }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Menggunakan penyimpanan berbasis objek array konstan data ter-sinkronisasi
let DB_Foto = [];
let listPengguna = [];

const styleElegan = `
<style>
    * { box-sizing: border-box; font-family: -apple-system, sans-serif; margin: 0; padding: 0; }
    body { background-color: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; width: 100%; max-width: 400px; padding: 40px 30px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); text-align: center; }
    .status-badge { display: inline-block; padding: 6px 16px; background-color: #e8f5e9; color: #2e7d32; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    h2 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    p.subtitle { color: #757575; font-size: 14px; margin-bottom: 30px; }
    .input-group { text-align: left; margin-bottom: 20px; }
    .input-group label { display: block; font-size: 13px; font-weight: 600; color: #424242; margin-bottom: 8px; }
    .input-group input { width: 100%; padding: 14px 18px; background-color: #f5f5f5; border: 1px solid #eeeeee; border-radius: 14px; font-size: 15px; outline: none; }
    .btn-primary { width: 100%; padding: 16px; background-color: #1a1a1a; color: #ffffff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .footer-link { margin-top: 25px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #757575; }
    .footer-link a { color: #1a1a1a; text-decoration: none; font-weight: 700; }
</style>
`;

function halamanNotifKustom(pesan, isError, tujuanRedirect) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pemberitahuan</title><style>body { background: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, sans-serif; }.notif-box { background: ${isError ? '#fff5f5' : '#e8f5e9'}; color: ${isError ? '#e53e3e' : '#2e7d32'}; padding: 20px 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); font-weight: 600; }</style></head><body><div class="notif-box">${pesan}</div><script>setTimeout(() => { window.location.href = "${tujuanRedirect}"; }, 1200);</script></body></html>`;
}

app.get('/cek-sesi', (req, res) => {
    if (!req.session.username) return res.json({ aktif: false });
    res.json({ aktif: true });
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Daftar Akun</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Gabung Sekarang</div><h2>Daftar Akun</h2><p class="subtitle">Buat akun untuk mulai mengelola galeri foto anda</p><form action="/register" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" required></div><button type="submit" class="btn-primary">Daftar Akun</button></form><div class="footer-link">Sudah memiliki akun? <a href="/login-page">Masuk</a></div></div></body></html>`);
});

app.get('/login-page', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Login</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Selamat Datang</div><h2>Masuk</h2><p class="subtitle">Masuk ke akun anda untuk melanjutkan</p><form action="/login" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" required></div><button type="submit" class="btn-primary">Masuk</button></form></div></body></html>`);
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (listPengguna.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.send(halamanNotifKustom("Username sudah digunakan!", true, "/"));
    }
    listPengguna.push({ username, password });
    res.send(halamanNotifKustom("Akun berhasil dibuat!", false, "/login-page"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const userAda = listPengguna.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (userAda) {
        req.session.username = userAda.username.toLowerCase();
        res.redirect('/dashboard.html');
    } else {
        res.send(halamanNotifKustom("Username atau sandi salah!", true, "/login-page"));
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login-page');
});

// ENDPOINT PROSES UPLOAD LANGSUNG KE CLOUDINARY CLOUD STORAGE
app.post('/upload', async (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    
    try {
        const { gambarBase64, catatanTeks } = req.body;
        if (!gambarBase64) return res.status(400).send("Gambar tidak ditemukan");

        // Kirim berkas data URL langsung ke Cloudinary cloud API
        const hasilUpload = await cloudinary.uploader.upload(gambarBase64, {
            folder: 'galeri_web'
        });

        const sekarang = new Date();
        const tanggalKey = sekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const jamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const dataFotoBaru = { 
            username: req.session.username.toLowerCase(),
            namaFile: hasilUpload.secure_url, // Menggunakan URL awan publik permanen
            teks: catatanTeks || "",
            ukuran: hasilUpload.bytes,
            tanggal: tanggalKey,
            waktu: jamMenit,
            dilihat: 0,
            diunduh: 0,
            favorit: false,
            terhapus: false
        };

        DB_Foto.push(dataFotoBaru);
        res.status(200).json({ sukses: true });
    } catch (error) {
        console.error(error);
        res.status(500).send("Gagal mengunggah gambar ke Cloudinary");
    }
});

app.get('/daftar-foto', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const fotoSaya = DB_Foto.filter(item => item.username.toLowerCase() === req.session.username.toLowerCase());
    res.json([...fotoSaya].reverse());
});

// FIX RUTE TOMBOL FAVORIT
app.post('/favorit/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const decodeFile = decodeURIComponent(req.params.namaFile);
    const foto = DB_Foto.find(item => item.namaFile === decodeFile && item.username.toLowerCase() === req.session.username.toLowerCase());
    if (foto) {
        foto.favorit = !foto.favorit;
        res.json({ sukses: true, favorit: foto.favorit });
    } else {
        res.sendStatus(404);
    }
});

// SINKRONISASI LOGIKA HAPUS DAN TONG SAMPAH
app.post('/hapus/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const decodeFile = decodeURIComponent(req.params.namaFile);
    const foto = DB_Foto.find(item => item.namaFile === decodeFile && item.username.toLowerCase() === req.session.username.toLowerCase());
    if (foto) {
        foto.terhapus = true;
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

app.post('/pulihkan/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const decodeFile = decodeURIComponent(req.params.namaFile);
    const foto = DB_Foto.find(item => item.namaFile === decodeFile && item.username.toLowerCase() === req.session.username.toLowerCase());
    if (foto) {
        foto.terhapus = false;
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hapus-permanen/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const decodeFile = decodeURIComponent(req.params.namaFile);
    const indeks = DB_Foto.findIndex(item => item.namaFile === decodeFile && item.username.toLowerCase() === req.session.username.toLowerCase());
    if (indeks !== -1) {
        DB_Foto.splice(indeks, 1);
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

module.exports = app;

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server lokal aktif di port ${PORT}`));
}
