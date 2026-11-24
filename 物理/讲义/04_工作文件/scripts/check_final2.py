
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_final2.pdf")
print("pages", d.page_count)
for i in range(d.page_count):
    t = d[i].get_text()
    if "Master Formula Bank" in t:
        print("formula bank starts p", i+1); break
for i in range(d.page_count):
    t = d[i].get_text()
    if "高频单词表" in t:
        print("word list starts p", i+1); break
