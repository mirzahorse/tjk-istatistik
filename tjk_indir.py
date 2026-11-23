#!/usr/bin/env python3
"""
TJK resmi günlük sonuç CSV'lerini indirir (medya-cdn.tjk.org).

Kullanım:
    python3 tjk_indir.py                  # 1 Ocak'tan dünkü güne kadar eksik olanları indirir
    python3 tjk_indir.py --gun 7          # yalnızca son 7 günü dener (otomatik güncelleme bunu kullanır)
    python3 tjk_indir.py --klasor veri    # dosyaların ineceği klasör (varsayılan: veri)

İnmiş dosyalar atlanır. Sadece Python standart kütüphanesi ve curl kullanılır.
"""
import argparse
import datetime as dt
import os
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

HIPODROMLAR = ["İstanbul", "Ankara", "İzmir", "Bursa", "Adana", "Antalya",
               "Kocaeli", "Elazığ", "Diyarbakır", "Şanlıurfa"]
YIL_BASI = dt.date(2026, 1, 1)
ESZAMANLI = 3      # aynı anda en fazla 3 istek: TJK sunucusunu yormamak için
BEKLEME = 0.2      # her istekten sonra saniye


def url(gun, sehir):
    yol = (f"/raporftp/TJKPDF/{gun:%Y}/{gun:%Y-%m-%d}/CSV/GunlukYarisSonuclari/"
           f"{gun:%d.%m.%Y}-{sehir}-GunlukYarisSonuclari-TR.csv")
    return "https://medya-cdn.tjk.org" + urllib.parse.quote(yol)


def indir(klasor, gun, sehir):
    hedef = os.path.join(klasor, f"{gun:%Y-%m-%d}_{sehir}.csv")
    if os.path.exists(hedef) and os.path.getsize(hedef) > 200:
        return "var"
    gecici = hedef + ".part"
    for deneme in range(3):
        r = subprocess.run(["curl", "-sS", "-L", "--max-time", "30", "-A", "Mozilla/5.0",
                            "-o", gecici, "-w", "%{http_code}", url(gun, sehir)],
                           capture_output=True, text=True)
        time.sleep(BEKLEME)
        kod = r.stdout.strip()
        if kod == "200" and os.path.exists(gecici) and os.path.getsize(gecici) > 200:
            with open(gecici, "rb") as f:
                if b"<html" in f.read(300).lower():
                    os.remove(gecici)
                    return "yok"
            os.replace(gecici, hedef)
            return "indi"
        if os.path.exists(gecici):
            os.remove(gecici)
        if kod in ("404", "403", "400"):
            return "yok"
        time.sleep(2 * (deneme + 1))
    return "hata"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--klasor", default="veri")
    ap.add_argument("--gun", type=int, default=0, help="yalnızca son N günü dene (0 = yılın tamamı)")
    a = ap.parse_args()
    os.makedirs(a.klasor, exist_ok=True)

    bitis = dt.date.today() - dt.timedelta(days=1)
    baslangic = max(YIL_BASI, bitis - dt.timedelta(days=a.gun - 1)) if a.gun else YIL_BASI
    isler = []
    gun = baslangic
    while gun <= bitis:
        isler += [(gun, s) for s in HIPODROMLAR]
        gun += dt.timedelta(days=1)
    print(f"{baslangic} – {bitis}: {len(isler)} dosya denenecek", flush=True)

    sayac = {"indi": 0, "var": 0, "yok": 0, "hata": 0}
    with ThreadPoolExecutor(ESZAMANLI) as ex:
        for (g, s), sonuc in zip(isler, ex.map(lambda x: indir(a.klasor, *x), isler)):
            sayac[sonuc] += 1
            if sonuc == "hata":
                print(f"  ağ hatası: {g} {s}", flush=True)
    print(f"indi: {sayac['indi']}  zaten vardı: {sayac['var']}  yarış yok: {sayac['yok']}  hata: {sayac['hata']}")
    # hiç dosya inemediyse ve hepsi hata verdiyse iş akışı başarısız görünsün
    if sayac["hata"] and not (sayac["indi"] or sayac["var"]):
        sys.exit(1)


if __name__ == "__main__":
    main()
