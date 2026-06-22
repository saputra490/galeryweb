const fs = require('fs');
const path = require('path');

const FOTO_FILE = path.join(__dirname, 'data_foto.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// Ganti dengan username akun utama kamu (misal: 'edo')
const USERNAME_AKUN = 'edo'; 

if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('Folder uploads tidak ditemukan!');
    process.exit(1);
}

// Ambil tanggal dan waktu hari ini sebagai penanda default
const sekarang = new Date();
const tanggalKey = sekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const jamMenit = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Baca file gambar yang tersisa di folder
const files = fs.readdirSync(UPLOAD_DIR);
const DB_Foto = [];

files.forEach(file => {
    // Hanya ambil file gambar (foto-xxx.jpg/png/jpeg)
    if (file.startsWith('foto-') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
        const stats = fs.statSync(path.join(UPLOAD_DIR, file));
        
        DB_Foto.push({
            username: USERNAME_AKUN.toLowerCase(),
            namaFile: file,
            teks: "Foto dipulihkan otomatis",
            ukuran: stats.size,
            tanggal: tanggalKey,
            waktu: jamMenit
        });
    }
});

// Simpan kembali daftar file ke database json
fs.writeFileSync(FOTO_FILE, JSON.stringify(DB_Foto, null, 2));
console.log(`✅ Sukses memulihkan ${DB_Foto.length} foto ke akun: ${USERNAME_AKUN}`);
