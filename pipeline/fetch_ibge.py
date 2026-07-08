"""IBGE via API SIDRA/agregados v3 (com sidrapy como caminho alternativo).

Coleta:
1. População por UF (estimativas, agregado 6579) — denominador das taxas do SIM.
2. Rendimento domiciliar per capita por UF (PNAD Contínua) — eixo de renda do
   coroplético e dos contrafactuais. O agregado é descoberto por busca no
   catálogo oficial para resistir a mudanças de numeração.
"""
import json
import unicodedata

from config import UFS
from util_cache import cached_get, save_processed

BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()


def catalog():
    raw = cached_get(BASE)
    return json.loads(raw)


def find_aggregate(*terms, prefer=()):
    """Procura agregados cujo nome contém todos os termos (sem acento)."""
    hits = []
    for pesquisa in catalog():
        for ag in pesquisa.get("agregados", []):
            nome = _norm(ag["nome"])
            if all(_norm(t) in nome for t in terms):
                hits.append((ag["id"], ag["nome"], pesquisa["nome"]))
    for pid in prefer:
        for h in hits:
            if str(h[0]) == str(pid):
                return [h] + [x for x in hits if x is not h]
    return hits


def fetch_values(agregado, variavel, periodo="-1", nivel="N3"):
    url = f"{BASE}/{agregado}/periodos/{periodo}/variaveis/{variavel}?localidades={nivel}[all]"
    raw = cached_get(url)
    return json.loads(raw)


def population_by_uf():
    """Agregado 6579 (Estimativas de população), variável 9324."""
    data = fetch_values(6579, 9324)
    out = {}
    period = None
    for var in data:
        for res in var["resultados"]:
            for serie in res["series"]:
                loc = serie["localidade"]
                code = loc["id"]
                if code in UFS:
                    for per, val in serie["serie"].items():
                        period = per
                        out[UFS[code][0]] = int(val)
    return {"period": period, "values": out,
            "source": "IBGE, Estimativas de População (agregado SIDRA 6579, variável 9324)"}


def income_by_uf():
    """Rendimento médio mensal real domiciliar per capita, por UF (PNAD Contínua anual).

    Alvo canônico: agregado 7395, variável 4196 (nível N3/UF, valores em Reais a
    preços médios do último ano). Fallbacks curados mantêm o mesmo conceito.
    """
    candidates = [
        (7395, 4196, "Rendimento médio mensal real domiciliar per capita"),
        (7434, 4196, "Rendimento médio mensal real domiciliar per capita"),
        (882, 2135, "Valor do rendimento médio mensal domiciliar per capita (nominal)"),
    ]
    errors = []
    for ag_id, var, label in candidates:
        try:
            data = fetch_values(ag_id, var)
            out, period = {}, None
            for vv in data:
                for res in vv["resultados"]:
                    for serie in res["series"]:
                        code = serie["localidade"]["id"]
                        if code in UFS:
                            for per, val in serie["serie"].items():
                                if val not in ("...", "-", None):
                                    period = per
                                    out[UFS[code][0]] = float(val)
            if len(out) == 27:
                return {"period": period, "values": out, "aggregate": ag_id, "variable": var,
                        "source": (f"IBGE/PNAD Contínua, {label} "
                                   f"(agregado SIDRA {ag_id}, variável {var}), preços médios do último ano")}
            errors.append(f"{ag_id}/{var}: {len(out)} UFs")
        except Exception as e:
            errors.append(f"{ag_id}/{var}: {e}")
    raise RuntimeError("Nenhum agregado de renda média per capita retornou 27 UFs: " + "; ".join(errors))


def main():
    pop = population_by_uf()
    save_processed("ibge_population_uf.json", pop)
    print(f"populacao: {pop['period']} · {len(pop['values'])} UFs · BR={sum(pop['values'].values()):,}")
    inc = income_by_uf()
    save_processed("ibge_income_uf.json", inc)
    print(f"renda: {inc['period']} · {len(inc['values'])} UFs · fonte: {inc['source']}")


if __name__ == "__main__":
    main()
