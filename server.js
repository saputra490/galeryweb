const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_FILE = path.join(__dirname, 'pengguna.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function bacaPengguna() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

function simpanPengguna(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// CSS & HTML REUSABLE STYLE (ESTETIKA DASHBOARD PKL)
const styleElegan = `
<style>
    * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0; padding: 0;
    }
    body {
        background-color: #f8f9fa; /* Latar abu-abu sangat muda seperti di foto */
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
    }
    .card {
        background: #ffffff;
        width: 100%;
        max-width: 400px;
        padding: 40px 30px;
        border-radius: 24px; /* Sudut membulat besar seperti di dashboard PKL */
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        text-align: center;
    }
    .status-badge {
        display: inline-block;
        padding: 6px 16px;
        background-color: #e8f5e9;
        color: #2e7d32;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 20px;
    }
    h2 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
    }
    p.subtitle {
        color: #757575;
        font-size: 14px;
        margin-bottom: 30px;
    }
    .input-group {
        text-align: left;
        margin-bottom: 20px;
    }
    .input-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #424242;
        margin-bottom: 8px;
        margin-left: 4px;
    }
    .input-group input {
        width: 100%;
        padding: 14px 18px;
        background-color: #f5f5f5;
        border: 1px solid #eeeeee;
        border-radius: 14px;
        font-size: 15px;
        outline: none;
        transition: 0.2s;
    }
    .input-group input:focus {
        background-color: #ffffff;
        border-color: #1a1a1a;
        box-shadow: 0 0 0 4px rgba(0,0,0,0.05);
    }
    .btn-primary {
        width: 100%;
        padding: 16px;
        background-color: #1a1a1a; /* Hitam pekat elegan */
        color: #ffffff;
        border: none;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 10px;
        transition: 0.2s;
    }
    .btn-primary:hover {
        background-color: #333333;
        transform: translateY(-1px);
    }
    .footer-link {
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;
        font-size: 14px;
        color: #757575;
    }
    .footer-link a {
        color: #1a1a1a;
        text-decoration: none;
        font-weight: 700;
        margin-left: 5px;
    }
</style>
`;

// =========================================================================
// 1. TAMPILAN AWAL (DAFTAR AKUN)
// =========================================================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daftar Akun - GaleryWeb</title>
        ${styleElegan}
    </head>
    <body>
        <div class="card">
            <div class="status-badge">Gabung Sekarang</div>
            <h2>Daftar Akun</h2>
            <p class="subtitle">Buat akun untuk mulai mengelola galeri foto anda</p>
            
            <form action="/register" method="POST">
                <div class="input-group">
                    <label>Nama Pengguna</label>
                    <input type="text" name="username" placeholder="Buat nama pengguna" required>
                </div>
                <div class="input-group">
                    <label>Kata Sandi</label>
                    <input type="password" name="password" placeholder="Buat kata sandi" required>
                </div>
                <button type="submit" class="btn-primary">Daftar Akun</button>
            </form>

            <div class="footer-link">
                Sudah memiliki akun? <a href="/login-page">Masuk di sini</a>
            </div>
        </div>
    </body>
    </html>
    `);
});

// =========================================================================
// 2. HALAMAN LOGIN
// =========================================================================
app.get('/login-page', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - GaleryWeb</title>
        ${styleElegan}
    </head>
    <body>
        <div class="card">
            <div class="status-badge">Selamat Datang</div>
            <h2>Masuk</h2>
            <p class="subtitle">Masuk ke akun anda untuk melanjutkan</p>
            
            <form action="/login" method="POST">
                <div class="input-group">
                    <label>Nama Pengguna</label>
                    <input type="text" name="username" placeholder="Masukkan nama pengguna" required>
                </div>
                <div class="input-group">
                    <label>Kata Sandi</label>
                    <input type="password" name="password" placeholder="Masukkan kata sandi" required>
                </div>
                <button type="submit" class="btn-primary">Masuk Sekarang</button>
            </form>

            <div class="footer-link">
                Belum punya akun? <a href="/">Daftar di sini</a>
            </div>
        </div>
    </body>
    </html>
    `);
});

// =========================================================================
// 3. PROSES BACKEND
// =========================================================================
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();

    if (listPengguna.find(u => u.username === username)) {
        return res.send('<script>alert("Username sudah digunakan!"); window.location.href="/";</script>');
    }

    listPengguna.push({ username, password });
    simpanPengguna(listPengguna);
    res.send('<script>alert("Akun berhasil dibuat!"); window.location.href="/login-page";</script>');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();

    if (listPengguna.find(u => u.username === username && u.password === password)) {
        res.redirect('/dashboard.html');
    } else {
        res.send('<script>alert("Username atau sandi salah!"); window.location.href="/login-page";</script>');
    }
});

// ROUTE LAINNYA (UPLOAD, DAFTAR FOTO, HAPUS FOTO) - Tetap Utuh
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, 'foto-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.post('/upload', upload.array('fotoKeren', 10), (req, res) => {
    res.send('<script>alert("Berhasil diunggah!"); window.location.href="/dashboard.html";</script>');
});

app.get('/daftar-foto', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) return res.json([]);
        const sorted = files.filter(f => f.startsWith('foto-')).sort((a, b) => b.split('-')[1] - a.split('-')[1]);
        res.json(sorted);
    });
});

app.delete('/hapus-foto/:namaFile', (req, res) => {
    const p = path.join(UPLOAD_DIR, req.params.namaFile);
    if (fs.existsSync(p)) { fs.unlinkSync(p); res.sendStatus(200); }
    else { res.sendStatus(404); }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server PKL Style berjalan di port ${PORT}`);
});
