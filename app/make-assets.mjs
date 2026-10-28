// Fabrique les images sources (icône, icône adaptative Android, écran de démarrage) à partir de icon.svg.
import sharp from "sharp";
import fs from "fs";
const svg = fs.readFileSync("icon.svg", "utf8");
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
const bg = svg.match(/<g id="BG">[\s\S]*?<\/g>/)[0];
const fg = svg.slice(svg.indexOf('<g id="FG">'), svg.lastIndexOf("</svg>"));
const wrap = (inner, size) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="' + (size || 1024) + '" height="' + (size || 1024) + '">' + defs + inner + "</svg>";
const center = (s) => '<g transform="translate(512 512) scale(' + s + ') translate(-512 -435)">' + fg + "</g>";
fs.mkdirSync("assets", { recursive: true });
const out = (s, f) => sharp(Buffer.from(s)).png().toFile("assets/" + f);
await out(svg, "icon-only.png");
await out(wrap(bg), "icon-background.png");
await out(wrap(center(0.6)), "icon-foreground.png");
await out(wrap(bg + center(0.42), 2732), "splash.png");
await out(wrap(bg + center(0.42), 2732), "splash-dark.png");
console.log("images prêtes");
