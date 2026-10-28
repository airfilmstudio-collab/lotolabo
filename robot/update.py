#!/usr/bin/env python3
"""Robot LotoLabo : récupère les archives officielles FDJ et ajoute les nouveaux tirages.

- Lit index.html (bloc « const EMB={...};//EMB_END »).
- Télécharge les archives « en cours » de chaque jeu sur le site FDJ.
- Vérifie que les tirages déjà connus sont identiques (sinon le jeu n'est pas modifié).
- Ajoute les nouveaux tirages, réécrit index.html et data.json.
Aucune dépendance externe : Python 3.9+ standard.
"""
import csv, io, json, os, sys, time, zipfile, urllib.request, datetime as dt

BASE = "https://www.sto.api.fdj.fr/anonymous/service-draw-info/v3/documentations/1a2b3c4d-9876-4562-b3fc-2c963f66"
IDS = {"loto": "afp6", "super": "afk6", "grand": "afg6", "em": "afe6", "ed": "afa5",
       "keno": "bft6", "cresc": "afa7", "amigo": "afz6"}
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
           "Accept": "application/zip,application/octet-stream,*/*", "Referer": "https://www.fdj.fr/", "Accept-Language": "fr-FR,fr;q=0.9"}
LETTERS = "SAMEDI"
LOG = []


def log(msg):
    print(msg)
    LOG.append(msg)


# ---------- Téléchargement ----------
def fetch_rows(key):
    url = BASE + IDS[key]
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=90) as r:
                data = r.read()
            break
        except Exception as e:  # réseau, 403, etc.
            last = e
            time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError(f"téléchargement impossible ({last})")
    z = zipfile.ZipFile(io.BytesIO(data))
    name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    raw = z.read(name)
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    rd = csv.reader(io.StringIO(text), delimiter=";")
    head = [h.strip().lower() for h in next(rd)]
    rows = []
    for r in rd:
        if not any(c.strip() for c in r):
            continue
        rows.append({h: (r[i].strip() if i < len(r) else "") for i, h in enumerate(head)})
    return rows


def col(row, *names):
    for n in names:
        if n in row and row[n] != "":
            return row[n]
    for k, v in row.items():  # colonnes avec accents mal encodés
        for n in names:
            if k.replace(" ", "_") == n:
                return v
    raise KeyError(names[0])


def pdate(s):
    s = s.strip()
    if "/" in s:
        d, m, y = s.split("/")
        y = int(y)
        if y < 100:
            y += 2000 if y < 70 else 1900
        return dt.date(y, int(m), int(d))
    if "-" in s:
        return dt.date.fromisoformat(s[:10])
    if len(s) == 8:
        y = int(s[:4])
        if 1970 <= y <= 2100 and 1 <= int(s[4:6]) <= 12:
            return dt.date(y, int(s[4:6]), int(s[6:8]))
        return dt.date(int(s[4:]), int(s[2:4]), int(s[:2]))
    raise ValueError(s)


def money(s):
    s = (s or "").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def num(s):
    return int(float(s.replace(",", ".")))


# ---------- Flux compacts (delta de jours + charge utile fixe) ----------
def d8(s):
    return dt.date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def decode(stream, plen, esc):
    st, b = stream.split("|")
    d = d8(st)
    i, out = 0, []
    while i < len(b):
        if b[i] == esc:
            dd = int(b[i + 1:i + 4]); i += 4
        else:
            dd = int(b[i]); i += 1
        d = d + dt.timedelta(dd)
        out.append((d, b[i:i + plen]))
        i += plen
    return out


def delta(dd, esc):
    if esc == "0":
        return str(dd) if 1 <= dd <= 9 else "0%03d" % dd
    return str(dd) if 0 <= dd <= 8 else "9%03d" % dd


def update_stream(emb, field, game, plen, esc, recs, key_of):
    """recs : liste triée de (date, payload). key_of(date, payload) -> clé unique (pour comparer)."""
    old = decode(emb[field], plen, esc)
    known = {key_of(d, p): p for d, p in old}
    last_d, last_p = old[-1]
    last_k = key_of(last_d, last_p)
    bad = [(k, p, known[k]) for d, p in recs for k in [key_of(d, p)] if k in known and known[k] != p]
    if bad:
        log(f"⚠️ {game} : {len(bad)} tirage(s) déjà connus ne correspondent pas (ex. {bad[0][0]}). Jeu laissé tel quel.")
        return 0
    new = [(d, p) for d, p in recs if key_of(d, p) > last_k and key_of(d, p) not in known]
    s = emb[field]
    for d, p in new:
        assert len(p) == plen, (game, p)
        s += delta((d - last_d).days, esc) + p
        last_d = d
    emb[field] = s
    log(f"{game} : {len(new)} nouveau(x) tirage(s), dernier {last_d.isoformat()}")
    return len(new)


