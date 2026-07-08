# A Casa Sempre Ganha · The House Always Wins · La Banca Siempre Gana

Relatório interativo, autocontido e trilíngue (PT/EN/ES) sobre o impacto
socioeconômico das apostas online (bets de quota fixa) no Brasil.

**Relatório publicado:** https://avnergomes.github.io/casa-sempre-ganha/

A tese em uma linha: o setor extrai um volume enorme de dinheiro das famílias,
concentra a extração nas mais pobres, devolve quase nada em emprego e em
arrecadação útil, e gera um custo social e sanitário que supera o que arrecada.
Cada seção é um argumento com fonte e uma saída visual.

## O que é

`index.html` é um único arquivo autocontido: todo o CSS, o JavaScript e os dados
estão embutidos, sem dependências externas em tempo de execução (sem CDN). Pode
ser aberto direto no navegador ou publicado no GitHub Pages. Os gráficos são SVG
desenhados no próprio arquivo; o alternador de idioma no topo troca PT/EN/ES sem
recarregar a página.

## Seções

1. Panorama, o tamanho do mercado (SPA e Banco Central).
2. Trajetória, série do interesse de busca com marcações de eventos.
3. Quem paga a conta, a concentração nas famílias de baixa renda (BC/LENAD).
4. A matemática da perda, simulação de Monte Carlo (RTP 93%).
5. O vazio econômico, o mito do emprego frente ao custo social.
6. O custo humano, o pedágio sanitário (IEPS e DATASUS).
7. Geografia, coroplético por UF com camadas (busca, suicídio, CAPS, renda).
8. Dossiê, a regulação em disputa (CPI, PL 5473/2025, autoexclusão, modelo do Reino Unido).
9. Robustez, a sensibilidade e os limites da estimativa de custo.
10. Apêndice, tabela ordenável por UF.

## Fontes primárias

- **SPA / Ministério da Fazenda** — Panorama do mercado regulado de apostas de quota fixa (GGR, apostadores, arrecadação, autoexclusão).
- **Banco Central do Brasil** — Estudo Especial nº 119 (fluxo mensal via Pix, perfil de vulnerabilidade, Bolsa Família).
- **IEPS** — dossiê "A saúde dos brasileiros em jogo" (custo social e sanitário, metodologia OHID/PPC).
- **LENAD III (Unifesp/INPAD e Ministério da Justiça)** — prevalência de jogo de risco e problemático.
- **DATASUS** — SIM (mortalidade por suicídio, CID-10 X60–X84) e CNES (CAPS), por UF, via TABNET.
- **IBGE** — PNAD Contínua (renda domiciliar per capita) e estimativas de população, via API SIDRA.
- **Google Trends** — interesse de busca por termos de aposta, por UF e no tempo, via pytrends.

Referências acadêmicas localizadas pelo protocolo paper-lookup sobre a base
OpenAlex, com DOI verificado no OpenAlex e conferido no CrossRef.

## Pipeline reprodutível

Coleta ao vivo via API com cache em disco (`data/cache/`). O relatório inteiro é
reconstruído com um único comando.

```bash
python -m venv .venv
# Windows
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python pipeline/run_all.py
# macOS / Linux
.venv/bin/pip install -r requirements.txt
.venv/bin/python pipeline/run_all.py
```

`pipeline/run_all.py` executa, em ordem: coleta do IBGE (população e renda) e da
malha das UFs, coleta do DATASUS (SIM e CNES), coleta do Google Trends, os
modelos (Monte Carlo, decomposição sazonal STL, correlações de Spearman entre
UFs com intervalo por bootstrap), e por fim consolida tudo em
`data/report_data.json` e injeta os dados e o JavaScript no `index.html`.

### Estrutura

```
index.html              relatório final autocontido (entregável)
assets/report.js        fonte do JavaScript (i18n + gráficos SVG), inlinado no build
pipeline/               coleta, modelos e montagem
  config.py             UFs, termos, parâmetros do Monte Carlo
  util_cache.py         cache em disco de GET/POST com retries
  fetch_ibge.py         população e renda por UF (SIDRA)
  fetch_geometry.py     malha das 27 UFs, simplificada e projetada
  tabnet.py             cliente do TABNET/DATASUS (form latin-1, parser HTML)
  fetch_datasus.py      SIM (X60–X84) e CNES (CAPS)
  fetch_trends.py       Google Trends via pytrends
  fetch_openalex.py     referências acadêmicas via OpenAlex
  models.py             Monte Carlo, STL, correlações
  build_data.py         consolida e injeta no HTML
  run_all.py            reconstrói tudo
data/
  cache/                respostas brutas das APIs (rebuild offline)
  processed/            JSON derivados
  sources/              números transcritos das fontes primárias e referências
```

## Modelo estatístico

A peça central é uma simulação de Monte Carlo do saldo de 20.000 apostadores ao
longo de 300 apostas, num jogo com retorno ao apostador (RTP) de 93%. O resultado
mostra a perda estrutural garantida no agregado: a banca mediana chega a zero, a
maioria se arruína e poucos terminam no lucro. Complementam a análise uma
decomposição sazonal (STL) da série de interesse de busca e correlações de
Spearman entre UFs, com intervalos por bootstrap e a ressalva explícita da
falácia ecológica.

## Honestidade metodológica

O relatório sinaliza, em vez de esconder: a quebra metodológica do mercado (só
medido a partir de 2025), o uso de proxy geográfico (o gasto por município é de
uso interno no Banco Central), a natureza não causal das associações espaciais, a
transferência das estimativas de custo do OHID britânico por paridade de poder de
compra, e o que fica de fora da conta (inclusive o próprio dinheiro perdido pelas
famílias). A cifra de custo é tratada como piso, não como teto.

## Aviso

Estudo de portfólio independente, sem vínculo com SPA, Banco Central, IEPS,
Unifesp, DATASUS ou IBGE. As análises são do autor e não representam posição
dessas instituições. Nada aqui é aconselhamento financeiro, jurídico ou de saúde.

Developed by **Avner Paes Gomes**.
