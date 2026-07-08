"""Referências acadêmicas via API OpenAlex, com DOI verificável e sem fabricação.

Cinco temas do relatório. Para cada um, busca por relevância+citações, filtra
por presença de DOI e tipo (article/review), e guarda os candidatos para curadoria.
"""
import json
import time
import urllib.parse
import urllib.request

from util_cache import save_processed
from config import SOURCES

MAILTO = "avnerpaesgomes@gmail.com"
BASE = "https://api.openalex.org/works"

TOPICS = {
    "prevalence": "problem gambling prevalence general population survey",
    "harm": "gambling related harm public health burden",
    "advertising": "gambling advertising marketing effect betting behaviour",
    "suicide": "problem gambling suicide suicidality risk",
    "regressivity": "lottery gambling regressive tax low income households",
}


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"mailto:{MAILTO}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def _reconstruct_abstract(inv):
    if not inv:
        return ""
    pos = {}
    for word, idxs in inv.items():
        for i in idxs:
            pos[i] = word
    return " ".join(pos[i] for i in sorted(pos))[:400]


def search_topic(query, per_page=25):
    params = {
        "search": query,
        "filter": "type:article|review,has_doi:true,is_paratext:false",
        "sort": "cited_by_count:desc",
        "per-page": per_page,
        "mailto": MAILTO,
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    data = _get(url)
    out = []
    for w in data.get("results", []):
        doi = (w.get("doi") or "").replace("https://doi.org/", "")
        if not doi:
            continue
        authors = [a["author"]["display_name"] for a in w.get("authorships", [])[:6]]
        out.append({
            "openalex_id": w["id"].split("/")[-1],
            "title": w.get("title"),
            "year": w.get("publication_year"),
            "doi": doi,
            "cited_by": w.get("cited_by_count"),
            "venue": (w.get("primary_location") or {}).get("source", {}).get("display_name")
                     if (w.get("primary_location") or {}).get("source") else None,
            "type": w.get("type"),
            "authors": authors,
            "abstract": _reconstruct_abstract(w.get("abstract_inverted_index")),
        })
    return out


def verify_doi(doi):
    """Confirma que o DOI resolve no OpenAlex e devolve título/ano canônicos."""
    try:
        w = _get(f"{BASE}/https://doi.org/{urllib.parse.quote(doi, safe='')}?mailto={MAILTO}")
        return {"ok": True, "title": w.get("title"), "year": w.get("publication_year"),
                "cited_by": w.get("cited_by_count")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main():
    catalog = {}
    for key, query in TOPICS.items():
        cands = search_topic(query)
        catalog[key] = cands
        print(f"{key}: {len(cands)} candidatos com DOI (top cited: "
              f"{cands[0]['cited_by'] if cands else 0})")
        time.sleep(1)
    (SOURCES / "openalex_candidates.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    print("salvo em data/sources/openalex_candidates.json")
    return catalog


if __name__ == "__main__":
    main()
