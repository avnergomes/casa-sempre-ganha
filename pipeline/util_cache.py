"""Cache em disco para toda coleta: nunca bater duas vezes na mesma API."""
import hashlib
import json
import time
from pathlib import Path

import requests

from config import CACHE

HEADERS = {"User-Agent": "Mozilla/5.0 (portfolio research pipeline; contact avnerpaesgomes@gmail.com)"}


def _key(url: str, payload=None) -> str:
    h = hashlib.sha256()
    h.update(url.encode())
    if payload:
        h.update(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode())
    return h.hexdigest()[:24]


def cached_get(url: str, *, params=None, encoding=None, max_age_days=None, timeout=120) -> str:
    """GET com cache em disco. max_age_days=None significa cache eterno."""
    key = _key(url, params)
    f = CACHE / f"get_{key}.txt"
    meta = CACHE / f"get_{key}.meta.json"
    if f.exists():
        if max_age_days is None or (time.time() - f.stat().st_mtime) < max_age_days * 86400:
            return f.read_text(encoding="utf-8")
    r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    if encoding:
        r.encoding = encoding
    text = r.text
    f.write_text(text, encoding="utf-8")
    meta.write_text(json.dumps({"url": r.url, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                                "status": r.status_code}, ensure_ascii=False, indent=1), encoding="utf-8")
    return text


def cached_post(url: str, *, data=None, body=None, form_encoding=None, content_type=None,
                encoding=None, max_age_days=None, timeout=180, retries=6, ok=None) -> str:
    """POST com cache e retries com backoff (hosts instáveis como o TABNET).

    body: corpo já pronto (bytes/str). form_encoding: se data é lista/dict, codifica
    o form nesse charset (latin-1 para o TABNET). ok: callable(text)->bool valida a
    resposta; se falhar, tenta de novo (útil quando o host devolve o formulário em vez
    do resultado).
    """
    key = _key(url, body if body is not None else data)
    f = CACHE / f"post_{key}.txt"
    meta = CACHE / f"post_{key}.meta.json"
    if f.exists():
        if max_age_days is None or (time.time() - f.stat().st_mtime) < max_age_days * 86400:
            cached = f.read_text(encoding="utf-8")
            if ok is None or ok(cached):
                return cached

    headers = dict(HEADERS)
    payload = data
    if body is not None:
        from urllib.parse import urlencode
        payload = body if isinstance(body, (bytes, str)) else urlencode(body, encoding=form_encoding or "utf-8")
        if isinstance(payload, str) and form_encoding:
            payload = payload.encode(form_encoding)
        headers["Content-Type"] = content_type or "application/x-www-form-urlencoded"

    last = None
    for attempt in range(retries):
        try:
            r = requests.post(url, data=payload, headers=headers, timeout=timeout)
            r.raise_for_status()
            if encoding:
                r.encoding = encoding
            text = r.text
            if ok is not None and not ok(text):
                last = RuntimeError("resposta não passou na validação ok()")
                time.sleep(4 * (attempt + 1))
                continue
            f.write_text(text, encoding="utf-8")
            meta.write_text(json.dumps({"url": url, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                                        "status": r.status_code, "attempts": attempt + 1},
                                       ensure_ascii=False, indent=1), encoding="utf-8")
            return text
        except Exception as e:
            last = e
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"POST falhou após {retries} tentativas: {last}")


def save_processed(name: str, obj) -> Path:
    from config import PROCESSED
    p = PROCESSED / name
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    return p


def load_processed(name: str):
    from config import PROCESSED
    p = PROCESSED / name
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return None
