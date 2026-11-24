
# ---------------------------------------------------------------- cover / toc / appendix
def make_para(doc, style=None, page_break=False):
    p = doc.add_paragraph(style=style) if style else doc.add_paragraph()
    if page_break:
        p.paragraph_format.page_break_before = True
    p._p.getparent().remove(p._p)
    return p

def set_cell_text(cell, text, size=9.5, bold=False, color="1A1A1A", align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = FONT_LATIN
    r.font.color.rgb = RGBColor.from_string(color)
    r._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), FONT_CJK)

def tune_table(table, widths_cm):
    table.autofit = False
    tbl = table._tbl
    tblPr = tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    for i, w in enumerate(widths_cm):
        table.columns[i].width = Cm(w)
    for row in table.rows:
        for i, w in enumerate(widths_cm):
            row.cells[i].width = Cm(w)

def build_cover(doc):
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(46)
    sp.paragraph_format.space_after = Pt(0)

    p = doc.add_paragraph(style="CoverEyebrow")
    p.add_run("CAMBRIDGE IGCSE PHYSICS 0625      ·      YEAR 10      ·      AIDI PHYSICS")
    para_border_bottom(p, color=C_MID, sz=12, space=10)

    t = doc.add_paragraph(style="CoverTitle")
    t.paragraph_format.space_before = Pt(34)
    t.add_run("IGCSE 物理讲义合集")

    s = doc.add_paragraph(style="CoverSub")
    s.add_run("Year 10 Physics Handouts  ·  Chapters 2–11")

    k = doc.add_paragraph(style="CoverKicker")
    k.add_run("中英双语  ·  教师答案版  ·  词汇 / 公式 / 例题 / 逐步解答")
    k.paragraph_format.space_after = Pt(34)

    rows = [
        ("收录范围", "第 2–11 章，共 7 份讲义，按章节顺序合订为一册"),
        ("版本说明", "Teacher Answer Version：含教师逐步解答、易错点与考试提示"),
        ("资料来源", "Aidi 老师 Year 10 物理课程（Cambridge IGCSE Physics 0625）微信讲义资料包"),
        ("本册整理", "统一页面与页脚、重排章节层级、合并目录 ｜ 2026-11-20"),
    ]
    table = doc.add_table(rows=len(rows), cols=2)
    table_borders(table, color="DCE3EA", sz=4, inside=True)
    tune_table(table, [3.4, 15.4])
    for i, (label, value) in enumerate(rows):
        c0, c1 = table.rows[i].cells
        shade(c0, "F2F6FA")
        set_cell_text(c0, label, size=9, bold=True, color=C_BLUE)
        set_cell_text(c1, value, size=9.5, color="333333")

    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(16)

    legend = doc.add_table(rows=1, cols=2)
    table_borders(legend, color="FFFFFF", sz=2, inside=False)
    tune_table(legend, [9.45, 9.45])
    c0, c1 = legend.rows[0].cells
    shade(c0, "FFF2CC")
    shade(c1, "DEEBF7")
    set_cell_text(c0, "MUST KNOW 必须掌握\n核心定义、公式与结论，考试直接得分", size=8.5, color="7F6000")
    set_cell_text(c1, "COMMON CONFUSION 易错提醒\n常见混淆、单位陷阱与失分点", size=8.5, color="1F4E79")
    for c in (c0, c1):
        for p in c.paragraphs:
            p.paragraph_format.left_indent = Cm(0.15)

    note = doc.add_paragraph(style="CoverSmall")
    note.paragraph_format.space_before = Pt(14)
    note.add_run("说明：本册把七份独立讲义按章节顺序合订；每章从新的一页开始，页脚为全册连续页码。")

