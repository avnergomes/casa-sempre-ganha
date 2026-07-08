"""Reconstrói o relatório inteiro com um único comando:

    .venv/Scripts/python.exe pipeline/run_all.py

Toda coleta é cacheada em data/cache/ — a segunda execução é offline.
Etapas que dependem de rede externa instável (Google Trends) degradam com
aviso, nunca quebram o build.
"""
import sys
import traceback

STEPS = []


def step(name):
    def deco(fn):
        STEPS.append((name, fn))
        return fn
    return deco


@step("IBGE: população e renda por UF")
def _ibge():
    import fetch_ibge
    fetch_ibge.main()


@step("Geometria: malha das 27 UFs (IBGE)")
def _geo():
    import fetch_geometry
    fetch_geometry.main()


@step("DATASUS: SIM (X60-X84) e CNES/CAPS")
def _datasus():
    import fetch_datasus
    fetch_datasus.sim_suicide()
    try:
        fetch_datasus.cnes_caps()
    except Exception as e:
        print("  CAPS falhou (segue sem):", e)


@step("Google Trends via pytrends")
def _trends():
    import fetch_trends
    fetch_trends.main()


@step("Modelos: Monte Carlo, STL, correlações")
def _models():
    import models
    models.monte_carlo()
    models.seasonal_decomposition()
    models.uf_correlations()


@step("Consolidação e injeção no index.html")
def _build():
    import build_data
    build_data.inject(build_data.build())


def main():
    failed = []
    for name, fn in STEPS:
        print(f"\n=== {name} ===")
        try:
            fn()
        except Exception as e:
            failed.append(name)
            print(f"FALHOU: {e}")
            traceback.print_exc()
    print("\n" + "=" * 50)
    if failed:
        print("Etapas com falha:", failed)
        sys.exit(1)
    print("Pipeline completo.")


if __name__ == "__main__":
    main()
