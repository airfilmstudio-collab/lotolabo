// Construit www/ à partir du site (../index.html, tenu à jour par le robot) + couche appli.
import fs from "fs";
import path from "path";
const mode = process.argv[2] || "test";
let t = fs.readFileSync("../index.html", "utf8");
const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
const pub = { brand: cfg.brand, revenuecat: cfg.revenuecat, admob: { testing: cfg.admob.testing, bannerAndroid: cfg.admob.bannerAndroid, bannerIos: cfg.admob.bannerIos } };
const tag = '<meta charset="utf-8">';
if (!t.includes(tag)) throw new Error("balise charset introuvable");
t = t.replace(tag, tag + "\n<script>window.LL_APP_MODE=" + JSON.stringify(mode) + ";window.LL_CONFIG=" + JSON.stringify(pub) + "</script>\n<script src=\"premium.js\"></script>");
t = t.replace(/<meta name="robots"[^>]*>\n?/, "");
// Textes propres au site web
t = t.split(" <b>Aperçu LotoLabo+</b> : dans l'appli, ce jeu fera partie de l'abonnement. Ici tout est ouvert pour tester.").join("");
t = t.split("Dans ce navigateur").join("Sur cet appareil");
t = t.split("Universal DJ Normandie présente").join(cfg.brand + " présente");
// Polices intégrées à l'appli (hors connexion, aucun appel à Google Fonts)
fs.mkdirSync("www/fonts", { recursive: true });
let css = "";
const root = "node_modules";
const WEIGHTS = { figtree: [400, 600, 700], "jetbrains-mono": [500, 700], fraunces: [400, 500], "dm-sans": [400, 500, 700], "archivo-black": [400],
  "ibm-plex-sans": [400, 600], "ibm-plex-mono": [500, 700], unbounded: [500, 800], outfit: [400, 600, 700] };
for (const scope of ["@fontsource", "@fontsource-variable"]) {
  const dir = path.join(root, scope);
  if (!fs.existsSync(dir)) continue;
  for (const pkg of fs.readdirSync(dir)) {
    const pdir = path.join(dir, pkg);
    const variable = scope === "@fontsource-variable";
    for (const f of fs.readdirSync(pdir)) {
      if (variable ? f !== "opsz.css" : !/^\d{3}(-italic)?\.css$/.test(f)) continue;
      if (!variable && !(WEIGHTS[pkg] || []).includes(parseInt(f, 10))) continue;
      if (f.includes("italic") && pkg !== "fraunces") continue;
      const blocks = fs.readFileSync(path.join(pdir, f), "utf8").split("@font-face").slice(1);
      for (const b of blocks) {
        const m = b.match(/url\(\.\/files\/([^)]+\.woff2)\)/);
        if (!m || !/-latin(-ext)?-/.test(m[1])) continue;
        fs.copyFileSync(path.join(pdir, "files", m[1]), path.join("www/fonts", m[1]));
        css += "@font-face" + b.replace(/url\(\.\/files\//g, "url(./").replace(/,\s*url\([^)]+\.woff\)\s*format\('woff'\)/g, "").replace(" Variable'", "'");
      }
    }
  }
}
fs.writeFileSync("www/fonts/fonts.css", css);
t = t.replace(/<link rel="preconnect"[^>]*>\n?/g, "").replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
fs.mkdirSync("www", { recursive: true });
fs.writeFileSync("www/index.html", t);
fs.copyFileSync("premium.js", "www/premium.js");
console.log("www prêt (mode " + mode + ", " + t.length + " octets, " + fs.readdirSync("www/fonts").length + " fichiers de polices)");
