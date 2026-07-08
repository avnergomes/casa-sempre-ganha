"""Consolida tudo em data/report_data.json e injeta no index.html.

O index.html carrega os dados de um bloco <script id="report-data"> entre os
marcadores /*__DATA_START__*/ e /*__DATA_END__*/ — este script substitui o
conteúdo entre eles, mantendo o relatório 100% autocontido.
"""
import json
import re
import time
from pathlib import Path

from config import ROOT, SOURCES
from util_cache import load_processed

INDEX = ROOT / "index.html"


def build():
    data = {
        "generated_at": time.strftime("%Y-%m-%d"),
        "sim": load_processed("datasus_sim.json"),
        "caps": load_processed("datasus_caps.json"),
        "population": load_processed("ibge_population_uf.json"),
        "income": load_processed("ibge_income_uf.json"),
        "search_index": load_processed("search_index_uf.json"),
        "trends": load_processed("trends.json"),
        "geometry": load_processed("uf_geometry.json"),
        "monte_carlo": load_processed("monte_carlo.json"),
        "stl": load_processed("seasonal_stl.json"),
        "correlations": load_processed("uf_correlations.json"),
    }
    # trends é grande; guardamos só o over_time (séries) e o composto por UF já está em search_index
    if data.get("trends"):
        data["trends"] = {"over_time": data["trends"].get("over_time", {}),
                          "source": data["trends"].get("source")}
    for name, key in [("manual_sources.json", "manual"), ("references.json", "references")]:
        f = SOURCES / name
        if f.exists():
            data[key] = json.loads(f.read_text(encoding="utf-8"))

    missing = [k for k, v in data.items() if v is None]
    if missing:
        print("AVISO: blocos ausentes:", missing)

    out = ROOT / "data" / "report_data.json"
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"report_data.json: {out.stat().st_size/1024:.0f} KB")
    return data


def inject(data=None):
    if data is None:
        data = json.loads((ROOT / "data" / "report_data.json").read_text(encoding="utf-8"))
    if not INDEX.exists():
        print("index.html ainda não existe; injeção pulada")
        return
    html = INDEX.read_text(encoding="utf-8")

    # 1) injeta os dados
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    new = re.sub(r"(/\*__DATA_START__\*/).*?(/\*__DATA_END__\*/)",
                 lambda m: m.group(1) + "window.__DATA__=" + blob + ";" + m.group(2),
                 html, flags=re.S)
    if new == html:
        print("AVISO: marcadores __DATA_START__/__DATA_END__ não encontrados")

    # 2) inlina o JS da aplicação (mantém o arquivo 100% autocontido)
    js_path = ROOT / "assets" / "report.js"
    if js_path.exists():
        js = js_path.read_text(encoding="utf-8").replace("</script>", "<\\/script>")
        new2 = re.sub(r"(/\*__JS_START__\*/).*?(/\*__JS_END__\*/)",
                      lambda m: m.group(1) + "\n" + js + "\n" + m.group(2),
                      new, flags=re.S)
        if new2 == new and "/*__JS_START__*/" not in new:
            print("AVISO: marcadores __JS_START__/__JS_END__ não encontrados")
        new = new2

    INDEX.write_text(new, encoding="utf-8")
    print(f"index.html atualizado: {INDEX.stat().st_size/1024:.0f} KB (autocontido)")


if __name__ == "__main__":
    inject(build())
