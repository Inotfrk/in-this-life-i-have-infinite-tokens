
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_pass1.pdf"
d = fitz.open(p)
print("pages", d.page_count)
for i in range(min(6, d.page_count)):
    t = d[i].get_text()
    print("=" * 30, "page", i + 1)
    print(t[:900])
