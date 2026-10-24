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

# a complete standalone document (works on Vercel, GitHub Pages or opened from disk)
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '</head>\n<body>\n' + html + '\n</body>\n</html>\n')
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf8")
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")


# ---------- phone remote (dist/remote.html) ----------
import json, re
titles = re.findall(r'<section class="slide[^"]*" data-steps="\d+" data-title="([^"]+)"', (SRC / "template.html").read_text(encoding="utf8"))
assert len(titles) == 13, len(titles)
r_html = (SRC / "remote.html").read_text(encoding="utf8")
r_js = ("const TITLES = " + json.dumps(titles, ensure_ascii=False) + ";\n"
        + (SRC / "notes.js").read_text(encoding="utf8") + "\n" + (SRC / "remote.js").read_text(encoding="utf8"))
r_html = r_html.replace("/*{{CSS}}*/", (SRC / "remote.css").read_text(encoding="utf8")).replace("/*{{JS}}*/", r_js)
r_html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
          '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
          '<meta name="apple-mobile-web-app-capable" content="yes">\n'
          '</head>\n<body>\n' + r_html + '\n</body>\n</html>\n')
R_OUT = OUT.parent / "remote.html"
R_OUT.write_text(r_html, encoding="utf8")
print(R_OUT, f"{R_OUT.stat().st_size / 1024:.0f} KB")
