#!/usr/bin/env python3
"""
Site kullanıcılarını yönetir: site/kullanicilar.json

Her kullanıcı için verinin anahtarı, o kullanıcının şifresinden türetilen ayrı bir kilitle saklanır.
Şifreler hiçbir yerde düz metin olarak tutulmaz. Kullanıcı eklemek için anahtar gerekir:
ya SITE_ANAHTAR ortam değişkeni ya da admin kullanıcısının şifresi (YONETICI_SIFRE).

    python3 kullanici.py ekle ahmet mehmet     # rastgele şifre üretir ve ekrana bir kez yazar
    python3 kullanici.py sil ahmet
    python3 kullanici.py liste
"""
import base64
import hashlib
import json
import os
import secrets
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

DOSYA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site", "kullanicilar.json")
ITER = 310000
HARF = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # karışan harfler (0/O, 1/l/I) yok


def kucuk(s):
    """Tarayıcıdaki toLocaleLowerCase('tr') ile aynı sonuç (I->ı, İ->i)."""
    return s.strip().replace("I", "ı").replace("İ", "i").lower()


def yukle():
    if os.path.exists(DOSYA):
        return json.load(open(DOSYA, encoding="utf-8"))
    return {"v": 1, "iter": ITER, "k": {}}


def kaydet(K):
    K["k"] = dict(sorted(K["k"].items()))
    json.dump(K, open(DOSYA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def kek(sifre, tuz, it):
    return hashlib.pbkdf2_hmac("sha256", sifre.encode("utf-8"), tuz, it, 32)


def kilitle(anahtar, sifre, it):
    tuz, iv = os.urandom(16), os.urandom(12)
    w = AESGCM(kek(sifre, tuz, it)).encrypt(iv, anahtar, None)
    e = lambda b: base64.b64encode(b).decode()
    return {"s": e(tuz), "iv": e(iv), "w": e(w)}


def ac(u, sifre, it):
    d = lambda s: base64.b64decode(s)
    return AESGCM(kek(sifre, d(u["s"]), it)).decrypt(d(u["iv"]), d(u["w"]), None)


def anahtar_bul(K):
    if os.environ.get("SITE_ANAHTAR"):
        return base64.b64decode(os.environ["SITE_ANAHTAR"])
    if os.environ.get("YONETICI_SIFRE") and "admin" in K["k"]:
        return ac(K["k"]["admin"], os.environ["YONETICI_SIFRE"], K["iter"])
    sys.exit("Anahtar yok: SITE_ANAHTAR ya da YONETICI_SIFRE gerekli.")


def sifre_uret(n=12):
    s = "".join(secrets.choice(HARF) for _ in range(n))
    return "-".join(s[i:i + 4] for i in range(0, n, 4))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    K = yukle()
    komut, adlar = sys.argv[1], [kucuk(a) for a in sys.argv[2:]]
    if komut == "liste":
        print("\n".join(K["k"]) or "(kullanıcı yok)")
    elif komut == "ekle":
        anahtar = anahtar_bul(K)
        for ad in adlar:
            sifre = sifre_uret()
            K["k"][ad] = kilitle(anahtar, sifre, K["iter"])
            print(f"{ad}\t{sifre}")
        kaydet(K)
    elif komut == "sil":
        for ad in adlar:
            K["k"].pop(ad, None)
        kaydet(K)
        print("silindi:", ", ".join(adlar))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
