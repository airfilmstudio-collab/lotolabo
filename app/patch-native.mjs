// Réglages natifs ajoutés après « npx cap add » : identifiant, version, langues, iPad/Mac, publicité (si activée), chiffrement.
// Usage : node patch-native.mjs android|ios [numéro de build]
import fs from "fs";
const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
const which = process.argv[2];
const build = String(process.argv[3] || "1");
const ADS = !!(cfg.admob && cfg.admob.enabled);
const LANGS = ["fr", "en", "es", "pt", "de", "nl"];

if (which === "android") {
  if (ADS) {
    const man = "android/app/src/main/AndroidManifest.xml";
    let m = fs.readFileSync(man, "utf8");
    if (!m.includes("gms.ads.APPLICATION_ID")) {
      m = m.replace(/<application([^>]*)>/, '<application$1>\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />');
      fs.writeFileSync(man, m);
    }
    const str = "android/app/src/main/res/values/strings.xml";
    let s = fs.readFileSync(str, "utf8");
    if (!s.includes("admob_app_id")) s = s.replace("</resources>", '    <string name="admob_app_id">' + cfg.admob.appIdAndroid + "</string>\n</resources>");
    fs.writeFileSync(str, s);
  }
  const gr = "android/app/build.gradle";
  let g = fs.readFileSync(gr, "utf8");
  g = g.replace(/versionCode \d+/, "versionCode " + build).replace(/versionName "[^"]*"/, 'versionName "' + cfg.version + "." + build + '"');
  fs.writeFileSync(gr, g);
  console.log("Android : version " + cfg.version + "." + build + (ADS ? ", AdMob configuré" : ", sans publicité"));
} else if (which === "ios") {
  // --- Info.plist ---
  const pl = "ios/App/App/Info.plist";
  let p = fs.readFileSync(pl, "utf8");
  const setKey = (key, xml) => {
    const re = new RegExp("\\t<key>" + key + "</key>\\n\\t(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)\\n");
    if (re.test(p)) p = p.replace(re, "\t<key>" + key + "</key>\n\t" + xml + "\n");
    else p = p.replace(/<dict>\n/, "<dict>\n\t<key>" + key + "</key>\n\t" + xml + "\n");
  };
  const arr = (items) => "<array>\n" + items.map((s) => "\t\t<string>" + s + "</string>").join("\n") + "\n\t</array>";
  setKey("CFBundleDisplayName", "<string>LotoLabo</string>");
  setKey("CFBundleDevelopmentRegion", "<string>fr</string>");
  setKey("CFBundleLocalizations", arr(LANGS));
  setKey("ITSAppUsesNonExemptEncryption", "<false/>");
  // Mac (« conçue pour iPad ») : catégorie affichée dans le Finder et le Mac App Store.
  setKey("LSApplicationCategoryType", "<string>public.app-category.entertainment</string>");
  // iPad : multitâche (Split View) et fenêtre redimensionnable sur Mac. iPhone : portrait seulement.
  setKey("UIRequiresFullScreen", "<false/>");
  setKey("UISupportedInterfaceOrientations", arr(["UIInterfaceOrientationPortrait"]));
  setKey("UISupportedInterfaceOrientations~ipad", arr(["UIInterfaceOrientationPortrait", "UIInterfaceOrientationPortraitUpsideDown", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"]));
  setKey("UIStatusBarStyle", "<string>UIStatusBarStyleLightContent</string>");
  setKey("UIViewControllerBasedStatusBarAppearance", "<true/>");
  if (ADS && !p.includes("GADApplicationIdentifier")) {
    const sk = ["cstr6suwn9", "4fzdc2evr5", "2fnua5tdw4", "ydx93a7ass", "p78axxw29g", "v72qych5uu", "ludvb6z3bs", "cp8zw746q7", "3sh42y64q3", "c6k4g5qg8m"]
      .map((id) => "\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>" + id + ".skadnetwork</string>\n\t\t</dict>").join("\n");
    p = p.replace(/<dict>\n/, "<dict>\n" +
      "\t<key>GADApplicationIdentifier</key>\n\t<string>" + cfg.admob.appIdIos + "</string>\n" +
      "\t<key>SKAdNetworkItems</key>\n\t<array>\n" + sk + "\n\t</array>\n" +
      "\t<key>NSUserTrackingUsageDescription</key>\n\t<string>Ton accord permet d'afficher des publicités plus pertinentes dans la version gratuite de LotoLabo. Tu peux refuser : tu verras simplement des publicités non personnalisées.</string>\n");
  }
  fs.writeFileSync(pl, p);

  // --- Projet Xcode : version, équipe, iPhone + iPad, Mac « conçue pour iPad » ---
  const pj = "ios/App/App.xcodeproj/project.pbxproj";
  let x = fs.readFileSync(pj, "utf8");
  x = x.replace(/MARKETING_VERSION = [^;]+;/g, "MARKETING_VERSION = " + cfg.version + ";")
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, "CURRENT_PROJECT_VERSION = " + build + ";")
    .replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, 'TARGETED_DEVICE_FAMILY = "1,2";')
    .replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, "PRODUCT_BUNDLE_IDENTIFIER = " + cfg.bundleId + ";");
  // Réglages ajoutés à chaque configuration de la cible App (Debug et Release).
  const extra = {
    DEVELOPMENT_TEAM: cfg.teamIdIos,
    SUPPORTS_MACCATALYST: "NO",
    SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD: "YES",
    SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD: "NO",
    INFOPLIST_KEY_LSApplicationCategoryType: '"public.app-category.entertainment"',
  };
  x = x.replace(/(buildSettings = \{\n)([^}]*PRODUCT_BUNDLE_IDENTIFIER[^}]*\})/g, (all, head, body) => {
    let b = body;
    for (const [k, v] of Object.entries(extra)) {
      const re = new RegExp("\\n\\t*" + k + " = [^;]+;");
      b = re.test(b) ? b.replace(re, (m) => m.replace(/= [^;]+;/, "= " + v + ";")) : "\t\t\t\t" + k + " = " + v + ";\n" + b;
    }
    return head + b;
  });
  fs.writeFileSync(pj, x);
  console.log("iOS : " + cfg.bundleId + " " + cfg.version + " (" + build + "), iPhone + iPad + Mac, " + LANGS.length + " langues" + (ADS ? ", AdMob configuré" : ", sans publicité"));
} else throw new Error("android ou ios");