def toc_entry_p(level, text, anchor, page):
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    ps = OxmlElement("w:pStyle")
    ps.set(qn("w:val"), "TOC%d" % level)
    pPr.append(ps)
    tabs = OxmlElement("w:tabs")
    tb = OxmlElement("w:tab")
    tb.set(qn("w:val"), "right")
    tb.set(qn("w:leader"), "dot")
    tb.set(qn("w:pos"), str(TAB_TWIPS))
    tabs.append(tb)
    pPr.append(tabs)
    p.append(pPr)

    hl = OxmlElement("w:hyperlink")
    hl.set(qn("w:anchor"), anchor)
    hl.set(qn("w:history"), "1")
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    r.append(t)
    hl.append(r)
    r2 = OxmlElement("w:r")
    r2.append(OxmlElement("w:tab"))
    hl.append(r2)
    r3 = OxmlElement("w:r")
    t3 = OxmlElement("w:t")
    t3.text = str(page) if page else "—"
    r3.append(t3)
    hl.append(r3)
    p.append(hl)
    return p

def fld_run(kind, instr=None):
    r = OxmlElement("w:r")
    if instr is not None:
        it = OxmlElement("w:instrText")
        it.set(qn("xml:space"), "preserve")
        it.text = instr
        r.append(it)
    else:
        fc = OxmlElement("w:fldChar")
        fc.set(qn("w:fldCharType"), kind)
        if kind == "begin":
            fc.set(qn("w:dirty"), "true")
        r.append(fc)
    return r

def build_toc(doc, entries, pages):
    h = doc.add_paragraph(style="TOCHead")
    h.add_run("目录")
    h2 = doc.add_paragraph(style="TOCHeadEn")
    h2.add_run("Contents")
    note = doc.add_paragraph(style="CoverSmall")
    note.add_run("页码为全册连续页码；各章均从新的一页开始。在 Word 中可右键目录 →「更新域」重新生成。")
    note.paragraph_format.space_after = Pt(4)
    para_border_bottom(note, color="D9D9D9", sz=6, space=6)

    if not entries:
        return
    for i, e in enumerate(entries):
        page = pages.get(e["anchor"])
        p = toc_entry_p(e["level"], e["text"], e["anchor"], page)
        if i == 0:
            p.insert(0, fld_run("begin"))
            p.insert(1, fld_run("instr", ' TOC \\o "1-2" \\h \\z \\u '))
            p.insert(2, fld_run("separate"))
        if i == len(entries) - 1:
            p.append(fld_run("end"))
        body_append(doc, p)

