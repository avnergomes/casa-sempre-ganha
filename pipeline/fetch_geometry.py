"""Malha das 27 UFs via API oficial de malhas do IBGE, simplificada e projetada
para paths SVG compactos embutidos no relatório."""
import json
import math

from config import UFS
from util_cache import cached_get, save_processed

MALHAS = ("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR"
          "?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json")

W, H = 640.0, 640.0  # viewBox alvo


def _project(lon, lat, bbox):
    """Projeção equiretangular com correção de latitude média (Brasil ~ -15°)."""
    lon0, lat0, lon1, lat1 = bbox
    k = math.cos(math.radians((lat0 + lat1) / 2))
    sx = W / ((lon1 - lon0) * k)
    sy = H / (lat1 - lat0)
    s = min(sx, sy)
    x = (lon - lon0) * k * s
    y = (lat1 - lat) * s
    return x, y


def _rings(geom):
    if geom["type"] == "Polygon":
        yield from geom["coordinates"]
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            yield from poly


def _dp(pts, lo, hi, tol, keep):
    """Douglas-Peucker recursivo entre os índices lo e hi (cadeia aberta)."""
    if hi <= lo + 1:
        return
    ax, ay = pts[lo]
    bx, by = pts[hi]
    dx, dy = bx - ax, by - ay
    nrm = math.hypot(dx, dy)
    dmax, imax = -1.0, lo
    for i in range(lo + 1, hi):
        px, py = pts[i]
        if nrm < 1e-12:
            d = math.hypot(px - ax, py - ay)  # base degenerada: distância ao ponto
        else:
            d = abs(dx * (ay - py) - dy * (ax - px)) / nrm
        if d > dmax:
            dmax, imax = d, i
    if dmax > tol:
        keep.add(imax)
        _dp(pts, lo, imax, tol, keep)
        _dp(pts, imax, hi, tol, keep)


def _simplify(ring, tol):
    """Douglas-Peucker para anel (aberto ou fechado) em coordenadas projetadas.

    Em anéis fechados (primeiro == último) a linha-base do DP é degenerada, então
    quebramos o anel no vértice mais distante do ponto inicial e simplificamos as
    duas cadeias abertas resultantes.
    """
    if len(ring) < 5:
        return ring
    closed = math.hypot(ring[0][0] - ring[-1][0], ring[0][1] - ring[-1][1]) < 1e-9
    n = len(ring)
    if closed:
        ax, ay = ring[0]
        far = max(range(1, n - 1), key=lambda i: math.hypot(ring[i][0] - ax, ring[i][1] - ay))
        keep = {0, far, n - 1}
        _dp(ring, 0, far, tol, keep)
        _dp(ring, far, n - 1, tol, keep)
    else:
        keep = {0, n - 1}
        _dp(ring, 0, n - 1, tol, keep)
    return [ring[i] for i in sorted(keep)]


def main():
    raw = cached_get(MALHAS)
    gj = json.loads(raw)

    # bbox global
    lons, lats = [], []
    for feat in gj["features"]:
        for ring in _rings(feat["geometry"]):
            for lon, lat in ring:
                lons.append(lon)
                lats.append(lat)
    bbox = (min(lons), min(lats), max(lons), max(lats))

    paths = {}
    for feat in gj["features"]:
        code = str(feat["properties"].get("codarea", feat.get("id", "")))[:2]
        if code not in UFS:
            continue
        sigla = UFS[code][0]
        d = []
        for ring in _rings(feat["geometry"]):
            proj = [_project(lon, lat, bbox) for lon, lat in ring]
            proj = _simplify(proj, tol=0.7)
            if len(proj) < 4:
                continue
            d.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in proj) + "Z")
        paths[sigla] = "".join(d)

    assert len(paths) == 27, f"esperava 27 UFs, veio {len(paths)}"
    total = sum(len(p) for p in paths.values())
    out = {"viewBox": f"0 0 {int(W)} {int(H)}", "paths": paths,
           "source": "IBGE, API de malhas territoriais v3, qualidade mínima, projeção equiretangular"}
    save_processed("uf_geometry.json", out)
    print(f"27 UFs · {total/1024:.0f} KB de paths SVG")


if __name__ == "__main__":
    main()
