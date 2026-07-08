"""Modelos do relatório.

1. Monte Carlo da banca do apostador com RTP 93% — a perda estrutural.
2. Decomposição sazonal (STL) da série do Google Trends.
3. Correlação de Spearman entre UFs (busca × suicídio × renda) com IC bootstrap.
   As associações são espaciais e NÃO causais (falácia ecológica sinalizada no texto).
"""
import numpy as np

from config import (MC_BANKROLL, MC_N_BETS, MC_N_BETTORS, MC_RTP, MC_SEED, MC_STAKE)
from util_cache import load_processed, save_processed


def monte_carlo():
    """Apostador típico: banca R$500, apostas de R$20 num jogo com RTP 93%.

    Modelo de payout estilo slot/crash: aposta perde tudo com prob. 1-p ou
    multiplica por m com prob. p, calibrado para E[retorno] = RTP com
    variância realista (m=2.0 => p=RTP/2).
    """
    rng = np.random.default_rng(MC_SEED)
    m = 2.0
    p = MC_RTP / m  # 0.465

    wins = rng.random((MC_N_BETTORS, MC_N_BETS)) < p
    delta = np.where(wins, MC_STAKE * (m - 1), -MC_STAKE)
    bank = MC_BANKROLL + np.cumsum(delta, axis=1)

    # ruína: banca <= 0 (para de apostar; trajetória congela em 0)
    ruined_at = np.argmax(bank <= 0, axis=1)
    ever_ruined = (bank <= 0).any(axis=1)
    ruined_at = np.where(ever_ruined, ruined_at, MC_N_BETS)
    for i in np.where(ever_ruined)[0]:
        bank[i, ruined_at[i]:] = 0.0
    bank = np.maximum(bank, 0.0)

    steps = list(range(0, MC_N_BETS + 1, 5))
    full = np.concatenate([np.full((MC_N_BETTORS, 1), MC_BANKROLL), bank], axis=1)
    pct = {q: [round(float(np.percentile(full[:, s], q)), 1) for s in steps]
           for q in (5, 25, 50, 75, 95)}
    ruin_curve = [round(float((ruined_at < s).mean()) * 100, 2) for s in steps]

    final = full[:, -1]
    out = {
        "params": {"rtp": MC_RTP, "n_bettors": MC_N_BETTORS, "n_bets": MC_N_BETS,
                   "stake": MC_STAKE, "bankroll": MC_BANKROLL, "seed": MC_SEED,
                   "payout_model": "binário: ganha 2x com p=RTP/2, perde a aposta caso contrário"},
        "steps": steps,
        "percentiles": pct,
        "ruin_pct": ruin_curve,
        "share_ahead_end": round(float((final > MC_BANKROLL).mean()) * 100, 2),
        "share_ruined_end": round(float(ever_ruined.mean()) * 100, 2),
        "mean_final": round(float(final.mean()), 1),
        "expected_loss_total": round(MC_N_BETS * MC_STAKE * (1 - MC_RTP), 1),
    }
    save_processed("monte_carlo.json", out)
    print(f"MC: mediana final R${pct[50][-1]} · ruína {out['share_ruined_end']}% · "
          f"no lucro {out['share_ahead_end']}% · perda esperada R${out['expected_loss_total']}")
    return out


def seasonal_decomposition():
    """STL sobre a série mensal 'bet' do Google Trends (se coletada)."""
    trends = load_processed("trends.json")
    if not trends or not trends.get("over_time"):
        print("STL: sem série do Trends, pulando")
        return None
    import pandas as pd
    from statsmodels.tsa.seasonal import STL

    term = "bet" if "bet" in trends["over_time"] else next(iter(trends["over_time"]))
    s = pd.Series(trends["over_time"][term])
    s.index = pd.to_datetime(s.index)
    s = s.asfreq("MS") if len(s) > 30 else s.resample("MS").mean()
    s = s.interpolate()
    stl = STL(s, period=12, robust=True).fit()
    out = {
        "term": term,
        "dates": [d.strftime("%Y-%m") for d in s.index],
        "observed": [round(float(v), 1) for v in s.values],
        "trend": [round(float(v), 1) for v in stl.trend.values],
        "seasonal": [round(float(v), 1) for v in stl.seasonal.values],
        "resid": [round(float(v), 1) for v in stl.resid.values],
        "note": "STL robusto, período 12; índice Google Trends 0-100 (relativo ao pico)",
    }
    save_processed("seasonal_stl.json", out)
    print(f"STL: termo '{term}', {len(s)} meses")
    return out


