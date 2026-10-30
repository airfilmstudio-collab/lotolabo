/* LotoLabo — couche appli mobile : version gratuite / LotoLabo+ et emplacement publicitaire.
   Chargé dans le <head>, AVANT le script principal.
   window.LL_APP_MODE : "test" (testeurs : achat simulé, rien n'est facturé) ou "store" (achats réels via le store). */
(function () {
  "use strict";
  var MODE = window.LL_APP_MODE || "web";
  if (MODE === "web") return;

  var ZONE = window.LL_ZONE || "fr";
  var FREE = ZONE === "eu" ? {
    games: ["em"],
    views: ["atelier", "stats", "sources"],
    strats: ["chaudes", "retard", "mix", "hasard"],
    designs: ["studio", "ticket"],
    eras: ["r100"]
  } : {
    games: ["loto"],
    views: ["atelier", "stats", "archives", "sources"],
    strats: ["chaudes", "retard", "mix", "hasard"],
    designs: ["studio", "ticket"]
  };
  var PRICES = { year: "19,99 €", yearMonth: "1,67 €", month: "2,99 €", trial: "7 jours" };
  var KEY = "ll_plus";
  var plus = false;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  plus = get(KEY) === "1";

  // Au démarrage en version gratuite, on revient sur des réglages gratuits avant que l'appli ne les lise.
  if (!plus) {
    if (get("ll_game") && FREE.games.indexOf(get("ll_game")) < 0) set("ll_game", FREE.games[0]);
    if (get("ll_tab") && FREE.views.indexOf(get("ll_tab")) < 0) set("ll_tab", "atelier");
    if (get("ll_design") && FREE.designs.indexOf(get("ll_design")) < 0) set("ll_design", "studio");
    var h = location.hash.slice(1);
    if (h && FREE.views.indexOf(h) < 0 && /^[a-z]+$/.test(h)) history.replaceState(null, "", "#atelier");
  }

  function locked(el) {
    if (plus || !el) return null;
    var b;
    if ((b = el.closest("#games button[data-g]")) && FREE.games.indexOf(b.dataset.g) < 0)
      return "« " + b.firstChild.textContent.trim() + " » fait partie de LotoLabo+.";
    if ((b = el.closest("nav.tabs a[data-v]")) && FREE.views.indexOf(b.dataset.v) < 0)
      return "« " + b.textContent.trim() + " » fait partie de LotoLabo+.";
    if ((b = el.closest("#strats .strat")) && FREE.strats.indexOf(b.dataset.s) < 0)
      return "L'inspiration « " + b.querySelector("b").textContent + " » fait partie de LotoLabo+.";
    if (FREE.eras && (b = el.closest("#eraSeg button[data-e]")) && FREE.eras.indexOf(b.dataset.e) < 0)
      return "Tout l'historique fait partie de LotoLabo+.";
    if (el.closest("#draw10")) return "Les 10 grilles d'un coup font partie de LotoLabo+.";
    if ((b = el.closest("#designbar button[data-d]")) && FREE.designs.indexOf(b.dataset.d) < 0)
      return "Ce design fait partie de LotoLabo+.";
    return null;
  }

  document.addEventListener("click", function (e) {
    var why = locked(e.target);
    if (!why) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openPaywall(why);
  }, true);

  window.addEventListener("hashchange", function () {
    var v = location.hash.slice(1);
    if (!plus && v && FREE.views.indexOf(v) < 0 && document.getElementById("v-" + v)) {
      history.replaceState(null, "", "#atelier");
      openPaywall("Cette rubrique fait partie de LotoLabo+.");
    }
  }, true);

  // ---------- Interface ----------
  var css = [
    ".ll-lock{position:relative}",
    ".ll-lock::after{content:'+';position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#ffb52e,#ff3ea5);color:#fff;font:800 13px/18px system-ui;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none}",
    "nav.tabs a.ll-lock::after{top:2px;right:-2px}",
    "#llPay{border:0;border-radius:22px;padding:0;width:min(440px,calc(100% - 24px));max-height:calc(100% - 24px);background:var(--panel,#fff);color:var(--ink,#111);box-shadow:0 30px 80px rgba(0,0,0,.45)}",
    "#llPay::backdrop{background:rgba(8,10,25,.6);backdrop-filter:blur(3px)}",
    "#llPay .top{padding:22px 22px 14px;background:linear-gradient(135deg,#2443c9,#7a2bd6 60%,#ff3ea5);color:#fff;position:relative}",
    "#llPay .top h2{margin:0;font-size:26px}#llPay .top p{margin:6px 0 0;opacity:.92;font-size:14px}",
    "#llPay .x{position:absolute;top:10px;right:12px;border:0;background:rgba(255,255,255,.2);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer}",
    "#llPay .body{padding:16px 22px 20px}",
    "#llPay ul{margin:0 0 14px;padding:0;list-style:none;display:grid;gap:8px;font-size:14.5px}",
    "#llPay li{display:flex;gap:10px;align-items:flex-start}#llPay li b{color:var(--accent,#2443c9)}",
    "#llPay .plans{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 14px}",
    "#llPay .plan{border:2px solid var(--line,#ddd);border-radius:14px;padding:12px;text-align:left;background:transparent;color:inherit;cursor:pointer;position:relative}",
    "#llPay .plan[aria-pressed=true]{border-color:var(--accent,#2443c9);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#2443c9) 22%,transparent)}",
    "#llPay .plan b{display:block;font-size:20px}#llPay .plan small{opacity:.75}",
    "#llPay .tag{position:absolute;top:-10px;right:10px;background:#ff3ea5;color:#fff;font:700 11px system-ui;padding:3px 8px;border-radius:999px}",
    "#llPay .cta{width:100%;border:0;border-radius:14px;padding:15px;font-weight:800;font-size:16px;background:linear-gradient(135deg,#2443c9,#7a2bd6);color:#fff;cursor:pointer}",
    "#llPay .fine{font-size:12px;opacity:.7;margin:10px 0 0;line-height:1.4}",
    "#llPay .test{font-size:13px;background:color-mix(in srgb,#ffb52e 22%,transparent);border-radius:10px;padding:8px 10px;margin:0 0 12px}",
    "#llPay .links{display:flex;justify-content:space-between;margin-top:10px;font-size:13px}#llPay .links button{background:none;border:0;color:var(--accent,#2443c9);cursor:pointer;padding:4px 0}",
    "#llAd{position:fixed;left:0;right:0;bottom:0;z-index:25;height:calc(54px + env(safe-area-inset-bottom,0px));padding-bottom:env(safe-area-inset-bottom,0px);display:flex;align-items:center;justify-content:center;gap:10px;background:#eef0f6;color:#555;font:13px system-ui;border-top:1px solid rgba(0,0,0,.08)}",
    "#llAd button{border:0;border-radius:999px;padding:6px 12px;background:#2443c9;color:#fff;font-weight:700;cursor:pointer}",
    "body.ll-ad{padding-bottom:calc(60px + env(safe-area-inset-bottom,0px))}body.ll-ad .fb-btn{bottom:calc(70px + env(safe-area-inset-bottom,0px))}",
    "#llState{display:block;margin:10px auto 0;border:1px dashed var(--line,#ccc);background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer}"
  ].join("\n");

  var dlg, plan = "year";
  function build() {
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
    dlg = document.createElement("dialog");
    dlg.id = "llPay";
    dlg.innerHTML =
      '<div class="top"><button class="x" type="button" aria-label="Fermer">×</button><h2>LotoLabo+</h2><p id="llWhy"></p></div>' +
      '<div class="body">' +
      (MODE === "test" ? '<p class="test"><b>Version test :</b> rien n\'est facturé. Dis-nous dans ton avis si tu paierais ce prix.</p>' : "") +
      "<ul>" +
      (ZONE === "eu" ?
        "<li><b>✦</b><span><strong>EuroDreams</strong> et <strong>tout l'historique EuroMillions</strong> depuis 2004</span></li>" +
        "<li><b>✦</b><span><strong>Ma grille face aux archives, Laboratoire, Machine à remonter le temps</strong></span></li>" :
        "<li><b>✦</b><span><strong>5 jeux en plus</strong> : EuroMillions, EuroDreams, Keno, Crescendo et Amigo</span></li>" +
        "<li><b>✦</b><span><strong>Laboratoire, Machine à remonter le temps, Records</strong></span></li>") +
      "<li><b>✦</b><span>Toutes les inspirations (En forme, Hors anniversaires, Mode DJ) et <strong>10 grilles d'un coup</strong></span></li>" +
      "<li><b>✦</b><span>Les <strong>4 designs</strong> et <strong>aucune publicité</strong></span></li>" +
      "</ul>" +
      '<div class="plans">' +
      '<button class="plan" type="button" data-p="year" aria-pressed="true"><span class="tag">2 mois offerts</span><small>Annuel</small><b>' + PRICES.year + '</b><small>soit ' + PRICES.yearMonth + ' / mois</small></button>' +
      '<button class="plan" type="button" data-p="month" aria-pressed="false"><small>Mensuel</small><b>' + PRICES.month + "</b><small>par mois</small></button>" +
      "</div>" +
      '<button class="cta" type="button" id="llBuy"></button>' +
      '<div class="links"><button type="button" id="llRestore">Restaurer mes achats</button><button type="button" id="llLater">Plus tard</button></div>' +
      '<p class="fine">Essai gratuit de ' + PRICES.trial + ", puis renouvellement automatique. Résiliable à tout moment dans les réglages de ton compte App Store ou Google Play. " + (ZONE === "eu" ? "LotoLabo est une application indépendante, sans lien avec les loteries officielles : elle ne permet pas de jouer et ne prédit aucun résultat." : "LotoLabo est une application indépendante, sans lien avec la FDJ : elle ne permet pas de jouer et ne prédit aucun résultat.") + "<br><a href=\"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/\" target=\"_blank\" rel=\"noopener\">Conditions d'utilisation</a> · <a href=\"https://airfilmstudio-collab.github.io/lotolabo/confidentialite.html\" target=\"_blank\" rel=\"noopener\">Confidentialité</a></p>" +
      "</div>";
    document.body.appendChild(dlg);
    dlg.querySelector(".x").onclick = close;
    dlg.querySelector("#llLater").onclick = close;
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    dlg.querySelector(".plans").onclick = function (e) {
      var b = e.target.closest(".plan");
      if (!b) return;
      plan = b.dataset.p;
      dlg.querySelectorAll(".plan").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      label();
    };
    dlg.querySelector("#llBuy").onclick = buy;
    dlg.querySelector("#llRestore").onclick = restore;
    label();
    decorate();
    new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
    ads();
    stateChip();
    syncPurchases();
  }
  function label() {
    dlg.querySelector("#llBuy").textContent = MODE === "test" ? "Débloquer gratuitement (test)" : "Essayer " + PRICES.trial + " gratuitement";
  }
  function openPaywall(why) {
    if (!dlg) return;
    dlg.querySelector("#llWhy").textContent = why || "Tous les jeux et tous les outils, sans publicité.";
    if (!dlg.open) dlg.showModal();
  }
  function close() { if (dlg && dlg.open) dlg.close(); }

  var decorating = false;
  function decorate() {
    if (decorating) return;
    decorating = true;
    var sel = [];
    document.querySelectorAll("#games button[data-g]").forEach(function (b) { if (FREE.games.indexOf(b.dataset.g) < 0) sel.push(b); });
    document.querySelectorAll("nav.tabs a[data-v]").forEach(function (b) { if (FREE.views.indexOf(b.dataset.v) < 0) sel.push(b); });
    document.querySelectorAll("#strats .strat").forEach(function (b) { if (FREE.strats.indexOf(b.dataset.s) < 0) sel.push(b); });
    document.querySelectorAll("#designbar button[data-d]").forEach(function (b) { if (FREE.designs.indexOf(b.dataset.d) < 0) sel.push(b); });
    var d10 = document.getElementById("draw10");
    if (d10) sel.push(d10);
    if (FREE.eras) {
      document.querySelectorAll("#eraSeg button[data-e]").forEach(function (b) { if (FREE.eras.indexOf(b.dataset.e) < 0) sel.push(b); });
      var cur = document.querySelector('#eraSeg button[aria-pressed="true"]'), ok = document.querySelector('#eraSeg button[data-e="' + FREE.eras[0] + '"]');
      if (!plus && cur && ok && FREE.eras.indexOf(cur.dataset.e) < 0) setTimeout(function () { ok.click(); }, 0);
    }
    sel.forEach(function (b) { if (b.classList.contains("ll-lock") === plus) b.classList.toggle("ll-lock", !plus); });
    decorating = false;
  }

  function unlock(on) {
    plus = !!on;
    set(KEY, plus ? "1" : "0");
    decorate();
    ads();
    stateChip();
  }
  // ---------- Natif : achats (RevenueCat), publicité (AdMob), bouton retour ----------
  var CFG = window.LL_CONFIG || {};
  var Cap = window.Capacitor;
  var NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var OS = NATIVE ? Cap.getPlatform() : "web";
  function plugin(n) { return NATIVE && Cap.Plugins ? Cap.Plugins[n] : null; }
  var ENT = (CFG.revenuecat && CFG.revenuecat.entitlement) || "plus";
  var rcReady = null;
  function purchases() {
    var P = plugin("Purchases");
    var key = CFG.revenuecat && CFG.revenuecat[OS];
    if (MODE !== "store" || !P || !key) return null;
    if (!rcReady) rcReady = P.configure({ apiKey: key }).then(function () { return P; });
    return rcReady;
  }
  function hasPlus(info) { var ci = info && (info.customerInfo || info); return !!(ci && ci.entitlements && ci.entitlements.active && ci.entitlements.active[ENT]); }
  function syncPurchases() {
    var r = purchases();
    if (!r) return;
    r.then(function (P) { return P.getCustomerInfo(); }).then(function (i) { if (hasPlus(i) !== plus) unlock(hasPlus(i)); }).catch(function () {});
  }

  function buy() {
    if (MODE === "test") { unlock(true); close(); toast("LotoLabo+ débloqué pour le test. Merci !"); return; }
    var r = purchases();
    if (!r) { toast("Les achats seront disponibles à la sortie sur les stores."); return; }
    var btn = dlg.querySelector("#llBuy");
    btn.disabled = true;
    r.then(function (P) {
      return P.getOfferings().then(function (o) {
        var pk = o.current && (plan === "year" ? o.current.annual : o.current.monthly);
        if (!pk) throw new Error("offre introuvable");
        return P.purchasePackage({ aPackage: pk });
      });
    }).then(function (res) {
      if (hasPlus(res)) { unlock(true); close(); toast("Bienvenue dans LotoLabo+ !"); }
    }).catch(function (err) {
      if (!(err && (err.userCancelled || err.code === "1"))) toast("L'achat n'a pas abouti. Réessaie dans un instant.");
    }).then(function () { btn.disabled = false; });
  }
  function restore() {
    if (MODE === "test") { toast("En version test, il n'y a rien à restaurer."); return; }
    var r = purchases();
    if (!r) return;
    r.then(function (P) { return P.restorePurchases(); }).then(function (res) {
      var ok = hasPlus(res);
      unlock(ok);
      toast(ok ? "Achats restaurés." : "Aucun abonnement trouvé.");
      if (ok) close();
    }).catch(function () { toast("Restauration impossible pour le moment."); });
  }

  var adState = "off";
  function nativeAds(show) {
    var A = plugin("AdMob");
    if (!A) return false;
    if (!show) { if (adState !== "off") { A.removeBanner().catch(function () {}); adState = "off"; } return true; }
    if (adState !== "off") return true;
    adState = "starting";
    var ad = CFG.admob || {};
    A.initialize({}).then(function () { return A.requestConsentInfo(); }).then(function (c) {
      if (c && c.isConsentFormAvailable && c.status === "REQUIRED") return A.showConsentForm();
      return c;
    }).then(function () {
      if (OS !== "ios") return;
      return A.trackingAuthorizationStatus().then(function (s) { if (s && s.status === "notDetermined") return A.requestTrackingAuthorization(); });
    }).then(function () {
      if (plus) { adState = "off"; return; }
      return A.showBanner({ adId: OS === "ios" ? ad.bannerIos : ad.bannerAndroid, adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: !!ad.testing })
        .then(function () { adState = "on"; });
    }).catch(function () { adState = "off"; });
    return true;
  }
  function ads() {
    var ad = document.getElementById("llAd");
    if (plus) { if (ad) ad.remove(); document.body.classList.remove("ll-ad"); nativeAds(false); return; }
    document.body.classList.add("ll-ad");
    if (nativeAds(true)) { if (ad) ad.remove(); return; }
    if (!ad) {
      ad = document.createElement("div");
      ad.id = "llAd";
      ad.innerHTML = '<span>' + (MODE === "test" ? "Espace publicitaire (exemple)" : "Publicité") + '</span><button type="button">Retirer les pubs</button>';
      ad.querySelector("button").onclick = function () { openPaywall("Profite de LotoLabo sans publicité."); };
      document.body.appendChild(ad);
    }
  }

  if (NATIVE) {
    // Bouton retour Android : ferme d'abord une fenêtre ouverte, puis revient à l'atelier, puis quitte.
    var App = plugin("App");
    if (App && App.addListener) App.addListener("backButton", function () {
      var open = document.querySelector("dialog[open]");
      if (open) { open.close(); return; }
      var v = location.hash.slice(1);
      if (v && v !== "atelier") { location.hash = "#atelier"; return; }
      App.exitApp();
    });
    // Liens externes (WhatsApp, sources, conditions) : ouverts dans le navigateur du téléphone.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href^='http']");
      if (!a || a.target !== "_blank") return;
      e.preventDefault();
      window.location.href = a.href;
    });
  }

  function stateChip() {
    var foot = document.getElementById("foot");
    if (!foot) return;
    var c = document.getElementById("llState");
    if (!c) {
      c = document.createElement("button");
      c.id = "llState";
      c.type = "button";
      foot.insertAdjacentElement("afterend", c);
      c.onclick = function () { if (plus) { if (MODE === "test") unlock(false); } else openPaywall(); };
    }
    c.textContent = plus ? (MODE === "test" ? "LotoLabo+ actif (test) · revenir à la version gratuite" : "LotoLabo+ actif · merci !") : "Version gratuite · découvrir LotoLabo+";
    var A = plugin("AdMob"), pc = document.getElementById("llPrivacy");
    if (A && !plus && !pc) {
      pc = document.createElement("button");
      pc.id = "llPrivacy";
      pc.type = "button";
      pc.textContent = "Gérer mes choix publicitaires";
      pc.style.cssText = "display:block;margin:8px auto 0;border:0;background:none;color:inherit;opacity:.7;font-size:12px;text-decoration:underline;cursor:pointer";
      pc.onclick = function () { A.showPrivacyOptionsForm().catch(function () {}); };
      c.insertAdjacentElement("afterend", pc);
    } else if (pc && plus) pc.remove();
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:60;background:#111;color:#fff;padding:10px 16px;border-radius:999px;font:600 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:calc(100% - 32px);text-align:center";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
  window.LLPlus = { open: openPaywall, isPlus: function () { return plus; } };
})();
