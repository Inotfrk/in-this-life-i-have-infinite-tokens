
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_final.pdf")
out = r"D:\临时\phy_handouts\preview3"
os.makedirs(out, exist_ok=True)
for n in [2, 4, 41, 81, 98]:
    pix = d[n - 1].get_pixmap(dpi=110)
    pix.save(os.path.join(out, "p%03d.png" % n))
print("pages", d.page_count)
