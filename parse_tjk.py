"""TJK resmi günlük sonuç CSV'lerini (GunlukYarisSonuclari) tek tabloya çevirir.
Kullanım: python3 parse_tjk.py <csv klasörü> <çıktı.csv>"""
import csv, glob, os, re, sys

EKIPMAN = {"SGKR", "SK", "KG", "DB", "K", "SKG", "GKR", "ÖG", "YP", "BB", "TB", "KK", "BT"}
RENK = {"d": "Doru", "a": "Al", "k": "Kır", "y": "Yağız"}
CINS = {"e": "Erkek", "a": "Erkek", "i": "Erkek", "g": "Erkek", "d": "Dişi", "k": "Dişi"}
PISTLER = ("Sentetik", "Kum", "Çim")


def num(s):
    s = (s or "").strip().replace(".", "").replace(",", ".") if "," in (s or "") else (s or "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def sure(s):
    m = re.match(r"^(\d+)[:.](\d+)\.(\d+)$", (s or "").strip())
    return round(int(m[1]) * 60 + int(m[2]) + int(m[3]) / 100, 2) if m else None


def tur(sinif):
    s = sinif.upper()
    for k, v in (("KISA VADE", "Kısa Vade Handikap"), ("AMATÖR", "Amatör"), ("KADIN AMATÖR", "Amatör"), ("MAIDEN", "Maiden"), ("ŞARTLI", "Şartlı"), ("HANDİKAP", "Handikap"), ("HANDIKAP", "Handikap"),
                 ("KV", "KV"), ("SATIŞ", "Satış"), ("G 1", "Grup 1"), ("G 2", "Grup 2"), ("G 3", "Grup 3"), ("G1", "Grup 1"), ("G2", "Grup 2"), ("G3", "Grup 3"),
                 ("A3", "A3"), ("ÖZEL", "Özel")):
        if s.startswith(k):
            return v
    return "Diğer"


DUZELTME_DOSYASI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "duzeltmeler.csv")
_DUZ = None


def duzeltmeler():
    """TJK'nın yarıştan sonra yaptığı düzeltmeler (ör. diskalifiye).
    Günlük CSV'ler bunları içermiyor; TJK istatistikleri içeriyor."""
    global _DUZ
    if _DUZ is None:
        _DUZ = []
        if os.path.exists(DUZELTME_DOSYASI):
            for ln in open(DUZELTME_DOSYASI, encoding="utf-8").read().splitlines()[1:]:
                c = [x.strip() for x in ln.split(";")]
                if len(c) >= 5 and c[0]:
                    _DUZ.append({"tarih": c[0], "hipodrom": c[1], "kosu_no": int(c[2]), "at": c[3], "islem": c[4]})
    return _DUZ


def duzelt(out, tarih, hip):
    for d in duzeltmeler():
        if d["tarih"] != tarih or d["hipodrom"] != hip:
            continue
        if d["islem"] == "iptal":  # koşu istatistiklerde hiç sayılmıyor
            out[:] = [r for r in out if r["kosu_no"] != d["kosu_no"]]
            continue
        if d["islem"] != "diskalifiye":
            continue
        kosu = [r for r in out if r["kosu_no"] == d["kosu_no"]]
        hedef = next((r for r in kosu if r["at"] == d["at"]), None)
        if not hedef or hedef["durum"] == "Diskalifiye":
            continue
        eski = hedef["sira"]
        for r in kosu:
            if r is not hedef and r["durum"] == "Derece aldı" and r["sira"] > eski:
                r["sira"] -= 1
        hedef["durum"] = "Diskalifiye"
        hedef["sira"] = len(kosu)


