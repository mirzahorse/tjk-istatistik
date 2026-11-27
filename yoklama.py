import subprocess, urllib.parse
B = "https://medya-cdn.tjk.org"
for yol in ["/raporftp/TJKPDF/2020/2020-11-27/CSV/GunlukYarisSonuclari/27.11.2020-Bursa-GunlukYarisSonuclari-TR.csv",
            "/raporftp/TJKPDF/2020/2020-11-27/PDF/GunlukYarisSonuclari/27.11.2020-Bursa-GunlukYarisSonuclari-TR.pdf",
            "/raporftp/TJKPDF/2019/2019-11-29/CSV/GunlukYarisSonuclari/29.11.2019-Bursa-GunlukYarisSonuclari-TR.csv",
            "/raporftp/TJKPDF/2017/2017-11-24/CSV/GunlukYarisSonuclari/24.11.2017-Bursa-GunlukYarisSonuclari-TR.csv"]:
    u = B + urllib.parse.quote(yol, safe="/")
    r = subprocess.run(["curl", "-sS", "-I", "-L", "--max-time", "20", "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", u], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip(), yol)
