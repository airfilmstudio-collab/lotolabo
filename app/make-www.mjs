// Construit www/ à partir du site (../index.html, tenu à jour par le robot) + couche appli.
import fs from "fs";
const mode = process.argv[2] || "test";
let t = fs.readFileSync("../index.html", "utf8");
const tag = '<meta charset="utf-8">';
if (!t.includes(tag)) throw new Error("balise charset introuvable");
t = t.replace(tag, tag + "\n<script>window.LL_APP_MODE=" + JSON.stringify(mode) + "</script>\n<script src=\"premium.js\"></script>");
t = t.replace(/<meta name="robots"[^>]*>\n?/, "");
fs.mkdirSync("www", { recursive: true });
fs.writeFileSync("www/index.html", t);
fs.copyFileSync("premium.js", "www/premium.js");
console.log("www prêt (mode " + mode + ", " + t.length + " octets)");