def parse_file(path):
    ad = os.path.basename(path)[:-4]
    tarih, hip = ad.split("_", 1)
    ham = open(path, "rb").read()
    try:
        lines = ham.decode("utf-8-sig").splitlines()
    except UnicodeDecodeError:   # birkaç eski dosya Windows-1254 kodlamalı
        lines = ham.decode("cp1254").splitlines()
    gun_no = ""
    m = re.search(r"\((\d+)\. Yarış Günü\)", lines[0]) if lines else None
    if m:
        gun_no = int(m[1])
    out, race, prize = [], None, None
    for ln in lines[1:]:
        f = ln.split(";")
        rm = re.match(r"^\s*(\d+)\. Kosu :\s*(.*?)\s*(\d{1,2}[.:]\d{2})\s*$", f[0])  # eski yıllarda saat 13:30 biçiminde
        if rm:
            parts = [p.strip() for p in f]
            mes = next((int(x[:-1]) for x in parts if re.fullmatch(r"\d{3,4}m", x)), None)
            pist = next((p for p in parts if p in PISTLER), "")
            grp = parts[2] if len(parts) > 2 else ""
            sinif = parts[1] if len(parts) > 1 else ""
            rek = re.search(r"Rekor Derece :\s*([\d.:]+)", ln)
            race = {"kosu_no": int(rm[1]), "kosu_adi": rm[2].strip(), "saat": rm[3].replace(":", "."), "sinif": sinif, "kosu_turu": tur(sinif),
                    "disi_kosusu": "Dişi" in sinif, "yas_grubu": re.sub(r"\s*(İngilizler|Araplar)$", "", grp),
                    "irk": "İngiliz" if "İngiliz" in grp else ("Arap" if "Arap" in grp else ""),
                    "mesafe": mes, "pist": pist, "rekor": rek[1] if rek else ""}
            prize = None
            continue
        if race and prize is None and ln.startswith("1.)"):
            pm = re.match(r"1\.\)\s*([\d.]+)", ln)
            prize = int(pm[1].replace(".", "")) if pm else ""
            race["ikramiye_1"] = prize
            # ilk 5 sıranın ikramiyesi (satırın sonundaki yetiştirici primleri hariç)
            race["ikramiyeler"] = [int(x.replace(".", "")) for x in re.findall(r"\d\.\)\s*([\d.]+)\s*TL", ln)[:5]]
            continue
        if race and len(f) >= 15 and re.fullmatch(r"\d+", f[0].strip()) and re.match(r"^\d+y", f[2].strip()):
            toks = f[1].split()
            ekip = []
            while len(toks) > 1 and toks[-1] in EKIPMAN:
                ekip.insert(0, toks.pop())
            yas = f[2].split()
            kilo = f[5].strip().split()
            jok = f[6].strip()
            ap = jok.endswith(" AP")
            st = f[9].strip()
            agf = re.match(r"%([\d.]+)\((\d+)\)", f[10].strip())
            der = f[12].strip()
            if der == "Koşmaz":          # koşmayan at
                continue
            durum = "Derecesiz" if der == "Derecesiz" or not der else "Derece aldı"
            if der == "Derecesiz":
                der = ""
            out.append({"tarih": tarih, "hipodrom": hip, "gun_no": gun_no, **race,
                        "sira": int(f[0]), "durum": durum, "at": " ".join(toks), "ekipman": " ".join(ekip),
                        "yas": int(yas[0][:-1]), "renk": RENK.get(yas[1], yas[1]) if len(yas) > 1 else "",
                        "cinsiyet": CINS.get(yas[2], yas[2]) if len(yas) > 2 else "",
                        "cinsiyet_kodu": yas[2] if len(yas) > 2 else "",
                        "baba": f[3].strip(), "anne": f[4].strip(), "kilo": num(kilo[0]) if kilo else None,
                        "fazla_kilo": num(kilo[1].lstrip("+")) if len(kilo) > 1 else None,
                        "jokey": jok[:-3].strip() if ap else jok, "apranti": ap,
                        "sahip": f[7].strip(), "antrenor": f[8].strip(),
                        "start": int(re.match(r"\d+", st)[0]) if re.match(r"\d+", st) else None,
                        "dis_start": "DS" in st,
                        "agf": float(agf[1]) if agf else None, "agf_sira": int(agf[2]) if agf else None,
                        "hp": int(f[11]) if f[11].strip().isdigit() else None,
                        "derece": der.replace(":", ".", 1) if der else "", "derece_sn": sure(der),
                        "ganyan": num(f[13]), "fark": re.sub(r"\s+", " ", f[14].strip())})
    # ölü yarış: fark sütununda "At Başı" yazan atla bir alttaki at aynı sırayı paylaşır
    # (TJK resmi istatistikleri de ikisini aynı sırada sayar)
    onceki = None
    for r in out:
        if onceki and onceki["kosu_no"] == r["kosu_no"] and onceki["fark"] == "At Başı" and r["durum"] == "Derece aldı":
            r["sira"] = onceki["sira"]
            r["olu_yaris"] = True
            onceki["olu_yaris"] = True
        r.setdefault("olu_yaris", False)
        onceki = r
    duzelt(out, tarih, hip)
    # kazanç: sırasına düşen ikramiye; ölü yarışta paylaşılan sıraların ikramiyesi eşit bölünür
    for k in {r["kosu_no"] for r in out}:
        kosu = [r for r in out if r["kosu_no"] == k]
        ikr = (kosu[0].get("ikramiyeler") or []) + [0] * 5
        sayi = {}
        for r in kosu:
            if r["durum"] == "Derece aldı":
                sayi[r["sira"]] = sayi.get(r["sira"], 0) + 1
        for r in kosu:
            n_ = sayi.get(r["sira"], 0) if r["durum"] == "Derece aldı" else 0
            r["kazanc"] = round(sum(ikr[r["sira"] - 1 + j] for j in range(n_) if r["sira"] - 1 + j < 5) / n_) if n_ and r["sira"] <= 5 else 0
    # koşudaki at sayısı
    n = {}
    for r in out:
        n[r["kosu_no"]] = n.get(r["kosu_no"], 0) + 1
    for r in out:
        r["kosan_sayisi"] = n[r["kosu_no"]]
    return out


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    rows = []
    for p in sorted(glob.glob(os.path.join(src, "*.csv"))):
        rows += parse_file(p)
    cols = list(rows[0].keys())
    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("1" if v is True else "0" if v is False else ("" if v is None else v)) for k, v in r.items()})
    print(len(rows), "satır", len({(r['tarih'], r['hipodrom'], r['kosu_no']) for r in rows}), "koşu")