b2 = lambda xs: "".join("%02d" % x for x in xs)


def do_loto(emb):
    rows = fetch_rows("loto")
    recs, sec, jack = [], [], []
    for r in rows:
        d = pdate(col(r, "date_de_tirage"))
        balls = [num(col(r, f"boule_{k}")) for k in range(1, 6)]
        ch = num(col(r, "numero_chance"))
        recs.append((d, b2(balls) + str(ch % 10)))
        try:
            sb = [num(col(r, f"boule_{k}_second_tirage")) for k in range(1, 6)]
            sec.append([d.isoformat(), sb])
        except (KeyError, ValueError):
            pass
        w = num(col(r, "nombre_de_gagnant_au_rang1") or "0")
        if w >= 1:
            jack.append([d.strftime("%Y%m%d"), round(money(col(r, "rapport_du_rang1")) * w)])
    recs.sort()
    n = update_stream(emb, "NS", "Loto", 11, "0", recs, lambda d, p: d.isoformat())
    if n >= 0:
        fam = emb["FAM"]
        have = {s[0] for s in fam["sec"]}
        add = sorted([s for s in sec if s[0] not in have and s[0] > fam["sec"][-1][0]])
        fam["sec"].extend(add)
        if add:
            log(f"Loto second tirage : {len(add)} ajouté(s)")
        J = emb["JACK"]
        have = {j[0] for j in J}
        size = len(J)
        J.extend(j for j in jack if j[0] not in have)
        J.sort(key=lambda j: (-j[1], j[0]))
        del J[size:]
    return n


def do_family(emb, key, label):
    rows = fetch_rows(key)
    spec = emb["FAM"]["spec"]
    have = {(s[0], s[3]) for s in spec}
    fl = next((s[4] for s in reversed(spec) if s[3] == label), "N")
    add = []
    for r in rows:
        d = pdate(col(r, "date_de_tirage")).isoformat()
        if (d, label) in have:
            continue
        balls = [num(col(r, f"boule_{k}")) for k in range(1, 6)]
        add.append([d, balls, num(col(r, "numero_chance")), label, fl,
                    num(col(r, "nombre_de_gagnant_au_rang1") or "0"), round(money(col(r, "rapport_du_rang1")))])
    if add:
        spec.extend(add)
        spec.sort(key=lambda s: s[0])
    log(f"{label} loto : {len(add)} ajouté(s)")
    return len(add)


def do_em(emb):
    recs = []
    for r in fetch_rows("em"):
        d = pdate(col(r, "date_de_tirage"))
        recs.append((d, b2([num(col(r, f"boule_{k}")) for k in range(1, 6)]) + b2([num(col(r, "etoile_1")), num(col(r, "etoile_2"))])))
    recs.sort()
    return update_stream(emb, "EM", "EuroMillions", 14, "0", recs, lambda d, p: d.isoformat())


def do_ed(emb):
    recs = []
    for r in fetch_rows("ed"):
        d = pdate(col(r, "date_de_tirage"))
        recs.append((d, b2([num(col(r, f"boule_{k}")) for k in range(1, 7)]) + str(num(col(r, "numero_dream")))))
    recs.sort()
    return update_stream(emb, "ED", "EuroDreams", 13, "0", recs, lambda d, p: d.isoformat())


def do_keno(emb):
    recs = []
    for r in fetch_rows("keno"):
        d = pdate(col(r, "date_de_tirage"))
        m = 0
        for k in range(1, 17):
            m |= 1 << (num(col(r, f"boule{k}", f"boule_{k}")) - 1)
        recs.append((d, "%017d" % m))
    recs.sort()
    return update_stream(emb, "K2", "Keno", 17, "9", recs, lambda d, p: d.isoformat())


def do_cresc(emb):
    recs = []
    for r in fetch_rows("cresc"):
        d = pdate(col(r, "date_de_tirage"))
        h = int(col(r, "heure_de_tirage")[:2])
        balls = [num(col(r, f"boule{k}", f"boule_{k}")) for k in range(1, 11)]
        letter = LETTERS.index(col(r, "lettre").upper()[0])
        w = min(9, num(col(r, "nombre_de_gagnant_au_rang1") or "0"))
        recs.append((d, str(h - 13) + b2(balls) + str(letter) + str(w)))
    recs.sort(key=lambda x: (x[0], x[1][0]))
    # clé = date + heure ; le nombre de gagnants peut être corrigé par la FDJ, on ne compare que les boules
    return update_stream(emb, "CR", "Crescendo", 23, "9", recs, lambda d, p: d.isoformat() + p[0])


