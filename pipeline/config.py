"""Configuração central do pipeline A Casa Sempre Ganha."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "cache"
PROCESSED = DATA / "processed"
SOURCES = DATA / "sources"

for d in (CACHE, PROCESSED, SOURCES):
    d.mkdir(parents=True, exist_ok=True)

# 27 UFs: código IBGE -> sigla, nome
UFS = {
    "11": ("RO", "Rondônia"), "12": ("AC", "Acre"), "13": ("AM", "Amazonas"),
    "14": ("RR", "Roraima"), "15": ("PA", "Pará"), "16": ("AP", "Amapá"),
    "17": ("TO", "Tocantins"), "21": ("MA", "Maranhão"), "22": ("PI", "Piauí"),
    "23": ("CE", "Ceará"), "24": ("RN", "Rio Grande do Norte"), "25": ("PB", "Paraíba"),
    "26": ("PE", "Pernambuco"), "27": ("AL", "Alagoas"), "28": ("SE", "Sergipe"),
    "29": ("BA", "Bahia"), "31": ("MG", "Minas Gerais"), "32": ("ES", "Espírito Santo"),
    "33": ("RJ", "Rio de Janeiro"), "35": ("SP", "São Paulo"), "41": ("PR", "Paraná"),
    "42": ("SC", "Santa Catarina"), "43": ("RS", "Rio Grande do Sul"),
    "50": ("MS", "Mato Grosso do Sul"), "51": ("MT", "Mato Grosso"),
    "52": ("GO", "Goiás"), "53": ("DF", "Distrito Federal"),
}
SIGLA_BY_NAME = {name: sigla for _, (sigla, name) in UFS.items()}

# Google Trends
TRENDS_TERMS = ["tigrinho", "bet", "betano", "blaze aposta", "aposta esportiva"]
TRENDS_GEO = "BR"
TRENDS_TIMEFRAME = "2019-01-01 2026-06-30"

# DATASUS SIM: lesões autoprovocadas voluntariamente (X60-X84)
SIM_YEARS = list(range(2015, 2024))  # último ano consolidado do SIM

# Monte Carlo
MC_RTP = 0.93          # retorno ao apostador (RTP) típico de slots/crash games
MC_N_BETTORS = 20000   # trajetórias simuladas
MC_N_BETS = 300        # apostas por trajetória
MC_STAKE = 20.0        # R$ por aposta
MC_BANKROLL = 500.0    # banca inicial R$
MC_SEED = 20260707
