// Réglages natifs ajoutés après « npx cap add » : identifiants AdMob, suivi publicitaire iOS, chiffrement.
import fs from "fs";
const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
const which = process.argv[2];
if (which === "android") {
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
  console.log("Android : AdMob configuré");
} else if (which === "ios") {
  const pl = "ios/App/App/Info.plist";
  let p = fs.readFileSync(pl, "utf8");
  if (!p.includes("GADApplicationIdentifier")) {
    const sk = ["cstr6suwn9", "4fzdc2evr5", "2fnua5tdw4", "ydx93a7ass", "p78axxw29g", "v72qych5uu", "ludvb6z3bs", "cp8zw746q7", "3sh42y64q3", "c6k4g5qg8m"]
      .map((id) => "\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>" + id + ".skadnetwork</string>\n\t\t</dict>").join("\n");
    const add =
      "\t<key>GADApplicationIdentifier</key>\n\t<string>" + cfg.admob.appIdIos + "</string>\n" +
      "\t<key>SKAdNetworkItems</key>\n\t<array>\n" + sk + "\n\t</array>\n" +
      "\t<key>NSUserTrackingUsageDescription</key>\n\t<string>Ton accord permet d'afficher des publicités plus pertinentes dans la version gratuite de LotoLabo. Tu peux refuser : tu verras simplement des publicités non personnalisées.</string>\n" +
      "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n";
    p = p.replace(/<dict>\n/, "<dict>\n" + add);
    fs.writeFileSync(pl, p);
  }
  console.log("iOS : AdMob et suivi publicitaire configurés");
} else throw new Error("android ou ios");
