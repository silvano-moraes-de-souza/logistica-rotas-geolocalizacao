"""Route planning time per day, before and after the system (author's measurement).

    python scripts/chart_planning_time.py   ->  docs/planning_time.png
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

BEFORE_MIN, AFTER_MIN = 180, 2  # ~3 h by hand vs ~2 min with the system

fig, ax = plt.subplots(figsize=(8, 2.6), dpi=150)
for f in (fig, ax):
    f.set_facecolor("#fcfcfb")
labels = ["By hand: read PDFs, look up\naddresses, order stops", "With the system"]
ax.barh([1, 0], [BEFORE_MIN, AFTER_MIN], height=0.5, color=["#a3a29c", "#2a78d6"], zorder=2)
ax.text(BEFORE_MIN + 3, 1, "~3 h", va="center", fontsize=10, color="#0b0b0b")
ax.text(AFTER_MIN + 3, 0, f"~{AFTER_MIN} min  ({BEFORE_MIN // AFTER_MIN}x faster)", va="center",
        fontsize=10, color="#0b0b0b", fontweight="bold")  # fmt: skip
ax.set_yticks([1, 0], labels, fontsize=9, color="#0b0b0b")
ax.set_xlim(0, 215)
ax.set_xlabel("Minutes to plan one day of deliveries", color="#52514e", fontsize=9)
ax.tick_params(axis="x", colors="#52514e", labelsize=8)
ax.tick_params(axis="y", length=0)
ax.grid(axis="x", color="#e4e3df", linewidth=0.8, zorder=0)
for side in ("top", "right", "left"):
    ax.spines[side].set_visible(False)
ax.spines["bottom"].set_color("#e4e3df")
fig.tight_layout()
out = Path(__file__).resolve().parent.parent / "docs" / "planning_time.png"
fig.savefig(out, facecolor="#fcfcfb")
print(out)
