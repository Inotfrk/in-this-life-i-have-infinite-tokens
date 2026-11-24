
import sys, io
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn
from docx.parts.document import DocumentPart
import inspect

print("get_or_add_image:", [m for m in dir(DocumentPart) if "image" in m.lower()])
try:
    print(inspect.signature(DocumentPart.get_or_add_image))
except Exception as e:
    print("sig err", e)

files = [
    r"G:\subject\Phy\讲义\cp2 week1.docx",
    r"G:\subject\Phy\讲义\cp3week2.docx",
    r"G:\subject\Phy\讲义\cp4&5 week3.docx",
    r"G:\subject\Phy\讲义\cp6.docx",
    r"D:\Appofmy\WeXin\xwechat_files\wxid_cypu5zb07seu12_da59\msg\file\2026-11\Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx",
    r"G:\subject\Phy\讲义\Chapter9_Kinetic_Model_Bilingual_Handout (2).docx",
    r"G:\subject\Phy\讲义\Y10_Ch10_Ch11_Bilingual_Handout (1).docx",
]
for f in files:
    d = Document(f)
    print("="*100)
    print(f.split("\\")[-1])
    body = d.element.body
    for i, child in enumerate(list(body.iterchildren())[:14]):
        tag = child.tag.split('}')[1]
        if tag == 'p':
            p = Paragraph(child, d)
            t = p.text.strip().replace("\n", " ")
            print(f"  [{i}] P {p.style.name!r} :: {t[:85]}")
        elif tag == 'tbl':
            tb = Table(child, d)
            print(f"  [{i}] TBL {len(tb.rows)}x{len(tb.columns)} :: {tb.rows[0].cells[0].text.strip()[:60]!r}")
        else:
            print(f"  [{i}] {tag}")
