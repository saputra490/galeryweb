const fs = require('fs');
const path = require('path');

// 1. Cari tahu di mana letak folder uploads yang asli
let folderUploads = '';
const pilihanJalur = [
    path.join(__dirname, 'public', 'uploads'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'public', 'Uploads')
];

for (const jalur of pilihanJalur) {
    if (fs.existsSync(jalur)) {
        folderUploads = jalur;
        break;
    }
}

if (!folderUploads) {
    console.log('❌ Waduh, folder penyimpanan foto tidak ditemukan di sistem!');
    process.exit(1);
}

console.log('📂 Folder ditemukan di: ' + folderUploads);

// 2. Baca semua file foto di dalam folder tersebut
const semuaFile = fs.readdirSync(folderUploads).filter(f => {
    return f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png');
});

if (semuaFile.length === 0) {
    console.log('❌ Folder uploads ketemu, tapi di dalamnya memang tidak ada file foto sama sekali.');
    process.exit(1);
}

// 3. Masukkan data foto tersebut ke database agar muncul di web
const databaseBaru = semuaFile.map(f => {
    const infoFile = fs.statSync(path.join(folderUploads, f));
    return {
        username: 'admin', // Dikunci ke akun admin
        namaFile: f,
        teks: 'Foto Pemulihan Otomatis',
        tanggal: infoFile.mtime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        waktu: infoFile.mtime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
});

fs.writeFileSync(path.join(__dirname, 'data_foto.json'), JSON.stringify(databaseBaru, null, 2));
console.log('✅ BERHASIL! Sebanyak ' + semuaFile.length + ' foto lama berhasil dikembalikan ke dalam web.');