def build_appendix(doc):
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.page_break_before = True
    h.add_run("附录 · 讲义来源与使用说明")

    intro = doc.add_paragraph()
    intro.paragraph_format.space_after = Pt(8)
    r = intro.add_run("这些讲义从哪里来")
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(C_BLUE)
    intro.add_run("：本册收录的 7 份讲义，全部来自 Aidi 老师 Year 10 物理课程（Cambridge IGCSE Physics 0625）"
                  "随堂发放的课件与讲义资料，通过微信接收后保存在本机（部分同时备份在 iCloud 与移动硬盘）。"
                  "讲义正文按老师 PPT 的章节顺序组织，以 python-docx 生成，中英对照、含公式表、PPT 例题与逐步解答，"
                  "因此没有可“下载”的网页出处——它们就是课程资料本身。")

    rows = [
        ("第 2 章", "cp2 week1.docx", "本地已有", "Week 1 Student Handout · 教师答案版"),
        ("第 3 章", "cp3week2.docx", "2026-09", "Chapter 3 — Forces and Motion"),
        ("第 4–5 章", "cp4&5 week3.docx", "2026-09", "Chapters 4 & 5 · 逐步解答"),
        ("第 6 章", "cp6.docx", "2026-10", "Chapter 6 · 教师答案版"),
        ("第 7–8 章", "Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx", "2026-11", "Chapters 7 & 8 · PPT 版答案"),
        ("第 9 章", "Chapter9_Kinetic_Model_Bilingual_Handout (2).docx", "2026-11", "Chapter 9 · 双语要点讲义"),
        ("第 10–11 章", "Y10_Ch10_Ch11_Bilingual_Handout (1).docx", "2026-11", "Chapters 10 & 11 · 教师答案版"),
    ]
    table = doc.add_table(rows=len(rows) + 1, cols=4)
    table_borders(table, color="D9D9D9", sz=4, inside=True)
    tune_table(table, [2.3, 7.6, 2.2, 6.7])
    headers = ["讲次", "本册使用的原文件", "微信收到", "原始说明"]
    for j, htext in enumerate(headers):
        c = table.rows[0].cells[j]
        shade(c, "EDF2F7")
        set_cell_text(c, htext, size=8.5, bold=True, color=C_BLUE)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            set_cell_text(table.rows[i].cells[j], val, size=8.5, color="333333")

    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(6)

    def bullet(title, text):
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(3)
        r1 = p.add_run(title)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor.from_string(C_BLUE)
        p.add_run(text)

    bullet("章节范围：", "已收到第 2–11 章讲义；第 1 章（测量与单位）与第 12 章起的讲义，本机与微信资料中都没有，"
           "本册不作补写，避免与老师的版本混用。")
    bullet("版本差异：", "微信原件与本地副本内容一致，其中第 3、4–5、6 章的本地副本经过重新保存（体积略大），"
           "本册采用本地最新版本。")
    bullet("同名资料：", "第 7–8 章另有 PDF 版《Y10_Ch7_Ch8_Clean_No_Handwritten_Notes.pdf》，"
           "本册采用同源的 Word 版合订，图片与答案更清晰。")
    bullet("未合入：", "《Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf》（复习册）与"
           "《IGCSE_Physics_Ch2-11_No_Blank_Page.pdf》（60 分钟练习卷）属于复习与测评材料，不是讲义，未合入本册。")

    h2 = doc.add_paragraph(style="Heading 2")
    h2.add_run("本册使用说明")
    for title, text in [
        ("目录：", "目录为 Word 目录域，共两级（章 / 节）。若在 Word 中调整字号或页边距，右键目录 →「更新域」即可重算页码。"),
        ("章节层级：", "每章以标题分页开始；原讲义的章节标题已统一为二级标题，小节为三级标题，浏览窗格可直接跳转。"),
        ("颜色：", "黄色框为 MUST KNOW（必须掌握），蓝色框为 COMMON CONFUSION（易错提醒），绿色字为教师答案。"),
    ]:
        bullet(title, text)

# ---------------------------------------------------------------- main
def main():
    pagemap = {}
    out_name = "IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx"
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], encoding="utf-8") as f:
            pagemap = json.load(f)
    if len(sys.argv) > 2:
        out_name = sys.argv[2]

    doc = Document()
    setup_styles(doc)
    sec = setup_page(doc)
    add_footer(sec, "IGCSE Physics 0625 · Year 10 讲义合集 · Ch2–11")

    add_custom_style(doc, "TOCHead", "TOC Head", size=24, bold=True, color=C_DARK, after=0, line=240)
    add_custom_style(doc, "TOCHeadEn", "TOC Head En", size=10, bold=False, color=C_LIGHTGREY, after=2, line=240)
    tst = doc.styles.element.findall(qn("w:style"))
    for st in tst:
        if st.get(qn("w:styleId")) == "TOCHead":
            pPr = st.find(qn("w:pPr"))
            pPr.insert(0, OxmlElement("w:pageBreakBefore"))

    content = []
    entries = []
    counter = [0]
    for cfg in SOURCES:
        make_part_header(doc, cfg, content)
        copy_source(doc, cfg, content, entries, counter)

    build_cover(doc)
    build_toc(doc, entries, pagemap)
    for e in content:
        body_append(doc, e)
    build_appendix(doc)

    out_path = os.path.join(OUT, out_name)
    doc.save(out_path)
    with open(os.path.join(WORK, "toc_entries.json"), "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    print("saved", out_path, "entries", len(entries))

if __name__ == "__main__":
    main()
