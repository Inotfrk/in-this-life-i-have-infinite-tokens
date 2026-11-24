
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx")
body = d.element.body
seq = []
for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'tbl':
        first = "".join(x.text or "" for x in child.iter(qn('w:t')))[:30]
        seq.append(("TBL", first))
    elif tag == 'p':
        t = "".join(x.text or "" for x in child.iter(qn('w:t')))[:40]
        seq.append(("P", t))
    else:
        seq.append((tag, ""))
print("total seq", len(seq))
for i, (k, v) in enumerate(seq):
    if k == "TBL" and ("公式" in v or "Formula" in v):
        print("formula table at", i, v)
print("--- tail ---")
for j in range(len(seq)-8, len(seq)):
    print(j, seq[j])
