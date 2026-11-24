
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
data = json.load(open(r"D:\临时\phy_handouts\toc_entries.json", encoding="utf-8"))
for i, e in enumerate(data):
    if e["level"] == 2:
        print(i, "|", e["text"][:90])
