#!/usr/bin/env python3
"""Migration unique : passe index.html au format « données mises à jour par le robot ».
Remplace les constantes NS/OS/... par un bloc EMB, ajoute le chargement de data.json.
Sans effet si index.html est déjà migré."""
import json, re, sys

p = sys.argv[1] if len(sys.argv) > 1 else "index.html"
t = open(p, encoding="utf-8").read()
if "const EMB=" in t:
    print("déjà migré")
    sys.exit(0)

m1 = re.search(r'const NS="([^"]*)",OS="([^"]*)",EMS="([^"]*)",EDS="([^"]*)",K1S="([^"]*)",K2S="([^"]*)",KOLD="([^"]*)",CRS="([^"]*)";\n', t)
i2 = t.index("const AMI=", m1.end())
dec = json.JSONDecoder()
pos = i2 + len("const AMI=")
ami, pos = dec.raw_decode(t, pos)
assert t.startswith(",FAM=", pos); pos += len(",FAM=")
fam, pos = dec.raw_decode(t, pos)
assert t.startswith(",JACK=", pos); pos += len(",JACK=")
jack, pos = dec.raw_decode(t, pos)
assert t.startswith(";", pos); pos += 1
NS, OS, EM, ED, K1, K2, KOLD, CR = m1.groups()
last = ami["HDR"].split("LAST=")[1][:12]
emb = {"NS": NS, "OS": OS, "EM": EM, "ED": ED, "K1": K1, "K2": K2, "KOLD": KOLD, "CR": CR,
       "AMIGO": ami, "FAM": fam, "JACK": jack, "V": f"{last[:4]}-{last[4:6]}-{last[6:8]}T{last[8:10]}:{last[10:12]}"}
block = ("const EMB=" + json.dumps(emb, ensure_ascii=False, separators=(",", ":")) + ";//EMB_END\n"
         'const DATA_URL="https://airfilmstudio-collab.github.io/lotolabo/data.json";\n'
         'let DATA=EMB;try{const c=JSON.parse(localStorage.getItem("ll_data")||"null");if(c&&c.NS&&c.V>EMB.V)DATA=c}catch(e){}\n'
         "const NS=DATA.NS,OS=DATA.OS,EMS=DATA.EM,EDS=DATA.ED,K1S=DATA.K1,K2S=DATA.K2,KOLD=DATA.KOLD,CRS=DATA.CR,AMI=DATA.AMIGO,FAM=DATA.FAM,JACK=DATA.JACK;")
t = t[:m1.start()] + block + t[pos:]
old2 = "renderAll();show(startView);\n</script>"
assert old2 in t
t = t.replace(old2, """renderAll();show(startView);
// Mise à jour des tirages : le robot GitHub publie data.json chaque jour
(async()=>{try{const r=await fetch(DATA_URL+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;const d=await r.json();if(!d||!d.NS||!(d.V>DATA.V))return;
  try{localStorage.setItem("ll_data",JSON.stringify(d))}catch(e){}
  const b=document.createElement("button");b.className="upd-btn";b.type="button";b.textContent="Nouveaux tirages disponibles · Actualiser";b.onclick=()=>location.reload();document.body.appendChild(b)}catch(e){}})();
</script>""")
css = (".upd-btn{position:fixed;left:50%;transform:translateX(-50%);top:calc(12px + env(safe-area-inset-top,0px));z-index:40;border:0;"
       "border-radius:999px;padding:11px 18px;font-weight:700;background:var(--accent);color:var(--accent-ink);"
       "box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer;max-width:calc(100% - 32px)}\n")
t = t.replace(".fb-btn{", css + ".fb-btn{", 1)
open(p, "w", encoding="utf-8").write(t)
open(p.rsplit("/", 1)[0] + "/data.json" if "/" in p else "data.json", "w", encoding="utf-8").write(json.dumps(emb, ensure_ascii=False, separators=(",", ":")))
print("migré", len(t))