def _spearman_boot(x, y, rng, n_boot=5000):
    from scipy import stats  # scipy vem com statsmodels? não — fazer manual se faltar
    rho = stats.spearmanr(x, y).statistic
    n = len(x)
    boots = []
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        boots.append(stats.spearmanr(np.array(x)[idx], np.array(y)[idx]).statistic)
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return round(float(rho), 3), round(float(lo), 3), round(float(hi), 3)


def composite_search_index(trends):
    """Índice composto de busca por UF: média das séries por UF (termos on-topic),
    reescalada 0-100. Suaviza o ruído de termos de baixo volume."""
    by_region = trends.get("by_region", {})
    terms = [t for t in ("tigrinho", "bet", "betano", "blaze aposta") if t in by_region]
    ufs = set()
    for t in terms:
        ufs |= set(by_region[t].keys())
    comp = {}
    for u in ufs:
        vals = [by_region[t][u] for t in terms if u in by_region[t]]
        comp[u] = sum(vals) / len(vals) if vals else 0
    mx = max(comp.values()) or 1
    comp = {u: round(v / mx * 100, 1) for u, v in comp.items()}
    return comp, terms


def uf_correlations():
    """Spearman entre busca (Trends), taxa de suicídio (SIM) e renda (PNADC), n=27."""
    trends = load_processed("trends.json")
    sim = load_processed("datasus_sim.json")
    inc = load_processed("ibge_income_uf.json")
    pop = load_processed("ibge_population_uf.json")
    if not all([trends, sim, inc, pop]):
        print("correlações: insumos incompletos, pulando")
        return None

    comp, terms = composite_search_index(trends)
    save_processed("search_index_uf.json", {
        "values": comp, "terms": terms,
        "source": "Google Trends via pytrends, índice composto (média reescalada 0-100) dos termos de aposta por UF"})
    ufs = sorted(inc["values"].keys())
    search = [comp.get(u) for u in ufs]
    last_year = max(sim["by_uf_year"][ufs[0]].keys())
    rate = [sim["by_uf_year"][u][last_year] / pop["values"][u] * 100000 for u in ufs]
    income = [inc["values"][u] for u in ufs]
    if any(v is None for v in search):
        ufs2 = [u for u, s in zip(ufs, search) if s is not None]
        rate = [r for r, s in zip(rate, search) if s is not None]
        income = [i for i, s in zip(income, search) if s is not None]
        search = [s for s in search if s is not None]
        ufs = ufs2

    rng = np.random.default_rng(MC_SEED)
    pairs = {}
    for name, (x, y) in {
        "busca_vs_suicidio": (search, rate),
        "busca_vs_renda": (search, income),
        "renda_vs_suicidio": (income, rate),
    }.items():
        rho, lo, hi = _spearman_boot(x, y, rng)
        pairs[name] = {"rho": rho, "ci95": [lo, hi], "n": len(x)}
    out = {"terms": terms, "year_sim": last_year, "pairs": pairs,
           "note": "Spearman com IC 95% bootstrap (5000 reamostragens); associação ecológica entre UFs, não causal"}
    save_processed("uf_correlations.json", out)
    print("correlações:", {k: v["rho"] for k, v in pairs.items()})
    return out


if __name__ == "__main__":
    monte_carlo()
    seasonal_decomposition()
    uf_correlations()
