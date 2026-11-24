
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_pass1.pdf"
out = r"D:\临时\phy_handouts\preview"
os.makedirs(out, exist_ok=True)
d = fitz.open(p)
for n in [1, 2, 4, 5]:
    page = d[n - 1]
    pix = page.get_pixmap(dpi=110)
    fp = os.path.join(out, "p%03d.png" % n)
    pix.save(fp)
    print(fp, pix.width, pix.height)
