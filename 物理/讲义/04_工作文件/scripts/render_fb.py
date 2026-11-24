
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_bilingual_fb.pdf")
print("pages", d.page_count)
out = r"D:\临时\phy_handouts\preview_fb"
os.makedirs(out, exist_ok=True)
for n in range(1, 10):
    d[n-1].get_pixmap(dpi=110).save(os.path.join(out, "p%03d.png" % n))
# find where 公式总表 appears
for i in range(d.page_count):
    t = d[i].get_text()
    if "Master Formula Bank" in t:
        print("formula bank page", i+1)
        break
