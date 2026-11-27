#!/usr/bin/env python3
"""
Jokey fotoğraflarını siteye şifreli olarak ekler.

    python3 foto_ekle.py <klasör>

Dosya adı jokeyin adıdır: "Ali Yıldız.jpg" -> A.YILDIZ, "Muhammed Mir Bilgin.jpg" -> M.M.BİLGİN.
Kısa ad dosya adında doğrudan da verilebilir: "A.YILDIZ.jpg". " copy" ekleri yok sayılır.

Her fotoğraf baş-omuz kadrajında 400x500'e küçültülür ve kendi rastgele anahtarıyla şifrelenir
(AES-256-GCM; anahtar sitenin açık anahtarıyla RSA-OAEP ile kilitlenir). Depo herkese açık olsa da
fotoğraflar yalnızca giriş yapanlarca açılır. Çıktı: site/foto/<kod>.enc ve site/foto/liste.json.
Dosya biçimi: 2 bayt kilit uzunluğu + RSA kilitli anahtar + 12 bayt IV + şifreli JPEG.
"""
import base64
import glob
import hashlib
import io
import json
import os
import re
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image, ImageOps

KLASOR = os.path.join("site", "foto")


def buyuk(s):
    return s.replace("i", "İ").replace("ı", "I").upper()


def kisa_ad(dosya):
    ad = re.sub(r"\s+copy(\s*\d+)?$", "", os.path.splitext(os.path.basename(dosya))[0], flags=re.I).strip()
    if "." in ad and " " not in ad:
        return buyuk(ad)
    p = ad.split()
    return ".".join(buyuk(x[0]) for x in p[:-1]) + "." + buyuk(p[-1])


def kadrajla(yol):
    im = ImageOps.exif_transpose(Image.open(yol)).convert("RGB")
    w = im.width
    h = min(im.height, int(w * 1.25))
    k = im.crop((0, 0, w, h)).resize((400, max(1, int(400 * h / w))), Image.LANCZOS)
    if k.height < 500:
        z = Image.new("RGB", (400, 500), "white")
        z.paste(k, (0, 0))
        k = z
    b = io.BytesIO()
    k.save(b, "JPEG", quality=82, optimize=True)
    return b.getvalue()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    K = json.load(open(os.path.join("site", "kullanicilar.json"), encoding="utf-8"))
    pub = serialization.load_der_public_key(base64.b64decode(K["pub"]))
    oaep = padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    os.makedirs(KLASOR, exist_ok=True)
    liste_yol = os.path.join(KLASOR, "liste.json")
    liste = json.load(open(liste_yol, encoding="utf-8")) if os.path.exists(liste_yol) else {}
    dosyalar = sorted(f for f in glob.glob(os.path.join(sys.argv[1], "**", "*"), recursive=True)
                      if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
    for f in dosyalar:
        kisa = kisa_ad(f)
        kod = hashlib.sha1(kisa.encode("utf-8")).hexdigest()[:12]
        anahtar = AESGCM.generate_key(bit_length=256)
        iv = os.urandom(12)
        kilit = pub.encrypt(anahtar, oaep)
        veri = len(kilit).to_bytes(2, "big") + kilit + iv + AESGCM(anahtar).encrypt(iv, kadrajla(f), None)
        open(os.path.join(KLASOR, kod + ".enc"), "wb").write(veri)
        liste[kisa] = kod
        print(f"{kisa:16} <- {os.path.basename(f)}")
    json.dump(dict(sorted(liste.items())), open(liste_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(liste)} fotoğraf kayıtlı ({liste_yol})")


if __name__ == "__main__":
    main()
