
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_final2.pdf")
print("pages", d.page_count)
pages = {}
for i in range(d.page_count):
    t = d[i].get_text()
    if "Master Formula Bank · Chapters" in t and "公式总表" in t and i > 3:
        pages["formula"] = i + 1
    if "附录 B · 高频单词表与必背句" in t and i > 3:
        pages["wordlist"] = i + 1
    if "二、必背句（直接背下来）" in t and i > 3:
        pages["sents"] = i + 1
print(pages)
out = r"D:\临时\phy_handouts\preview_final"
os.makedirs(out, exist_ok=True)
for k, n in pages.items():
    for off in range(0, 2):
        if n + off <= d.page_count:
            d[n - 1 + off].get_pixmap(dpi=110).save(os.path.join(out, "%s_%d.png" % (k, off + 1)))
print("rendered")