def do_amigo(emb):
    A = emb["AMIGO"]
    hdr = dict(kv.split("=") for kv in A["HDR"].split())
    last = hdr["LAST"]
    draws = []
    for r in fetch_rows("amigo"):
        d = pdate(col(r, "date"))
        hm = col(r, "heure").replace(":", "")[:4].zfill(4)
        blue = [num(col(r, f"n{k}")) for k in range(1, 8)]
        yel = []
        for k in range(1, 7):
            try:
                yel.append(num(col(r, f"njaunes {k}", f"njaunes_{k}")))
            except (KeyError, ValueError):
                pass
        if len(yel) < 5:
            continue
        draws.append((d.strftime("%Y%m%d") + hm, blue + yel[:5]))
    draws.sort()
    # vérification sur les 400 derniers connus
    rec = []
    for seg in A["REC"].split("D"):
        if not seg:
            continue
        day = seg[:8]
        for t in seg[8:].split("T"):
            if t:
                rec.append((day + t[:4], t[4:]))
    known = dict(rec)
    bad = [k for k, ns in draws if k in known and known[k] != b2(ns)]
    if bad:
        log(f"⚠️ Amigo : {len(bad)} tirage(s) connus différents (ex. {bad[0]}). Jeu laissé tel quel.")
        return 0
    new = [(k, ns) for k, ns in draws if k > last]
    if not new:
        log("Amigo : 0 nouveau tirage")
        return 0
    fb = [0] + [int(x) for x in A["FB"].split()]
    fy = [0] + [int(x) for x in A["FY"].split()]
    gap = [0] + [int(x) for x in A["GAP"].split()]
    mxg = [0] + [int(x) for x in A["MAXG"].split()]
    years = dict(kv.split(":") for kv in A["YEARS"].split())
    days = int(hdr["DAYS"])
    cur_day = last[:8]
    for k, ns in new:
        for n in range(1, 29):
            gap[n] += 1
        for i, n in enumerate(ns):
            (fb if i < 7 else fy)[n] += 1
            gap[n] = 0
        for n in range(1, 29):
            mxg[n] = max(mxg[n], gap[n])
        if k[:8] != cur_day:
            days += 1
            cur_day = k[:8]
        years[k[:4]] = str(int(years.get(k[:4], "0")) + 1)
    hdr["N"] = str(int(hdr["N"]) + len(new))
    hdr["LAST"] = new[-1][0]
    hdr["DAYS"] = str(days)
    A["HDR"] = f"N={hdr['N']} FIRST={hdr['FIRST']} LAST={hdr['LAST']} DAYS={hdr['DAYS']}"
    A["FB"] = " ".join(map(str, fb[1:]))
    A["FY"] = " ".join(map(str, fy[1:]))
    A["GAP"] = " ".join(map(str, gap[1:]))
    A["MAXG"] = " ".join(map(str, mxg[1:]))
    A["YEARS"] = " ".join(f"{y}:{years[y]}" for y in sorted(years))
    rec = (rec + [(k, b2(ns)) for k, ns in new])[-400:]
    out, day = [], None
    for k, p in rec:
        if k[:8] != day:
            day = k[:8]
            out.append("D" + day)
        out.append("T" + k[8:] + p)
    A["REC"] = "".join(out)
    log(f"Amigo : {len(new)} nouveau(x) tirage(s), dernier {new[-1][0]}")
    return len(new)


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    idx = os.path.join(root, "index.html")
    t = open(idx, encoding="utf-8").read()
    a = t.index("const EMB=") + len("const EMB=")
    b = t.index(";//EMB_END")
    emb = json.loads(t[a:b])
    total = 0
    for name, fn in [("Loto", do_loto), ("Super", lambda e: do_family(e, "super", "super")),
                     ("Grand", lambda e: do_family(e, "grand", "grand")), ("EuroMillions", do_em),
                     ("EuroDreams", do_ed), ("Keno", do_keno), ("Crescendo", do_cresc), ("Amigo", do_amigo)]:
        try:
            total += fn(emb)
        except Exception as e:
            log(f"⚠️ {name} : {e}")
    if total:
        emb["V"] = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M")
        js = json.dumps(emb, ensure_ascii=False, separators=(",", ":"))
        open(idx, "w", encoding="utf-8").write(t[:a] + js + t[b:])
        open(os.path.join(root, "data.json"), "w", encoding="utf-8").write(js)
    log(f"Total : {total} nouveau(x) tirage(s).")
    summ = os.environ.get("GITHUB_STEP_SUMMARY")
    if summ:
        with open(summ, "a", encoding="utf-8") as f:
            f.write("## Mise à jour LotoLabo\n\n" + "\n".join("- " + l for l in LOG) + "\n")
    if all(l.startswith("⚠️") for l in LOG[:-1]) and not total:
        sys.exit("Aucune archive FDJ n'a pu être lue.")


if __name__ == "__main__":
    main()
