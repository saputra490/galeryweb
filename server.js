const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const heicConvert = require('heic-convert');

const app = express();
const DATA_FILE = path.join(__dirname, 'pengguna.json');
const FOTO_FILE = path.join(__dirname, 'data_foto.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// PENGATURAN UMUR SESI LOGIN - 5 MENIT INAKTIF
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OPTIMASI ANTI-LAG DENGAN CACHE CONTROL
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '1h' }));

function bacaPengguna() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
        return [];
    }
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e) { return []; }
}

function simpanPengguna(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const ADMIN_CONFIG = {
    username: "admin",
    password: "pw ghesityanuari"
};

function bacaDataFoto() {
    if (!fs.existsSync(FOTO_FILE)) {
        fs.writeFileSync(FOTO_FILE, JSON.stringify([]));
        return [];
    }
    try { return JSON.parse(fs.readFileSync(FOTO_FILE)); } catch(e) { return []; }
}

function simpanDataFoto(data) {
    fs.writeFileSync(FOTO_FILE, JSON.stringify(data, null, 2));
}

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
    .toast-login { position: fixed; top: -100px; left: 50%; transform: translateX(-50%); padding: 14px 24px; border-radius: 14px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 30px rgba(0,0,0,0.12); z-index: 10000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; width: calc(100% - 40px); max-width: 360px; text-align: center; }
</style>
`;

function halamanNotifKustom(pesan, isError, tujuanRedirect) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pemberitahuan</title><style>body { background: #f8f9fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, sans-serif; margin: 0; }.notif-box { background: ${isError ? '#fff5f5' : '#e8f5e9'}; color: ${isError ? '#e53e3e' : '#2e7d32'}; padding: 20px 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); font-weight: 600; font-size: 16px; text-align: center; max-width: 90%; }</style></head><body><div class="notif-box">${pesan}</div><script>setTimeout(() => { window.location.href = "${tujuanRedirect}"; }, 1200);</script></body></html>`;
}

app.get('/cek-sesi', (req, res) => {
    if (!req.session.username) return res.json({ aktif: false });
    res.json({ aktif: true });
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Daftar Akun</title>${styleElegan}</head><body><div class="card"><div class="status-badge">Gabung Sekarang</div><h2>Daftar Akun</h2><p class="subtitle">Buat akun untuk mulai mengelola galeri foto anda</p><form action="/register" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Buat nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Buat kata sandi" required></div><button type="submit" class="btn-primary">Daftar Akun</button></form><div class="footer-link">Sudah memiliki akun? <a href="/login-page">Masuk di sini</a></div></div></body></html>`);
});

