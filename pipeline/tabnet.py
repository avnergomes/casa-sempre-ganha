"""Cliente genérico do TABNET/DATASUS.

O TABNET é a interface oficial de tabulação agregada do DATASUS. O cliente lê o
formulário .def, monta o POST com Linha/Coluna/Incremento e seleções, e extrai
o CSV do resultado. Encoding ISO-8859-1 em tudo.
"""
import re
from html.parser import HTMLParser

from util_cache import cached_get, cached_post

BASE = "http://tabnet.datasus.gov.br"


class _FormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.selects = {}       # name -> [(value, label)]
        self._cur = None
        self._opt_val = None
        self._buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "select":
            self._cur = a.get("name")
            self.selects[self._cur] = []
        elif tag == "option" and self._cur is not None:
            self._flush()
            self._opt_val = a.get("value", "")

    def handle_endtag(self, tag):
        if tag == "option":
            self._flush()
        elif tag == "select":
            self._flush()
            self._cur = None

    def handle_data(self, data):
        if self._opt_val is not None:
            self._buf.append(data)

    def _flush(self):
        if self._opt_val is not None and self._cur is not None:
            label = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self.selects[self._cur].append((self._opt_val, label))
        self._opt_val = None
        self._buf = []


def read_form(def_path: str):
    """def_path ex.: 'sim/cnv/ext10uf.def'"""
    html = cached_get(f"{BASE}/cgi/deftohtm.exe?{def_path}", encoding="ISO-8859-1")
    p = _FormParser()
    p.feed(html)
    return p.selects


def find_option(options, *terms):
    """Primeira opção cujo rótulo contém todos os termos (case/acento-insensível)."""
    import unicodedata

    def norm(s):
        return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()

    for value, label in options:
        nl = norm(label)
        if all(norm(t) in nl for t in terms):
            return value, label
    return None, None


def _resolve(options, wanted):
    """Casa 'wanted' (label humano) com o VALUE exato da opção (que usa underscores)."""
    import unicodedata

    def norm(s):
        return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode().replace("_", " ").strip()

    w = norm(wanted)
    for value, label in options:
        if norm(label) == w or norm(value) == w:
            return value
    # match por tokens (todos presentes)
    toks = w.split()
    for value, label in options:
        nl = norm(label)
        if all(t in nl for t in toks):
            return value
    return wanted  # devolve como veio (single-option, ex.: Incremento)


def query(def_path: str, linha: str, coluna: str, incremento: str,
          arquivos: list, selections: dict) -> str:
    """POST no tabcgi.exe (form latin-1, com retries) e retorno do HTML de resultado.

    linha/coluna/incremento são passados como rótulos humanos e resolvidos para os
    VALUES exatos das opções (que usam underscore, ex.: 'Unidade_da_Federação').
    """
    form = read_form(def_path)
    linha = _resolve(form.get("Linha", []), linha)
    coluna = _resolve(form.get("Coluna", []), coluna)
    incremento = _resolve(form.get("Incremento", []), incremento)
    data = [("Linha", linha), ("Coluna", coluna), ("Incremento", incremento)]
    for a in arquivos:
        data.append(("Arquivos", a))
    for name, opts in form.items():
        if name in ("Linha", "Coluna", "Incremento", "Arquivos") or name is None:
            continue
        if name in selections:
            for v in selections[name]:
                data.append((name, v))
        else:
            default = next((v for v, lbl in opts if v.startswith("TODAS") or v.startswith("TODOS")), None)
            if default is not None:
                data.append((name, default))
    data += [("formato", "table"), ("mostre", "Mostra")]

    def valid(text):
        low = text.lower()
        return "<table" in low and low.count("<tr") >= 10 and "erro" not in low[:200]

    return cached_post(f"{BASE}/cgi/tabcgi.exe?{def_path}", body=data,
                       form_encoding="latin-1", encoding="ISO-8859-1", ok=valid)


class _TableParser(HTMLParser):
    """Extrai todas as tabelas como listas de linhas de células, tolerante a
    </tr>/</td> ausentes (HTML 4.01 do TABNET)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self._depth = 0
        self._rows = None
        self._row = None
        self._cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            if self._depth == 0:
                self._rows = []
            self._depth += 1
        elif tag == "tr" and self._rows is not None:
            self._commit_row()
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._commit_cell()
            self._cell = []

    def handle_endtag(self, tag):
        if tag == "table" and self._depth > 0:
            self._commit_row()
            self._depth -= 1
            if self._depth == 0 and self._rows is not None:
                self.tables.append(self._rows)
                self._rows = None
        elif tag == "tr":
            self._commit_row()
        elif tag in ("td", "th"):
            self._commit_cell()

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)

    def _commit_cell(self):
        if self._cell is not None and self._row is not None:
            self._row.append(re.sub(r"\s+", " ", "".join(self._cell)).strip())
        self._cell = None

    def _commit_row(self):
        self._commit_cell()
        if self._row is not None and self._rows is not None and self._row:
            self._rows.append(self._row)
        self._row = None


def parse_result_table(html: str):
    """Extrai a maior tabela de dados do resultado do TABNET como (header, rows)."""
    p = _TableParser()
    p.feed(html)
    best = None
    for rows in p.tables:
        data_rows = [r for r in rows if len(r) > 1]
        if len(data_rows) >= 10 and (best is None or len(data_rows) > len(best[1])):
            header = data_rows[0]
            body = [r for r in data_rows[1:] if r and r[0] not in ("Total", "")]
            best = (header, body)
    if best is None:
        raise RuntimeError("nenhuma tabela de dados encontrada no resultado do TABNET")
    return best


# compat: nome antigo
def parse_csv(raw: str):
    return parse_result_table(raw)
