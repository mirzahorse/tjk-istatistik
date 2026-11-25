#!/usr/bin/env python3
"""
Sitedeki verileri şifreler (yayından hemen önce, GitHub Actions içinde çalışır). Gizli bilgi gerektirmez.

    python3 sifrele.py site

- Her çalışmada rastgele yeni bir veri anahtarı üretilir.
- site/data.js -> site/data.enc, site/kariyer/*.json -> site/kariyer/*.enc  (şifresizler silinir)
- Veri anahtarı sitenin açık anahtarıyla (RSA-OAEP, kullanicilar.json'daki "pub") kilitlenip
  site/anahtar.bin olarak yazılır. Kilidi yalnızca kullanıcı şifreleriyle açılan özel anahtar açar.
Dosya biçimi: 12 bayt IV + AES-256-GCM şifreli metin (tarayıcıda WebCrypto ile açılır).
"""
import base64
import glob
import json
import os
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def main():
    site = sys.argv[1] if len(sys.argv) > 1 else "site"
    K = json.load(open(os.path.join(site, "kullanicilar.json"), encoding="utf-8"))
    pub = serialization.load_der_public_key(base64.b64decode(K["pub"]))
    anahtar = AESGCM.generate_key(bit_length=256)

    def sifrele(veri):
        iv = os.urandom(12)
        return iv + AESGCM(anahtar).encrypt(iv, veri, None)

    js = open(os.path.join(site, "data.js"), encoding="utf-8").read()
    open(os.path.join(site, "data.enc"), "wb").write(sifrele(js[js.index("{"): js.rindex("}") + 1].encode("utf-8")))
    os.remove(os.path.join(site, "data.js"))
    n = 0
    for f in glob.glob(os.path.join(site, "kariyer", "*.json")):
        open(f[:-5] + ".enc", "wb").write(sifrele(open(f, "rb").read()))
        os.remove(f)
        n += 1
    oaep = padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    open(os.path.join(site, "anahtar.bin"), "wb").write(pub.encrypt(anahtar, oaep))
    print(f"şifrelendi: data.enc + {n} kariyer dosyası + anahtar.bin")


if __name__ == "__main__":
    main()
