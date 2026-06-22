const express = require('express');
const path = require('path');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// KONFIGURASI KREDENSIAL CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// STORAGE CONFIGURATION UNTUK MULTER CLOUDINARY
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'galeri_foto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

let DB_Foto = [];
let listPengguna = [];

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

app.get('/cek-sesi', (req, res) => {
    res.json({ aktif: true });
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Daftar Akun</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Gabung Sekarang</div><h2>Daftar Akun</h2><p class="subtitle">Buat akun untuk mulai mengelola galeri foto anda</p><form action="/register" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Buat nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Buat kata sandi" required></div><button type="submit" class="btn-primary">Daftar Akun</button></form><div class="footer-link">Sudah memiliki akun? <a href="/login-page">Masuk di sini</a></div></div></body></html>`);
});

app.get('/login-page', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Selamat Datang</div><h2>Masuk</h2><p class="subtitle">Masuk ke akun anda untuk melanjutkan</p><form action="/login" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Masukkan nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" required></div><button type="submit" class="btn-primary">Masuk Sekarang</button></form><div class="footer-link">Belum punya akun? <a href="/">Daftar di sini</a></div></div></body></html>`);
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
    if (userAda || username === ADMIN_CONFIG.username) {
        res.redirect('/dashboard.html');
    } else {
        res.send(halamanNotifKustom("Username atau sandi salah!", true, "/login-page"));
    }
});

app.get('/logout', (req, res) => {
    res.redirect('/login-page');
});

// ENDPOINT UPLOAD OPTIMAL UNTUK VERCEL SERVERLESS
app.post('/upload', upload.array('foto'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ sukses: false, pesan: "Tidak ada file foto yang dipilih." });
        }

        const catatanTeks = req.body.catatanTeks || "";
        const sekarang = new Date();
        const tanggalKey = sekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const jamMenit = Thermal = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const listFotoTerupload = [];

        req.files.forEach(file => {
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
            DB_Foto.push(dataFotoBaru);
            listFotoTerupload.push(dataFotoBaru);
        });

        // Kirim response JSON sukses agar frontend tahu upload ke Cloudinary berhasil
        res.status(200).json({ sukses: true, data: listFotoTerupload });
    } catch (error) {
        res.status(500).json({ sukses: false, error: error.message });
    }
});

app.get('/daftar-foto', (req, res) => {
    res.json([...DB_Foto].reverse());
});

app.post('/favorit/:namaFile', (req, res) => {
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.favorit = !foto.favorit;
        res.json({ sukses: true, favorit: foto.favorit });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hitung-lihat/:namaFile', (req, res) => {
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.dilihat = (foto.dilihat || 0) + 1;
        res.json({ sukses: true, dilihat: foto.dilihat });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hitung-unduh/:namaFile', (req, res) => {
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.diunduh = (foto.diunduh || 0) + 1;
        res.json({ sukses: true, diunduh: foto.diunduh });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hapus/:namaFile', (req, res) => {
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.terhapus = true;
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

app.post('/pulihkan/:namaFile', (req, res) => {
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.terhapus = false;
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hapus-permanen/:namaFile', (req, res) => {
    const indeks = DB_Foto.findIndex(item => item.namaFile === req.params.namaFile);
    if (indeks !== -1) {
        DB_Foto.splice(indeks, 1);
        res.json({ sukses: true });
    } else {
        res.sendStatus(404);
    }
});

app.get('/admin-sakti', (req, res) => {
    let barisTabel = '';
    listPengguna.forEach((u, index) => {
        barisTabel += `<tr><td style="padding:12px;border:1px solid #ddd;text-align:center;">${index+1}</td><td style="padding:12px;border:1px solid #ddd;font-weight:bold;">${u.username}</td><td style="padding:12px;border:1px solid #ddd;color:#e53e3e;">${u.password}</td></tr>`;
    });
    res.send(`<!DOCTYPE html><html><head><title>Portal Admin</title><style>* {box-sizing:border-box;font-family:-apple-system,sans-serif;} body{background:#f4f6f8;padding:30px;display:flex;justify-content:center;} .wadah{background:#fff;width:100%;max-width:500px;padding:25px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);} table{width:100%;border-collapse:collapse;margin-top:15px;} th{background:#1a1a1a;color:#fff;padding:12px;} .btn{display:block;text-align:center;margin-top:20px;padding:12px;background:#f5f5f5;color:#333;text-decoration:none;border-radius:10px;font-weight:600;}</style></head><body><div class="wadah"><h2>🔑 Data Akun</h2><table><thead><tr><th>No</th><th>Username</th><th>Password</th></tr></thead><tbody>${barisTabel}</tbody></table><a href="/dashboard.html" class="btn">◀ Dashboard</a></div></body></html>`);
});

module.exports = app;
