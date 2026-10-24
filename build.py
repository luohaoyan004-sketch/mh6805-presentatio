"""Inline CSS, JS and the SHAP figure layers into one self-contained HTML page."""
import base64
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "dist" / "who-should-the-bank-call.html"


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


html = (SRC / "template.html").read_text(encoding="utf8")
css = (SRC / "style.css").read_text(encoding="utf8") + "\n" + (SRC / "slides.css").read_text(encoding="utf8")
js = (SRC / "notes.js").read_text(encoding="utf8") + "\n" + (SRC / "app.js").read_text(encoding="utf8")

html = html.replace("/*{{CSS}}*/", css).replace("/*{{JS}}*/", js)
html = html.replace("{{SHAP_INK}}", data_uri(ROOT / "assets" / "shap_ink_plot.png"))
html = html.replace("{{SHAP_DOTS}}", data_uri(ROOT / "assets" / "shap_dots_plot.png"))
assert "{{" not in html, "unfilled placeholder"

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf8")
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")
