const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_FILE = path.join(__dirname, 'pengguna.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// Pastikan folder uploads ada
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Penyimpanan Gambar Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Format nama file: foto-timestamp.jpg
        const namaUnik = 'foto-' + Date.now() + path.extname(file.originalname);
        cb(null, namaUnik);
    }
});
const upload = multer({ storage: storage });

// Fungsi membaca data pengguna
function bacaPengguna() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
        return [];
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

// Fungsi menyimpan data pengguna
function simpanPengguna(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ROUTE: Proses Register / Buat Akun
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();

    const userAda = listPengguna.find(u => u.username === username);
    if (userAda) {
        return res.send('<script>alert("Username sudah terdaftar!"); window.location.href="/register.html";</script>');
    }

    listPengguna.push({ username, password });
    simpanPengguna(listPengguna);
    res.send('<script>alert("Akun berhasil dibuat! Silakan login."); window.location.href="/";</script>');
});

// ROUTE: Proses Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();

    const user = listPengguna.find(u => u.username === username && u.password === password);
    if (user) {
        res.redirect('/dashboard.html');
    } else {
        res.send('<script>alert("Username atau Password salah!"); window.location.href="/";</script>');
    }
});

// ROUTE: Unggah Foto (Mendukung Kamera & Galeri Sekaligus)
app.post('/upload', upload.array('fotoKeren', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.send('<script>alert("Gagal unggah, tidak ada file yang dipilih!"); window.history.back();</script>');
    }
    res.send('<script>alert("Foto berhasil diunggah!"); window.location.href="/dashboard.html";</script>');
});

// ROUTE: Mengambil Daftar Semua Foto
app.get('/daftar-foto', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) return res.status(500).json([]);
        // Urutkan file berdasarkan foto terbaru (timestamp terbesar)
        const fotoTerurut = files
            .filter(file => file.startsWith('foto-'))
            .sort((a, b) => {
                const timeA = parseInt(a.split('-')[1]);
                const timeB = parseInt(b.split('-')[1]);
                return timeB - timeA;
            });
        res.json(fotoTerurut);
    });
});

// ROUTE: Menghapus Foto
app.delete('/hapus-foto/:namaFile', (req, res) => {
    const namaFile = req.params.namaFile;
    const pathFile = path.join(UPLOAD_DIR, namaFile);

    if (fs.existsSync(pathFile)) {
        fs.unlinkSync(pathFile);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// ROUTE UTAMA: Mengarah ke halaman login awal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =========================================
// JALANKAN SERVER SECARA PUBLIK (0.0.0.0)
// =========================================
const PORT = 8080;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`=========================================`);
    console.log(` Server berhasil berjalan secara publik!`);
    console.log(` Akses Lokal : http://127.0.0.1:${PORT}`);
    console.log(`=========================================`);
});

