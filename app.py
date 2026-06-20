from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return """
    <html>
        <head>
            <title>Galeri Web Saya</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background-color: #f0f0f0; padding: 50px; }
                h1 { color: #333; }
                .gallery { display: flex; justify-content: center; gap: 20px; margin-top: 30px; }
                .box { width: 200px; height: 200px; background-color: #ddd; display: flex; align-items: center; justify-content: center; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            </style>
        </head>
        <body>
            <h1>Selamat Datang di Galeri Web Publik Saya!</h1>
            <p>Web ini dijalankan langsung dari Python di Android via Termux.</p>
            <div class="gallery">
                <div class="box">Foto 1</div>
                <div class="box">Foto 2</div>
                <div class="box">Foto 3</div>
            </div>
        </body>
    </html>
    """

if __name__ == '__main__':
    # Menjalankan server di port 5000
    app.run(host='0.0.0.0', port=5000)
