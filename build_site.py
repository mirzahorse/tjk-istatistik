#!/usr/bin/env python3
"""
TJK web uygulamasının veri dosyasını (data.js) üretir.

Kullanım:
    python3 build_site.py <TJK csv klasörü> [çıktı klasörü]
    örn: python3 build_site.py ~/Downloads/tjk_2026_csv .

Girdi: tjk_indir.py'nin indirdiği resmi "GunlukYarisSonuclari" CSV'leri.
Çıktı: data.js (index.html bunu okur). Başka hiçbir şeye gerek yoktur.
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_tjk import parse_file  # aynı klasörde


def apranti_oku():
    """TJK 'Jokey olmaya kalan yarış sayısı' listesinin son kopyası (apranti.csv).
    Site, bu tarihten sonraki apranti galibiyetlerini kalan sayıdan kendisi düşer."""
    yol = os.path.join(os.path.dirname(os.path.abspath(__file__)), "apranti.csv")
    if not os.path.exists(yol):
        return None
    tarih, liste = "", []
    for ln in open(yol, encoding="utf-8").read().splitlines():
        c = ln.split(";")
        if ln.startswith("#") or not ln.strip() or c[0] == "ad":
            continue
        if c[0] == "tarih":
            tarih = c[1]
            continue
        liste.append([c[0], c[1], c[2], int(c[3])] + [int(x) for x in c[4:9]])
    return {"tarih": tarih, "liste": liste}


def program_oku(klasor="program"):
    """program/ klasöründeki ileri tarihli koşular ve koşacak atlar (deklare edilmiş program)."""
    import glob
    import re
    yol = os.path.join(os.path.dirname(os.path.abspath(__file__)), klasor)
    liste = []
    for f in sorted(glob.glob(os.path.join(yol, "*.csv"))):
        tarih, hip = os.path.basename(f)[:-4].split("_", 1)
        ham = open(f, "rb").read()
        try:
            metin = ham.decode("utf-8-sig")
        except UnicodeDecodeError:
            metin = ham.decode("cp1254")
        kosu = None
        for ln in metin.splitlines():
            c = [x.strip() for x in ln.split(";")]
            m = re.match(r"^\s*(\d+)\. Kosu :\s*(.*?)\s*(\d{1,2}[.:]\d{2})\s*$", c[0])
            if m:
                mes = next((x[:-1] for x in c if re.fullmatch(r"\d{3,4}m", x)), "")
                pist = next((x for x in c if x in ("Kum", "Çim", "Sentetik")), "")
                grp = c[2] if len(c) > 2 else ""
                kosu = {"tarih": tarih, "hip": hip, "no": int(m[1]), "ad": m[2].strip(), "saat": m[3].replace(":", "."),
                        "sinif": c[1] if len(c) > 1 else "", "grup": grp, "mes": mes, "pist": pist, "atlar": []}
                liste.append(kosu)
                continue
            # at satırı: No;At;Yaş;Baba;Anne;Kilo;Jokey;Sahip;Antrenör;St;AGF;HP;Son 6;KGS;s20;En iyi derece
            if kosu and len(c) >= 12 and c[0].isdigit() and re.match(r"^\d+y", c[2]):
                if "Koşmaz" in ln:
                    continue
                toks = c[1].split()
                while len(toks) > 1 and re.fullmatch(r"[A-ZÖÇŞİĞÜ]{1,4}", toks[-1]) and toks[-1] in {"KG", "K", "DB", "SK", "SKG", "GKR", "ÖG", "SGKR", "YP", "BB", "KUL", "GK"}:
                    toks.pop()
                jok = c[6]
                agf = re.match(r"%([\d.]+)\((\d+)\)", c[10]) if len(c) > 10 else None
                kosu["atlar"].append({"no": int(c[0]), "at": " ".join(toks), "baba": c[3], "jokey": jok[:-3].strip() if jok.endswith(" AP") else jok,
                                      "ap": jok.endswith(" AP"), "antr": c[8], "agf": float(agf[1]) if agf else None, "agfs": int(agf[2]) if agf else None,
                                      "hp": int(c[11]) if len(c) > 11 and c[11].isdigit() else None, "son6": c[12] if len(c) > 12 else "",
                                      "kgs": int(c[13]) if len(c) > 13 and c[13].isdigit() else None})
    return liste


def main():
    src = os.path.expanduser(sys.argv[1])
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
    rows = []
    for ad in sorted(os.listdir(src)):
        if ad.endswith(".csv") and "_" in ad:
            rows += parse_file(os.path.join(src, ad))
    rows.sort(key=lambda r: (r["tarih"], r["hipodrom"], r["kosu_no"], r["sira"]))

    # --- atın önceki koşusu: dinlenme süresi ve yeni takılan ekipman
    son = {}
    for r in rows:
        key = (r["at"], r["baba"], r["anne"])
        gun = dt.date.fromisoformat(r["tarih"])
        onceki = son.get(key)
        r["ara"] = (gun - onceki[0]).days if onceki else -1
        if onceki:
            yeni = [e for e in r["ekipman"].split() if e not in onceki[1]]
            r["yeni_ekip"] = " ".join(yeni)
        else:
            r["yeni_ekip"] = ""
        son[key] = (gun, set(r["ekipman"].split()))

    # --- sözlükler
    D = {}

    def code(field, val):
        d = D.setdefault(field, {"list": [], "idx": {}})
        val = val or ""
        if val not in d["idx"]:
            d["idx"][val] = len(d["list"])
            d["list"].append(val)
        return d["idx"][val]

    races, ridx = {k: [] for k in ["t", "h", "no", "ad", "sn", "tur", "irk", "m", "p", "rek", "ikr", "saat", "n"]}, {}
    S = {k: [] for k in ["r", "s", "at", "ba", "an", "y", "rk", "c", "kg", "fz", "j", "ap", "sh", "an2",
                         "st", "ds", "agf", "hp", "sn", "g", "f", "e", "ye", "ara"]}
    for r in rows:
        rk = (r["tarih"], r["hipodrom"], r["kosu_no"])
        if rk not in ridx:
            ridx[rk] = len(races["t"])
            races["t"].append(code("t", r["tarih"]))
            races["h"].append(code("h", r["hipodrom"]))
            races["no"].append(r["kosu_no"])
            races["ad"].append(code("ad", r.get("kosu_adi", "")))
            races["sn"].append(code("sn", r["sinif"]))
            races["tur"].append(code("tur", r["kosu_turu"]))
            races["irk"].append(code("irk", r["irk"]))
            races["m"].append(r["mesafe"] or 0)
            races["p"].append(code("p", r["pist"]))
            races["rek"].append(code("rek", r["rekor"]))
            races["ikr"].append(r.get("ikramiye_1") or 0)
            races["saat"].append(code("saat", r["saat"]))
            races["n"].append(r["kosan_sayisi"])
        S["r"].append(ridx[rk])
        S["s"].append(r["sira"] if r["durum"] == "Derece aldı" else -r["sira"])  # eksi: derecesiz
        S["at"].append(code("at", r["at"]))
        S["ba"].append(code("ba", r["baba"]))
        S["an"].append(code("an", r["anne"]))
        S["y"].append(r["yas"])
        S["rk"].append(code("rk", r["renk"]))
        S["c"].append(code("c", r["cinsiyet"]))
        S["kg"].append(round((r["kilo"] or 0) * 10))
        S["fz"].append(round((r["fazla_kilo"] or 0) * 10))
        S["j"].append(code("j", r["jokey"]))
        S["ap"].append(1 if r["apranti"] else 0)
        S["sh"].append(code("sh", r["sahip"]))
        S["an2"].append(code("tr", r["antrenor"]))
        S["st"].append(r["start"] or 0)
        S["ds"].append(1 if r["dis_start"] else 0)
        S["agf"].append(r["agf_sira"] or 0)
        S["hp"].append(r["hp"] if r["hp"] is not None else -1)
        S["sn"].append(round(r["derece_sn"] * 100) if r["derece_sn"] else -1)
        S["g"].append(round(r["ganyan"] * 100) if r["ganyan"] else -1)
        S["f"].append(code("f", r["fark"]))
        S["e"].append(code("e", r["ekipman"]))
        S["ye"].append(code("e", r["yeni_ekip"]))
        S["ara"].append(r["ara"])

    data = {"olusturma": rows[-1]["tarih"],
            "ilk": rows[0]["tarih"], "son": rows[-1]["tarih"],
            "dict": {k: v["list"] for k, v in D.items()}, "races": races, "starts": S,
            "apranti": apranti_oku(), "program": program_oku(), "kayit": program_oku("kayit")}
    path = os.path.join(out_dir, "data.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("window.TJK_DATA=")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";")
    print(f"{len(races['t'])} koşu, {len(rows)} start -> {path} ({os.path.getsize(path) // 1024} KB)")


if __name__ == "__main__":
    main()
