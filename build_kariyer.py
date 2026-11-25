#!/usr/bin/env python3
"""
Tüm zamanlar kariyer dosyalarını üretir: site/kariyer/{j,tr,at,ba,sh}.json

Geçmiş yıllar ozet/YYYY.json dosyalarından, içinde bulunulan yıl ise veri/ klasöründeki
güncel CSV'lerden gelir (her saat güncellenen veri).

Kullanım:
    python3 build_kariyer.py [veri] [ozet] [site]
"""
import datetime as dt
import glob
import json
import os
import sys

from ozet_yil import ozetle

KAT = ["j", "tr", "at", "ba", "sh"]


def buyuk(s):
    return s.replace("i", "İ").replace("ı", "I").upper().strip()


def ad_eslesir(kisa, tam):
    """'B.AKÇAY' ile 'BURAK AKÇAY' aynı kişi mi? (soyadı ve baş harfler)"""
    p = [x.strip() for x in kisa.split(".") if x.strip()]
    k = tam.split()
    if len(p) < 2 or len(k) < 2:
        return False
    soy, bas, adlar = p[-1], p[:-1], k[:-1]
    return soy == k[-1] and len(bas) <= len(adlar) and all(adlar[i].startswith(b) for i, b in enumerate(bas))


def birlestir(kayit):
    """Eski yıllarda tam adla yazılmış jokey/antrenörleri kısaltmalı adlarına bağlar (tek aday varsa)."""
    kisalar = [a for a in kayit if "." in a]
    for tam in [a for a in kayit if "." not in a and len(a.split()) >= 2]:
        aday = [k for k in kisalar if ad_eslesir(k, tam)]
        if len(aday) == 1:
            hedef = kayit[aday[0]]
            yillar = {x[0]: x for x in hedef}
            for x in kayit.pop(tam):
                if x[0] in yillar:
                    yillar[x[0]][1:] = [a + b for a, b in zip(yillar[x[0]][1:], x[1:])]
                else:
                    hedef.append(x)
            hedef.sort()


def main():
    arg = sys.argv[1:]
    veri, ozet, site = [arg[i] if len(arg) > i else v for i, v in enumerate(["veri", "ozet", "site"])]
    yil_simdi = max((int(os.path.basename(f)[:4]) for f in glob.glob(os.path.join(veri, "*.csv"))),
                    default=dt.date.today().year)
    yillar = {}
    for f in sorted(glob.glob(os.path.join(ozet, "*.json"))):
        y = int(os.path.basename(f)[:4])
        if y != yil_simdi:
            yillar[y] = json.load(open(f, encoding="utf-8"))
    yillar[yil_simdi] = ozetle(veri, yil_simdi)

    cikti = os.path.join(site, "kariyer")
    os.makedirs(cikti, exist_ok=True)
    ozet_bilgi = {"guncel": yil_simdi, "yillar": {y: {"kosu": o["kosu"], "start": o["start"]} for y, o in sorted(yillar.items())}}
    for k in KAT:
        kayit = {}
        for y, o in sorted(yillar.items()):
            for ad, v in o.get(k, {}).items():
                kayit.setdefault(ad, []).append([y] + v)
        if k in ("j", "tr"):
            birlestir(kayit)
        liste = []
        for ad, yl in kayit.items():
            top = [sum(x[i] for x in yl) for i in range(1, 7)]
            liste.append([ad, top, yl])
        liste.sort(key=lambda x: (-x[1][1], -x[1][0]))
        with open(os.path.join(cikti, f"{k}.json"), "w", encoding="utf-8") as f:
            json.dump({**ozet_bilgi, "k": liste}, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{k}: {len(liste)} kayıt, {os.path.getsize(os.path.join(cikti, k + '.json')) // 1024} KB")


if __name__ == "__main__":
    main()
