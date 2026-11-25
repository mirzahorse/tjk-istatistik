#!/usr/bin/env python3
"""
Site kullanıcılarını yönetir: site/kullanicilar.json

Nasıl çalışır:
- Her yayında veri, o yayına özel rastgele bir anahtarla şifrelenir (sifrele.py).
- Bu anahtar sitenin AÇIK anahtarıyla (RSA) kilitlenir; bunun için hiçbir gizli bilgi gerekmez.
- Kilidi açan ÖZEL anahtar, her kullanıcı için o kullanıcının şifresiyle ayrı ayrı şifrelenmiş olarak saklanır.
Şifreler hiçbir yerde düz metin olarak tutulmaz.

    YONETICI_SIFRE=<admin şifresi> python3 kullanici.py ekle ahmet     # rastgele şifre üretir, bir kez yazar
    python3 kullanici.py sil ahmet
    python3 kullanici.py liste
"""
import base64
import hashlib
import json
import os
import secrets
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

DOSYA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site", "kullanicilar.json")
ITER = 310000
HARF = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # karışan harfler (0/O, 1/l/I) yok
e64 = lambda b: base64.b64encode(b).decode()
d64 = base64.b64decode


def kucuk(s):
    """Tarayıcıdaki toLocaleLowerCase('tr') ile aynı sonuç (I->ı, İ->i)."""
    return s.strip().replace("I", "ı").replace("İ", "i").lower()


def yukle():
    return json.load(open(DOSYA, encoding="utf-8"))


def kaydet(K):
    K["k"] = dict(sorted(K["k"].items()))
    json.dump(K, open(DOSYA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def kek(sifre, tuz, it):
    return hashlib.pbkdf2_hmac("sha256", sifre.encode("utf-8"), tuz, it, 32)


def kilitle(ozel_der, sifre, it):
    tuz, iv = os.urandom(16), os.urandom(12)
    return {"s": e64(tuz), "iv": e64(iv), "w": e64(AESGCM(kek(sifre, tuz, it)).encrypt(iv, ozel_der, None))}


def ac(u, sifre, it):
    return AESGCM(kek(sifre, d64(u["s"]), it)).decrypt(d64(u["iv"]), d64(u["w"]), None)


def ozel_anahtar(K):
    s = os.environ.get("YONETICI_SIFRE")
    if not s or "admin" not in K["k"]:
        sys.exit("YONETICI_SIFRE (admin şifresi) gerekli.")
    return ac(K["k"]["admin"], s, K["iter"])


def sifre_uret(n=12):
    s = "".join(secrets.choice(HARF) for _ in range(n))
    return "-".join(s[i:i + 4] for i in range(0, n, 4))


def kur(kullanicilar):
    """Yeni anahtar çifti oluşturur. kullanicilar: [(ad, şifre)]; şifre None ise üretilir."""
    oz = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    der = oz.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    pub = oz.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    K = {"v": 2, "iter": ITER, "pub": e64(pub), "k": {}}
    for ad, sifre in kullanicilar:
        sifre = sifre or sifre_uret()
        K["k"][kucuk(ad)] = kilitle(der, sifre, ITER)
        print(f"{kucuk(ad)}\t{sifre}")
    kaydet(K)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    komut, adlar = sys.argv[1], [kucuk(a) for a in sys.argv[2:]]
    if komut == "kur":   # stdin'den "ad<TAB>şifre" satırları (şifre boşsa üretilir)
        kur([(l.split("\t") + [""])[:2] for l in sys.stdin.read().splitlines() if l.strip()])
        return
    K = yukle()
    if komut == "liste":
        print("\n".join(K["k"]) or "(kullanıcı yok)")
    elif komut == "ekle":
        der = ozel_anahtar(K)
        for ad in adlar:
            sifre = sifre_uret()
            K["k"][ad] = kilitle(der, sifre, K["iter"])
            print(f"{ad}\t{sifre}")
        kaydet(K)
    elif komut == "sil":
        for ad in adlar:
            if ad == "admin":
                sys.exit("admin silinemez.")
            K["k"].pop(ad, None)
        kaydet(K)
        print("silindi:", ", ".join(adlar))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
