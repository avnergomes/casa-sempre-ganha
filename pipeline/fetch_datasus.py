"""DATASUS: mortalidade por suicídio (SIM, CID-10 X60-X84) e rede de saúde
mental (CNES/CAPS), por UF e ano.

Caminho padrão: TABNET (agregação oficial do DATASUS, leve e reprodutível).
Caminho opcional --microdata: pysus baixa os microdados do SIM (DO*.dbc) e
reproduz a mesma tabulação a partir do CAUSABAS — validação da agregação.
"""
import re
import sys

from config import SIM_YEARS, UFS
from tabnet import find_option, parse_result_table, query, read_form
from util_cache import save_processed

SIGLAS = {name: sigla for _, (sigla, name) in UFS.items()}


def _num(s: str) -> int:
    s = s.replace(".", "").replace(",", ".").strip()
    if s in ("-", "...", ""):
        return 0
    return int(float(s))


def sim_suicide():
    """Óbitos por lesões autoprovocadas voluntariamente (X60-X84), UF de residência × ano."""
    def_path = "sim/cnv/ext10uf.def"
    form = read_form(def_path)

    arquivos = []
    arq_opts = form.get("Arquivos", [])
    for year in SIM_YEARS:
        v, _ = find_option(arq_opts, str(year)[2:])
        v2, _ = find_option(arq_opts, str(year))
        pick = v2 or v
        if pick:
            arquivos.append(pick)
    if not arquivos:
        # fallback: todos os arquivos
        arquivos = [v for v, _ in arq_opts]

    # seletor do grande grupo CID10
    sel_name, sel_val = None, None
    for name, opts in form.items():
        v, lbl = find_option(opts, "lesoes autoprovoc")
        if v:
            sel_name, sel_val = name, v
            break
    if not sel_name:
        raise RuntimeError(f"não achei o filtro X60-X84 em {def_path}; selects: {list(form)}")

    raw = query(def_path, linha="Unidade da Federação", coluna="Ano do Óbito",
                incremento="Óbitos p/Residênc", arquivos=arquivos,
                selections={sel_name: [sel_val]})
    header, rows = parse_result_table(raw)

    years = [h for h in header[1:] if re.fullmatch(r"\d{4}", h)]
    by_uf_year = {}
    for parts in rows:
        label = re.sub(r"^\d+\s*", "", parts[0])  # "35 São Paulo" -> "São Paulo"
        sigla = SIGLAS.get(label)
        if not sigla:
            continue
        by_uf_year[sigla] = {y: _num(v) for y, v in zip(years, parts[1:1 + len(years)])}

    assert len(by_uf_year) == 27, f"esperava 27 UFs, veio {len(by_uf_year)}: {list(by_uf_year)[:5]}"
    out = {"by_uf_year": by_uf_year, "years": years,
           "source": ("DATASUS/SIM via TABNET, óbitos por causas externas, "
                      "CID-10 X60-X84 (lesões autoprovocadas voluntariamente), por UF de residência e ano do óbito")}
    save_processed("datasus_sim.json", out)
    tot = {y: sum(u[y] for u in by_uf_year.values()) for y in years}
    print("SIM X60-X84 Brasil/ano:", tot)
    return out


def cnes_caps():
    """Número de CAPS (Centros de Atenção Psicossocial) por UF (CNES)."""
    for def_path in ("cnes/cnv/estabbr.def", "cnes/cnv/estabuf.def"):
        try:
            form = read_form(def_path)
        except Exception:
            continue
        if not form.get("Linha"):
            continue
        sel_name, sel_val, sel_lbl = None, None, None
        for name, opts in form.items():
            v, lbl = find_option(opts, "psicossocial")
            if v:
                sel_name, sel_val, sel_lbl = name, v, lbl
                break
        if not sel_name:
            continue
        arq = [v for v, _ in form.get("Arquivos", [])][:1]  # competência mais recente
        raw = query(def_path, linha="Unidade da Federação", coluna="Não ativa",
                    incremento="Quantidade", arquivos=arq,
                    selections={sel_name: [sel_val]})
        _, rows = parse_result_table(raw)
        vals = {}
        for parts in rows:
            label = re.sub(r"^\d+\s*", "", parts[0])
            sigla = SIGLAS.get(label)
            if sigla:
                vals[sigla] = _num(parts[-1])
        if len(vals) == 27:
            out = {"values": vals, "competencia": arq, "filter": sel_lbl, "def": def_path,
                   "source": f"DATASUS/CNES via TABNET ({def_path}), tipo de estabelecimento: {sel_lbl}"}
            save_processed("datasus_caps.json", out)
            print(f"CAPS: {sum(vals.values())} unidades em 27 UFs ({def_path}, {arq})")
            return out
        print(f"CAPS: {def_path} retornou {len(vals)} UFs, tentando próximo")
    raise RuntimeError("nenhum def do CNES expôs o filtro de CAPS com 27 UFs")


def sim_microdata_validation(years=(2023,), states=("SP",)):
    """Validação opcional via pysus: reproduz a contagem X60-X84 nos microdados."""
    from pysus.online_data.SIM import download

    for uf in states:
        for y in years:
            df = download(uf, y).to_dataframe()
            mask = df["CAUSABAS"].astype(str).str.match(r"X(6\d|7\d|8[0-4])")
            print(f"pysus SIM {uf} {y}: {int(mask.sum())} óbitos X60-X84 (microdados)")


if __name__ == "__main__":
    sim_suicide()
    try:
        cnes_caps()
    except Exception as e:
        print("CAPS: falhou —", e)
    if "--microdata" in sys.argv:
        sim_microdata_validation()
