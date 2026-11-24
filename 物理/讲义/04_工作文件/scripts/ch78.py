
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

f = r"D:\Appofmy\WeXin\xwechat_files\wxid_cypu5zb07seu12_da59\msg\file\2026-11\Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx"
d = Document(f)
print("paragraphs", len(d.paragraphs), "tables", len(d.tables))
print("sections:", len(d.sections))
sec = d.sections[0]
print("page", round(sec.page_width.cm,2), round(sec.page_height.cm,2), "margins", round(sec.left_margin.cm,2), round(sec.right_margin.cm,2))
maxw = 0
for t in d.tables:
    try:
        w = sum(int(g.get(qn('w:w'))) for g in t._tbl.tblGrid.findall(qn('w:gridCol')))
        maxw = max(maxw, w)
    except Exception: pass
print("max table width cm", round(maxw/567, 2))
import collections
st = collections.Counter(p.style.name for p in d.paragraphs)
print("styles", dict(st))
nimg = sum(1 for rel in d.part.rels.values() if "image" in rel.reltype)
print("images", nimg)
print("--- first 40 blocks")
body = d.element.body
i = 0
for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'p':
        p = Paragraph(child, d)
        nimg2 = len(child.findall('.//' + qn('a:blip')))
        if p.text.strip() or nimg2:
            print(f"  [{i}] P {p.style.name!r} img={nimg2} :: {p.text.strip()[:100]}")
    elif tag == 'tbl':
        tb = Table(child, d)
        print(f"  [{i}] TABLE {len(tb.rows)}x{len(tb.columns)} {tb.rows[0].cells[0].text.strip()[:50]!r}")
    i += 1
    if i > 45: break
print("--- headings")
for p in d.paragraphs:
    if p.style.name.lower().startswith(("heading","title")) and p.text.strip():
        print("  ", p.style.name, "|", p.text.strip()[:100])
