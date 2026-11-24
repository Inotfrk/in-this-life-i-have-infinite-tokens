
import sys, json, collections
from docx import Document
from docx.shared import Emu
import os

files = [
    r"G:\subject\Phy\讲义\cp2 week1.docx",
    r"G:\subject\Phy\讲义\cp3week2.docx",
    r"G:\subject\Phy\讲义\cp4&5 week3.docx",
    r"G:\subject\Phy\讲义\cp6.docx",
    r"G:\subject\Phy\讲义\Chapter9_Kinetic_Model_Bilingual_Handout (2).docx",
    r"G:\subject\Phy\讲义\Y10_Ch10_Ch11_Bilingual_Handout (1).docx",
]
for f in files:
    d = Document(f)
    styles = collections.Counter()
    heads = []
    nimg = 0
    ntab = 0
    for p in d.paragraphs:
        styles[p.style.name] += 1
        if p.style.name.lower().startswith(("heading", "title")) and p.text.strip():
            heads.append((p.style.name, p.text.strip()[:70]))
    ntab = len(d.tables)
    for rel in d.part.rels.values():
        if "image" in rel.reltype:
            nimg += 1
    sec = d.sections[0]
    print("=" * 100)
    print(os.path.basename(f))
    print("  paragraphs", len(d.paragraphs), "tables", ntab, "images", nimg)
    print("  page", round(sec.page_width.cm,1), "x", round(sec.page_height.cm,1), "margins", round(sec.left_margin.cm,2), round(sec.right_margin.cm,2))
    print("  styles:", dict(styles))
    print("  headings:")
    for s, t in heads[:40]:
        print("    ", s, "|", t)
