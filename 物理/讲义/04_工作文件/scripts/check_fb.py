
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx")
body = d.element.body
print("tables", len(d.tables))
seq = []
for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'tbl':
        seq.append(("TBL", len(child.findall('.//' + qn('w:tr')))))
    elif tag == 'p':
        t = "".join(x.text or "" for x in child.iter(qn('w:t')))[:40]
        seq.append(("P", t))
    else:
        seq.append((tag, ""))
# print around 公式总表
for i, (k, v) in enumerate(seq):
    if k == "P" and "公式总表" in v:
        for j in range(max(0, i-2), min(len(seq), i+25)):
            print(j, seq[j])
        break
