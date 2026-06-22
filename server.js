const express = require('express');
const path = require('path');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// KONEKSI MONGODB GLOBAL POOL
const uri = process.env.MONGODB_URI;
let clientCached = null;

async function dapatkanKoleksi(namaKoleksi) {
    if (!uri) throw new Error("MONGODB_URI belum diatur di Environment Variables Vercel!");
    if (!clientCached) {
        clientCached = new MongoClient(uri);
        await clientCached.connect();
    }
    const db = clientCached.db('galeri_db');
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

app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_CONFIG = {
    username: "admin",
    password: "pw ghesityanuari"
};

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
    .footer-link { margin-top: 25px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #757575; }
    .footer-link a { color: #1a1a1a; text-decoration: none; font-weight: 700; margin-left: 5px; }
</style>
`;

function halamanNotifKustom(pesan, isError, tujuanRedirect) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pemberitahuan</title><style>body { background: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, sans-serif; margin: 0; }.notif-box { background: ${isError ? '#fff5f5' : '#e8f5e9'}; color: ${isError ? '#e53e3e' : '#2e7d32'}; padding: 20px 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); font-weight: 600; font-size: 16px; text-align: center; max-width: 90%; }</style></head><body><div class="notif-box">${pesan}</div><script>setTimeout(() => { window.location.href = "${tujuanRedirect}"; }, 1200);</script></body></html>`;
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Daftar Akun</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Gabung Sekarang</div><h2>Daftar Akun</h2><p class="subtitle">Buat akun untuk mulai mengelola galeri foto anda</p><form action="/register" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Buat nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Buat kata sandi" required></div><button type="submit" class="btn-primary">Daftar Akun</button></form><div class="footer-link">Sudah memiliki akun? <a href="/login-page">Masuk di sini</a></div></div></body></html>`);
});

app.get('/login-page', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Selamat Datang</div><h2>Masuk</h2><p class="subtitle">Masuk ke akun anda untuk melanjutkan</p><form action="/login" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Masukkan nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" required></div><button type="submit" class="btn-primary">Masuk Sekarang</button></form><div class="footer-link">Belum punya akun? <a href="/">Daftar di sini</a></div></div></body></html>`);
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const p_Koleksi = await dapatkanKoleksi('pengguna');
        const userAda = await p_Koleksi.findOne({ username: username.trim().toLowerCase() });
        
        if (userAda) {
            return res.send(halamanNotifKustom("Username sudah digunakan!", true, "/"));
        }
        
        await p_Koleksi.insertOne({ username: username.trim().toLowerCase(), password: password.trim() });
        res.send(halamanNotifKustom("Akun berhasil dibuat!", false, "/login-page"));
    } catch (e) {
        res.send(halamanNotifKustom(`Gagal mendaftar: ${e.message}`, true, "/"));
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const uClean = username.trim().toLowerCase();
    const pClean = password.trim();

    try {
        if (uClean === ADMIN_CONFIG.username && pClean === ADMIN_CONFIG.password) {
            return res.redirect('/dashboard.html');
        }
        
        const p_Koleksi = await dapatkanKoleksi('pengguna');
        const userAda = await p_Koleksi.findOne({ username: uClean, password: pClean });
        
        if (userAda) {
            return res.redirect('/dashboard.html');
        }
        
        res.send(halamanNotifKustom("Username atau sandi salah!", true, "/login-page"));
    } catch (e) {
        res.send(halamanNotifKustom(`Terjadi kesalahan server: ${e.message}`, true, "/login-page"));
    }
});

app.post('/upload', upload.array('foto'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ sukses: false, pesan: "Tidak ada file foto." });
        }
        const catatanTeks = req.body.catatanTeks || "";
        const sekarang = new Date();
        const tanggalKey = sekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const jamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const f_Koleksi = await dapatkanKoleksi('foto');
        const listFotoTerupload = [];
        
        for (const file of req.files) {
            const dataFotoBaru = { 
                username: "user",
                namaFile: file.filename,
                url: file.path, 
                teks: catatanTeks,
                ukuran: file.size,
                tanggal: tanggalKey,
                waktu: jamMenit,
                dilihat: 0,
                diunduh: 0,
                favorit: false,
                terhapus: false
            };
            await f_Koleksi.insertOne(dataFotoBaru);
            listFotoTerupload.push(dataFotoBaru);
        }
        res.status(200).json({ sukses: true, data: listFotoTerupload });
    } catch (error) {
        res.status(500).json({ sukses: false, error: error.message });
    }
});

app.get('/daftar-foto', async (req, res) => {
    try {
        const f_Koleksi = await dapatkanKoleksi('foto');
        const data = await f_Koleksi.find({}).sort({ _id: -1 }).toArray();
        res.json(data);
    } catch {
        res.json([]);
    }
});

module.exports = app;
