#!/usr/bin/env python3
"""
Sitedeki verileri şifreler (yayından hemen önce, GitHub Actions içinde çalışır).

    YONETICI_SIFRE=<admin şifresi> python3 sifrele.py site

site/data.js          -> site/data.enc       (data.js silinir)
site/kariyer/*.json   -> site/kariyer/*.enc  (json'lar silinir)
Biçim: 12 bayt IV + AES-256-GCM şifreli metin (tarayıcıda WebCrypto ile açılır).
"""
import base64
import glob
import os
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from kullanici import anahtar_bul, yukle


def sifrele(anahtar, veri):
    iv = os.urandom(12)
    return iv + AESGCM(anahtar).encrypt(iv, veri, None)


def main():
    site = sys.argv[1] if len(sys.argv) > 1 else "site"
    if not (os.environ.get("SITE_ANAHTAR") or os.environ.get("YONETICI_SIFRE")):
        sys.exit("YONETICI_SIFRE tanımlı değil: veri şifrelenmeden yayınlanmaz.")
    try:
        anahtar = anahtar_bul(yukle())   # admin şifresiyle kullanicilar.json'daki anahtarı açar
    except Exception:
        sys.exit("YONETICI_SIFRE yanlış: admin kullanıcısının kilidi açılamadı.")
    assert len(anahtar) == 32, "SITE_ANAHTAR 32 bayt olmalı"

    js = open(os.path.join(site, "data.js"), encoding="utf-8").read()
    json_metin = js[js.index("{"): js.rindex("}") + 1]
    open(os.path.join(site, "data.enc"), "wb").write(sifrele(anahtar, json_metin.encode("utf-8")))
    os.remove(os.path.join(site, "data.js"))
    n = 0
    for f in glob.glob(os.path.join(site, "kariyer", "*.json")):
        open(f[:-5] + ".enc", "wb").write(sifrele(anahtar, open(f, "rb").read()))
        os.remove(f)
        n += 1
    print(f"şifrelendi: data.enc + {n} kariyer dosyası")


if __name__ == "__main__":
    main()
