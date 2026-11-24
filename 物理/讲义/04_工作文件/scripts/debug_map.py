
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_pass1.pdf")
def dump(page_no, needle):
    page = d[page_no - 1]
    print("== page", page_no)
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                t = span.get("text", "")
                if needle.lower() in t.lower().replace(" ", ""):
                    print("  span size=%.1f font=%s :: %r" % (span["size"], span["font"], t))
# find pages containing 'convection'
for i in range(d.page_count):
    t = d[i].get_text().replace(" ", "").lower()
    if "convection对流" in t[:2000]:
        dump(i + 1, "convection")
        break
for i in range(d.page_count):
    t = d[i].get_text().replace(" ", "").lower()
    if "unitstable" in t:
        dump(i + 1, "units table")
        break
