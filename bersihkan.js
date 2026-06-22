const fs = require('fs');
if (fs.existsSync('data_foto.json')) {
    let data = JSON.parse(fs.readFileSync('data_foto.json'));
    data.forEach(f => {
        if (f.teks === 'Foto Pemulihan' || f.teks === 'Foto Pemulihan Otomatis') {
            f.teks = '';
        }
    });
    fs.writeFileSync('data_foto.json', JSON.stringify(data, null, 2));
    console.log('Sukses membersihkan semua tulisan tanpa menghapus foto');
} else {
    console.log('File data_foto.json tidak ditemukan');
}
