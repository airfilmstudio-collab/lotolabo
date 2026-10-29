#!/usr/bin/env python3
"""Petites corrections de textes du site, appliquées par le robot (sans effet si déjà faites)."""
import sys

REMPLACEMENTS = [
    ("Universal DJ Normandie présente", "AirfilmStudio présente"),
]

p = sys.argv[1] if len(sys.argv) > 1 else "index.html"
t = open(p, encoding="utf-8").read()
n = 0
for avant, apres in REMPLACEMENTS:
    if avant in t:
        t = t.replace(avant, apres)
        n += 1
if n:
    open(p, "w", encoding="utf-8").write(t)
print(f"{n} correction(s) appliquée(s)")
