
import sys, zipfile, re
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
p = r"D:\临时\phy_handouts\out\workbook_word.docx"
d = Document(p)
print("paragraphs", len(d.paragraphs), "tables", len(d.tables))
print("images", len([r for r in d.part.rels.values() if "image" in r.reltype]))
h1 = [x.text.strip()[:40] for x in d.paragraphs if x.style.name == "Heading 1"]
print("H1 count", len(h1))
for t in h1[:3]: print("  ", t)
z = zipfile.ZipFile(p)
xml = z.read("word/document.xml").decode("utf-8")
print("fldChar begin", xml.count('w:fldCharType="begin"'), "instr TOC", 'TOC \\o "1-2"' in xml)
# dump TOC entry lines
toc = []
for para in d.paragraphs[:200]:
    if para.style.name in ("toc 1", "toc 2", "TOC 1", "TOC 2"):
        toc.append((para.style.name, para.text.strip()))
print("toc entries found", len(toc))
for t in toc[:6] + toc[-4:]:
    print("  ", t[0], "|", t[1][:80])
