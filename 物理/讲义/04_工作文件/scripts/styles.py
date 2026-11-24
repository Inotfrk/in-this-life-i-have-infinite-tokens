
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
import re

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
    styles_xml = d.styles.element.xml
    m = re.search(r"<w:docDefaults>.*?</w:docDefaults>", styles_xml, re.S)
    dd = m.group(0) if m else ""
    fonts = re.findall(r'w:ascii="([^"]+)"', dd)[:3] + re.findall(r'w:eastAsia="([^"]+)"', dd)[:3]
    sz = re.findall(r'<w:sz w:val="(\d+)"', dd)[:2]
    print("="*90)
    print(f.split("\\")[-1], "| docDefaults fonts:", fonts, "sizes:", sz)
    # style ids present
    ids = re.findall(r'<w:style [^>]*w:styleId="([^"]+)"', styles_xml)
    print("  styleIds:", ", ".join(sorted(ids))[:600])
    # paragraph-level fonts used
    used_fonts = set()
    for p in d.paragraphs[:400]:
        for r in p.runs:
            if r.font.name: used_fonts.add(r.font.name)
    print("  run fonts used:", sorted(used_fonts)[:10])
    num = re.findall(r'<w:numPr>', d.element.body.xml)
    print("  numPr in body:", len(num))
    sect = d.sections[0]
    print("  page:", round(sect.page_width.cm,2), "x", round(sect.page_height.cm,2), "margins L/R/T/B:", round(sect.left_margin.cm,2), round(sect.right_margin.cm,2), round(sect.top_margin.cm,2), round(sect.bottom_margin.cm,2))
