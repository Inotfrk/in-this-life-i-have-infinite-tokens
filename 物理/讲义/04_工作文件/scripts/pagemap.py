
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
import fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else r"D:\临时\phy_handouts\out\workbook_pass1.pdf"
ENTRIES = r"D:\临时\phy_handouts\toc_entries.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else r"D:\临时\phy_handouts\pagemap.json"

CJK = re.compile(r"[\u3400-\u9fff]")

def norm(s):
    s = s.replace("\u00a0", " ")
    return re.sub(r"\s+", "", s).lower()

def probe(text, level):
    if level == 1:
        head = text.split("   ")[0]
    else:
        m = CJK.search(text)
        head = text[: m.start()] if m and m.start() >= 6 else text
    head = head.strip()
    return norm(head)[:16]

d = fitz.open(PDF)
big = []
full = []
for page in d:
    l1, l2 = [], []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                size = span.get("size", 0)
                t = span.get("text", "")
                if not t.strip():
                    continue
                if size >= 17.5:
                    l1.append(t)
                elif size >= 13.2:
                    l2.append(t)
    big.append((norm("".join(l1)), norm("".join(l2))))
    full.append(norm(page.get_text()))

entries = json.load(open(ENTRIES, encoding="utf-8"))
sel = [e for e in entries if e["level"] <= 2]
pagemap = {}
cursor = 0
misses = []
for e in sel:
    key = probe(e["text"], e["level"])
    found = None
    for p in range(cursor, len(big)):
        pool = big[p][0 if e["level"] == 1 else 1]
        if key and key in pool:
            found = p + 1
            break
    if found is None:
        for p in range(cursor, len(full)):
            if key and key in full[p]:
                found = p + 1
                break
    if found is None:
        misses.append(e["text"][:50])
    else:
        cursor = found - 1
        pagemap[e["anchor"]] = found

print("entries", len(sel), "mapped", len(pagemap), "misses", len(misses))
for m in misses:
    print("  MISS:", m)
json.dump(pagemap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