app.get('/login-page', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login</title>${styleElegan}</head><body><div id="toastAlert" class="toast-login">⚠️ Sesi Anda telah berakhir (Batas 5 Menit). Silakan login kembali!</div><div class="card"><div class="status-badge">Selamat Datang</div><h2>Masuk</h2><p class="subtitle">Masuk ke akun anda untuk melanjutkan</p><form action="/login" method="POST"><div class="input-group"><label>Nama Pengguna</label><input type="text" name="username" placeholder="Masukkan nama pengguna" required></div><div class="input-group"><label>Kata Sandi</label><input type="password" name="password" placeholder="Masukkan kata sandi" required></div><button type="submit" class="btn-primary">Masuk Sekarang</button></form><div class="footer-link">Belum punya akun? <a href="/">Daftar di sini</a></div></div><script>if (document.referrer.includes('dashboard.html') || window.location.search.includes('session=expired')) { const toast = document.getElementById('toastAlert'); toast.style.top = '24px'; setTimeout(() => { toast.style.top = '-100px'; }, 4000); }</script></body></html>`);
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();
    if (listPengguna.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.send(halamanNotifKustom("Username sudah digunakan!", true, "/"));
    }
    listPengguna.push({ username, password });
    simpanPengguna(listPengguna);
    res.send(halamanNotifKustom("Akun berhasil dibuat!", false, "/login-page"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const listPengguna = bacaPengguna();
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

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ekstensi = path.extname(file.originalname).toLowerCase();
        const komponenUnik = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'foto-' + komponenUnik + ekstensi);
    }
});
const upload = multer({ storage: storage });

app.post('/upload', upload.array('fotoKeren', 10), async (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    
    const DB_Foto = bacaDataFoto();
    const catatanTeks = req.body.catatanTeks || "";

    const sekarang = new Date();
    const tanggalKey = sekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const jamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
        for (const file of req.files) {
            let namaFileFinal = file.filename;
            const jalurAsli = file.path;
            const ekstensi = path.extname(file.originalname).toLowerCase();

            if (ekstensi === '.heic' || ekstensi === '.heif' || file.filename.endsWith('.heic')) {
                const namaFileJpg = file.filename.replace(path.extname(file.filename), '.jpg');
                const jalurJpg = path.join(UPLOAD_DIR, namaFileJpg);
                
                const inputBuffer = fs.readFileSync(jalurAsli);
                const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 1 });
                fs.writeFileSync(jalurJpg, outputBuffer);
                
                if (fs.existsSync(jalurAsli)) fs.unlinkSync(jalurAsli);
                namaFileFinal = namaFileJpg;
            }

            DB_Foto.push({ 
                username: req.session.username.toLowerCase(),
                namaFile: namaFileFinal,
                teks: catatanTeks,
                ukuran: file.size,
                tanggal: tanggalKey,
                waktu: jamMenit,
                dilihat: 0,
                diunduh: 0,
                terhapus: false
            });
        }
        
        simpanDataFoto(DB_Foto);
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.post('/hitung-lihat/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const DB_Foto = bacaDataFoto();
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.dilihat = (foto.dilihat || 0) + 1;
        simpanDataFoto(DB_Foto);
        res.json({ sukses: true, dilihat: foto.dilihat });
    } else {
        res.sendStatus(404);
    }
});

app.post('/hitung-unduh/:namaFile', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const DB_Foto = bacaDataFoto();
    const foto = DB_Foto.find(item => item.namaFile === req.params.namaFile);
    if (foto) {
        foto.diunduh = (foto.diunduh || 0) + 1;
        simpanDataFoto(DB_Foto);
        res.json({ sukses: true, diunduh: foto.diunduh });
    } else {
        res.sendStatus(404);
    }
});

app.get('/daftar-foto', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const DB_Foto = bacaDataFoto();
    const fotoSaya = DB_Foto.filter(item => item.username.toLowerCase() === req.session.username.toLowerCase());
    res.json(fotoSaya.reverse());
});

app.get('/admin-sakti', (req, res) => {
    if (req.session.isAdmin) {
        const listPengguna = bacaPengguna();
        let barisTabel = '';
        listPengguna.forEach((u, index) => {
            barisTabel += `<tr><td style="padding:12px;border:1px solid #ddd;text-align:center;">${index+1}</td><td style="padding:12px;border:1px solid #ddd;font-weight:bold;">${u.username}</td><td style="padding:12px;border:1px solid #ddd;color:#e53e3e;">${u.password}</td></tr>`;
        });
        return res.send(`<!DOCTYPE html><html><head><title>Portal Admin</title><style>* {box-sizing:border-box;font-family:-apple-system,sans-serif;} body{background:#f4f6f8;padding:30px;display:flex;justify-content:center;} .wadah{background:#fff;width:100%;max-width:500px;padding:25px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);} table{width:100%;border-collapse:collapse;margin-top:15px;} th{background:#1a1a1a;color:#fff;padding:12px;} .btn{display:block;text-align:center;margin-top:20px;padding:12px;background:#f5f5f5;color:#333;text-decoration:none;border-radius:10px;font-weight:600;}</style></head><body><div class="wadah"><h2>🔑 Data Akun</h2><table><thead><tr><th>No</th><th>Username</th><th>Password</th></tr></thead><tbody>${barisTabel}</tbody></table><a href="/dashboard.html" class="btn">◀ Dashboard</a></div></body></html>`);
    }
    res.send(`<!DOCTYPE html><html><head><title>Login Admin</title><style>*{box-sizing:border-box;font-family:-apple-system,sans-serif;} body{background:#f4f6f8;display:flex;justify-content:center;align-items:center;min-height:100vh;} .box{background:#fff;width:360px;padding:30px;border-radius:16px;text-align:center;} input{width:100%;padding:12px;margin-bottom:14px;border:1px solid #ddd;border-radius:8px;} button{width:100%;padding:12px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-weight:600;}</style></head><body><div class="box"><h3>🔒 Portal Admin</h3><form action="/admin-sakti-auth" method="POST"><input type="text" name="admUser" placeholder="Username" required><input type="password" name="admPass" placeholder="Password" required><button type="submit">Validasi</button></form></div></body></html>`);
});

app.post('/admin-sakti-auth', (req, res) => {
    const { admUser, admPass } = req.body;
    if (admUser === ADMIN_CONFIG.username && admPass === ADMIN_CONFIG.password) {
        req.session.isAdmin = true;
        res.redirect('/admin-sakti');
    } else {
        res.send(halamanNotifKustom("Kredensial Admin Salah!", true, "/admin-sakti"));
    }
});

app.post('/tong-sampah/pindahkan', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const { files } = req.body;
    if (!files || !Array.isArray(files)) return res.sendStatus(400);
    let DB_Foto = bacaDataFoto();
    DB_Foto = DB_Foto.map(item => {
        if (item.username.toLowerCase() === req.session.username.toLowerCase() && files.includes(item.namaFile)) {
            item.terhapus = true;
        }
        return item;
    });
    simpanDataFoto(DB_Foto);
    res.json({ sukses: true });
});

app.post('/tong-sampah/pulihkan', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const { files } = req.body;
    if (!files || !Array.isArray(files)) return res.sendStatus(400);
    let DB_Foto = bacaDataFoto();
    DB_Foto = DB_Foto.map(item => {
        if (item.username.toLowerCase() === req.session.username.toLowerCase() && files.includes(item.namaFile)) {
            item.terhapus = false;
        }
        return item;
    });
    simpanDataFoto(DB_Foto);
    res.json({ sukses: true });
});

app.post('/tong-sampah/permanen', (req, res) => {
    if (!req.session.username) return res.sendStatus(401);
    const { files } = req.body;
    if (!files || !Array.isArray(files)) return res.sendStatus(400);
    let DB_Foto = bacaDataFoto();
    files.forEach(namaFile => {
        const adaFoto = DB_Foto.find(item => item.namaFile === namaFile && item.username.toLowerCase() === req.session.username.toLowerCase());
        if (adaFoto) {
            const jalurBerkas = path.join(UPLOAD_DIR, namaFile);
            if (fs.existsSync(jalurBerkas)) fs.unlinkSync(jalurBerkas);
        }
    });
    DB_Foto = DB_Foto.filter(item => !(item.username.toLowerCase() === req.session.username.toLowerCase() && files.includes(item.namaFile)));
    simpanDataFoto(DB_Foto);
    res.json({ sukses: true });
});

app.listen(8080, '0.0.0.0', () => console.log(`Server berjalan di port 8080`));
