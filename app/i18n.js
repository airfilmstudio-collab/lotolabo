/* LotoLabo — traduction de l'appli (FR, EN, ES, PT, DE, NL) et version européenne.
   Chargé dans le <head>, avant premium.js et avant le script principal.
   - Zone « fr » : tous les jeux FDJ. Zone « eu » : EuroMillions et EuroDreams seulement.
   - Les phrases affichées sont traduites à la volée (dates et nombres au format du pays). */
(function () {
  "use strict";
  var LOCS = { fr: "fr-FR", en: "en-GB", es: "es-ES", pt: "pt-PT", de: "de-DE", nl: "nl-NL" };
  var ORDER = ["fr", "en", "es", "pt", "de", "nl"];
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var nav = (navigator.language || "fr-FR");
  var l0 = nav.slice(0, 2).toLowerCase();
  var reg = (nav.split("-")[1] || "").toUpperCase();
  var lang = get("ll_lang") || (LOCS[l0] ? l0 : "en");
  if (!LOCS[lang]) lang = "en";
  var zone = get("ll_zone") || (lang === "fr" && (!reg || reg === "FR") ? "fr" : "eu");
  if (lang !== "fr" && !get("ll_zone")) zone = "eu";
  var LOC = LOCS[lang];
  window.LL_LANG = lang;
  window.LL_ZONE = zone;
  document.documentElement.lang = lang;

  // Version européenne : seulement les jeux européens
  if (zone === "eu") {
    var g = get("ll_game");
    if (g !== "em" && g !== "ed") set("ll_game", "em");
    if (get("ll_tab") === "records") set("ll_tab", "atelier");
    if (/^#records/.test(location.hash)) history.replaceState(null, "", "#atelier");
    var st = document.createElement("style");
    st.textContent = '#games button[data-g="loto"],#games button[data-g="keno"],#games button[data-g="cresc"],#games button[data-g="amigo"],nav.tabs a[data-v="records"],#v-records,#tpresets button:not([data-eu]){display:none!important}';
    document.head.appendChild(st);
  }

  // ---------- Normalisation : texte français -> clé + jetons ----------
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var reLong = new RegExp("(?:(" + JOURS.join("|") + ")\\s+)?(\\d{1,2})(?:er)?\\s+(" + MOIS.join("|") + ")(?:\\s+(\\d{4}))?", "gi");
  var reShort = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
  var reNum = /\d(?:[\d\u202f\u00a0 ]*\d)?(?:,\d+)?(?:\s?%)?/g;
  var INL = /^(B|STRONG|EM|I|SMALL|SUP|SUB|CODE)$/;

  function normText(s, tok) {
    s = s.replace(reLong, function (m, j, d, mo, y) {
      tok.push({ t: "L", j: !!j, y: y ? +y : null, m: MOIS.indexOf(mo.toLowerCase()), d: +d, cap: j ? j[0] !== j[0].toLowerCase() : mo[0] !== mo[0].toLowerCase() });
      return "\u0001";
    });
    s = s.replace(reShort, function (m, d, mo, y) { tok.push({ t: "S", d: +d, m: +mo - 1, y: +y }); return "\u0001"; });
    s = s.replace(reNum, function (m) { tok.push({ t: "N", raw: m }); return "\u0001"; });
    return s;
  }
  function fmtTok(tk) {
    if (tk.t === "E") return tk.html;
    if (tk.t === "N") {
      var r = tk.raw, pct = /%$/.test(r);
      var v = parseFloat(r.replace(/%/, "").replace(/[\s\u202f\u00a0]/g, "").replace(",", "."));
      if (isNaN(v)) return r;
      if (!pct && /^\d{4}$/.test(r.trim()) && v >= 1900 && v <= 2100) return String(v);
      var dec = (r.split(",")[1] || "").replace(/\D/g, "").length;
      var out = v.toLocaleString(LOC, { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return pct ? out + (lang === "en" ? "%" : "\u00a0%") : out;
    }
    if (tk.t === "S") return new Date(Date.UTC(tk.y, tk.m, tk.d, 12)).toLocaleDateString(LOC, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
    var o = { day: "numeric", month: "long", timeZone: "UTC" };
    if (tk.j) o.weekday = "long";
    if (tk.y) o.year = "numeric";
    var s = new Date(Date.UTC(tk.y || 2001, tk.m, tk.d, 12)).toLocaleDateString(LOC, o);
    if (tk.cap) s = s.charAt(0).toUpperCase() + s.slice(1);
    return s;
  }

  // ---------- Dictionnaire ----------
  var IDX = ORDER.indexOf(lang);
  var D = {}, DEU = {};
  (window.LL_DICT || []).forEach(function (r) { if (r[IDX]) D[r[0]] = r[IDX]; });
  (window.LL_DICT_EU || []).forEach(function (r) { if (r[IDX + 1]) DEU[r[0]] = r[IDX + 1]; });
  var MISS = window.LL_MISSING = {};
  var active = !(lang === "fr" && zone === "fr");

  var NAMES = /^(EuroMillions|EuroDreams|LotoLabo\+?|Loto|Keno|Crescendo|Amigo|FDJ ↗|×|[A-Z]|Studio TV|Design|AirfilmStudio)$/;
  function look(key) {
    var bare = key.replace(/\{\d+\}/g, "").trim();
    if (!/[A-Za-zÀ-ÿ]/.test(bare) || NAMES.test(bare)) return key;
    if (zone === "eu" && DEU[key] != null) return DEU[key];
    if (lang === "fr") return key;
    if (D[key] != null) return D[key];
    return null;
  }
  // Traduit une clé ; à défaut, phrase par phrase
  function translateKey(key) {
    var t = look(key);
    if (t != null) return t;
    var parts = key.split(/(?<=[.?!:])\s+(?=[A-ZÀ-Ý«{])|\s+·\s+/);
    var seps = key.match(/(?<=[.?!:])\s+(?=[A-ZÀ-Ý«{])|\s+·\s+/g) || [];
    if (parts.length < 2) { MISS[key] = 1; return key; }
    var out = "";
    parts.forEach(function (p, i) {
      var map = [], local = p.replace(/\{(\d+)\}/g, function (m, n) { map.push(n); return "{" + (map.length - 1) + "}"; });
      var tr = look(local);
      if (tr == null) { MISS[local] = 1; tr = local; }
      out += tr.replace(/\{(\d+)\}/g, function (m, n) { return "{" + map[+n] + "}"; }) + (i < seps.length ? (/·/.test(seps[i]) ? " · " : " ") : "");
    });
    return out;
  }
  function fill(t, tok) { return t.replace(/\{(\d+)\}/g, function (m, i) { return tok[+i] ? fmtTok(tok[+i]) : m; }); }
  function trText(s) {
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (!core) return s;
    if (!/[A-Za-zÀ-ÿ]/.test(core)) return lang === "fr" ? s : lead + numOnly(core) + trail;
    var tok = [], key = normText(core.replace(/\s+/g, " "), tok);
    var i = 0;
    key = key.replace(/\u0001/g, function () { return "{" + i++ + "}"; });
    return lead + fill(translateKey(key), tok) + trail;
  }
  // Texte sans mots (prix, pourcentages, dates) : format du pays
  function numOnly(core) {
    var out = core.replace(/(\d[\d\u202f\u00a0 ]*(?:,\d+)?)\s?€/g, function (m, n) {
      var dec = (n.split(",")[1] || "").length;
      return "\u0002" + parseFloat(n.replace(/[\s\u202f\u00a0]/g, "").replace(",", ".")).toLocaleString(LOC, { style: "currency", currency: "EUR", minimumFractionDigits: dec, maximumFractionDigits: dec }) + "\u0003";
    });
    var keep = [];
    out = out.replace(/\u0002([^\u0003]*)\u0003/g, function (m, c) { keep.push(c); return "\u0004"; });
    var tok = [], key = normText(out, tok), i = 0;
    key = key.replace(/\u0001/g, function () { return "{" + i++ + "}"; });
    var k = 0;
    return fill(key, tok).replace(/\u0004/g, function () { return keep[k++]; });
  }
  function simple(el) {
    if (!el.childNodes.length) return false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) continue;
      if (n.nodeType !== 1) return false;
      if (n.tagName === "BR") continue;
      if (!INL.test(n.tagName) || n.attributes.length) return false;
      for (var j = 0; j < n.childNodes.length; j++) if (n.childNodes[j].nodeType !== 3) return false;
    }
    return true;
  }
  function trBlock(el) {
    var tok = [], key = "";
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) key += normText(n.nodeValue, tok);
      else if (n.tagName === "BR") key += "<br>";
      else {
        var tag = n.tagName.toLowerCase();
        tok.push({ t: "E", html: "<" + tag + ">" + esc(trText(n.textContent)) + "</" + tag + ">" });
        key += "\u0001";
      }
    }
    key = key.replace(/\s+/g, " ").trim();
    var k = 0;
    key = key.replace(/\u0001/g, function () { return "{" + k++ + "}"; });
    return fill(translateKey(key), tok);
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // ---------- Version européenne : on masque ce qui ne concerne que les jeux français ----------
  var FRONLY = /^(Loto|Super Loto|Grand Loto|Keno|Crescendo|Amigo|Tirage spécial du jour|Second tirage du Loto)(?![A-Za-zà-ÿ])/;
  function euClean(root) {
    if (zone !== "eu" || !root || !root.querySelectorAll) return;
    root.querySelectorAll("#tout .tm").forEach(function (b) { var h = b.querySelector("h3"); if (h && FRONLY.test(h.textContent.trim())) b.style.display = "none"; });
    root.querySelectorAll("table tr").forEach(function (tr) { var c = tr.cells && tr.cells[0]; if (c && FRONLY.test(c.textContent.trim())) tr.style.display = "none"; });
  }

  // ---------- Application au DOM ----------
  var busy = false;
  function hasText(el) { for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && /[A-Za-zÀ-ÿ]/.test(n.nodeValue)) return true; } return false; }
  function walk(root) {
    if (!active || !root) return;
    if (root.nodeType === 3) { root = root.parentElement; if (!root) return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|SELECT)$/.test(root.tagName) || root.id === "llLang") return;
    if (root.__llDone && root.__llDone === root.innerHTML) return;
    if (INL.test(root.tagName) && root.parentElement && simple(root.parentElement)) root = root.parentElement;
    if (simple(root) && (root.children.length || hasText(root))) {
      if (root.__llDone !== root.innerHTML) {
        var h = root.children.length ? trBlock(root) : esc(trText(root.textContent));
        if (h !== root.innerHTML) root.innerHTML = h;
        root.__llDone = root.innerHTML;
      }
    } else {
      for (var i = 0; i < root.childNodes.length; i++) {
        var n = root.childNodes[i];
        if (n.nodeType === 3) { if (n.__llOut === n.nodeValue) continue; var v = trText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; n.__llOut = n.nodeValue; }
        else if (n.nodeType === 1) walk(n);
      }
    }
    attrs(root);
  }
  function attrs(root) {
    var list = root.querySelectorAll ? root.querySelectorAll("[placeholder],[aria-label],option") : [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      ["placeholder", "aria-label"].forEach(function (a) {
        var v = e.getAttribute(a);
        if (v && e["__ll" + a] !== v) { var t = trText(v); e["__ll" + a] = t; if (t !== v) e.setAttribute(a, t); }
      });
      if (e.tagName === "OPTION" && !e.hasAttribute("value") && /[A-Za-zÀ-ÿ]/.test(e.textContent) && e.parentElement && e.parentElement.id !== "llLang" && e.__llOut !== e.textContent) { var o = trText(e.textContent); if (o !== e.textContent) e.textContent = o; e.__llOut = e.textContent; }
    }
  }
  var queue = [], scheduled = false;
  function flush() {
    scheduled = false;
    busy = true;
    try { var q = queue; queue = []; q.forEach(function (n) { euClean(n && n.nodeType === 1 ? n : document.body); walk(n); }); picker(); } finally { busy = false; }
  }
  function push(n) { queue.push(n); if (!scheduled) { scheduled = true; Promise.resolve().then(flush); } }

  // ---------- Choix de la langue ----------
  var CHOICES = [["fr|fr", "🇫🇷 Français (France)"], ["fr|eu", "🇧🇪 Français (Belgique, Suisse, Lux.)"], ["en|eu", "🇬🇧 English"], ["es|eu", "🇪🇸 Español"], ["pt|eu", "🇵🇹 Português"], ["de|eu", "🇩🇪 Deutsch"], ["nl|eu", "🇳🇱 Nederlands"]];
  function picker() {
    var bar = document.getElementById("designbar");
    if (!bar || document.getElementById("llLang")) return;
    var s = document.createElement("select");
    s.id = "llLang";
    s.setAttribute("aria-label", "Langue");
    s.style.cssText = "margin-left:auto;border:1px solid var(--line,#ccc);border-radius:999px;padding:6px 10px;background:var(--panel,#fff);color:inherit;font:inherit;font-size:13px";
    var cur = lang + "|" + zone;
    CHOICES.forEach(function (c) { var o = document.createElement("option"); o.value = c[0]; o.textContent = c[1]; if (c[0] === cur) o.selected = true; s.appendChild(o); });
    s.onchange = function () { var v = s.value.split("|"); set("ll_lang", v[0]); set("ll_zone", v[1]); location.reload(); };
    bar.appendChild(s);
  }

  function start() {
    picker();
    if (active) {
      if (DEU["__title"] || D["Le hasard, sous la loupe."]) document.title = "LotoLabo";
      euClean(document.body);
      walk(document.body);
      new MutationObserver(function (ms) {
        if (busy) return;
        ms.forEach(function (m) {
          if (m.type === "characterData") push(m.target);
          else if (m.type === "attributes") push(m.target);
          else m.addedNodes.forEach(function (n) { push(n.nodeType === 3 ? n.parentElement : n); });
          if (m.type === "childList" && m.target && m.target.nodeType === 1) push(m.target);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label"] });
    } else {
      new MutationObserver(function () { if (!document.getElementById("llLang")) picker(); }).observe(document.body, { childList: true, subtree: true });
    }
  }
  window.LLT = function (s) { return active ? trText(s) : s; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
