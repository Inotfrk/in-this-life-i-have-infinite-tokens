
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_word.pdf"
d = fitz.open(p)
print("pages", d.page_count)
out = r"D:\临时\phy_handouts\preview_word"
os.makedirs(out, exist_ok=True)
for n in [1, 2, 4, 41, 121]:
    if n <= d.page_count:
        d[n - 1].get_pixmap(dpi=110).save(os.path.join(out, "p%03d.png" % n))
print("ok")
