"""Google Trends via pytrends: interesse por termos de aposta.

1. Série temporal BR (mensal, 2019-2026) por termo — sinal de alta frequência.
2. Interesse por UF (interest_by_region) — eixo geográfico do coroplético.

O Google aplica rate limit agressivo (429). Estratégia: retries com backoff
exponencial + cache em disco; roda uma vez e nunca mais bate na API.
"""
import json
import time

from config import CACHE, TRENDS_GEO, TRENDS_TERMS, TRENDS_TIMEFRAME, SIGLA_BY_NAME
from util_cache import save_processed

CACHE_F = CACHE / "trends_raw.json"


def _collect():
    from pytrends.request import TrendReq

    # NÃO passar retries/backoff aqui: pytrends monta urllib3 Retry com
    # method_whitelist, removido nas versões novas do urllib3. Retry é feito no loop abaixo.
    py = TrendReq(hl="pt-BR", tz=180, timeout=(15, 40))
    out = {"over_time": {}, "by_region": {}, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S")}

    for term in TRENDS_TERMS:
        for attempt in range(6):
            try:
                py.build_payload([term], geo=TRENDS_GEO, timeframe=TRENDS_TIMEFRAME)
                iot = py.interest_over_time()
                if not iot.empty:
                    s = iot[term]
                    out["over_time"][term] = {d.strftime("%Y-%m-%d"): int(v) for d, v in s.items()}
                ibr = py.interest_by_region(resolution="REGION", inc_low_vol=True)
                if not ibr.empty:
                    vals = {}
                    for name, row in ibr.iterrows():
                        # nomes vêm como "State of Sao Paulo"/"São Paulo" conforme hl
                        key = name.replace("State of ", "").replace("Federal District", "Distrito Federal")
                        sigla = SIGLA_BY_NAME.get(key)
                        if sigla is None:
                            import unicodedata
                            norm = lambda x: unicodedata.normalize("NFKD", x).encode("ascii", "ignore").decode().lower()
                            for nm, sg in SIGLA_BY_NAME.items():
                                if norm(nm) == norm(key):
                                    sigla = sg
                                    break
                        if sigla:
                            vals[sigla] = int(row[term])
                    out["by_region"][term] = vals
                print(f"  ok: {term}")
                time.sleep(8)
                break
            except Exception as e:
                wait = 20 * (2 ** attempt)
                print(f"  {term}: tentativa {attempt+1} falhou ({type(e).__name__}: {e}); aguardando {wait}s")
                time.sleep(wait)
        else:
            print(f"  DESISTIU de {term}")
    return out


def main():
    if CACHE_F.exists():
        out = json.loads(CACHE_F.read_text(encoding="utf-8"))
        print(f"cache: {len(out['over_time'])} séries, {len(out['by_region'])} mapas UF (coletado {out.get('fetched_at')})")
    else:
        out = _collect()
        if not out["over_time"]:
            raise RuntimeError("Google Trends não retornou nenhuma série; rode novamente mais tarde.")
        CACHE_F.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    save_processed("trends.json", {
        **out,
        "source": "Google Trends via pytrends, geo=BR, resolução UF, "
                  f"período {TRENDS_TIMEFRAME}, índice 0-100 relativo ao pico de cada série",
    })
    for t, s in out["over_time"].items():
        print(f"  {t}: {len(s)} pontos; UFs: {len(out['by_region'].get(t, {}))}")


if __name__ == "__main__":
    main()
