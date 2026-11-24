
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
data = json.load(open(r"D:\临时\phy_handouts\toc_entries.json", encoding="utf-8"))
from collections import Counter
print(Counter(e["level"] for e in data))
cur = None
for e in data:
    if e["level"] == 2 and e["text"].startswith("第 "):
        cur = e["text"][:14]
        print("\n==", e["text"])
    elif cur and e["text"].startswith("第 "):
        cur = e["text"][:14]
        print("\n==", e["text"])
    else:
        if cur and cur.startswith("第 4"):
            print("   L%d %s" % (e["level"], e["text"][:80]))
