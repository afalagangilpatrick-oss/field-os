/* Field OS phone app (foldable phone, Android): what is different from the tablet, in one place. Does nothing on the tablet
   or the laptop mock-up. The phone app runs these same screens in an Android WebView, served by its own local Field
   service (the Python fieldlib, same as the tablet), so almost everything works unchanged; this file covers the rest:
   - downloads (offline backup .zip, books .csv) -> saved into the phone's Downloads folder
   - fingerprint unlock on the login screen (Android BiometricPrompt), next to the PIN
   - Android's back gesture -> the Back button of Field OS (the customer side never steps back into the owner side)
   - Update OS -> Update app (the app from the laptop; screen designs come from the tablet at each Phone sync)
   - folded (outer screen) / unfolded (inner screen): class "folded" / "unfolded" on <html> for the layout
   Loaded after quick.js (so the login hook wraps its quick settings) and tablet.js (which sets COS.onPhone). */
(() => {
"use strict";
const COS = window.COS;
if (!COS || !COS.onPhone) return;
const { S, $, toast } = COS;
const H = { "X-Field": "1" };

/* ---------- screen shape: cover screen (narrow, tall) or opened (wide, almost square) ---------- */
const shape = () => { const w = innerWidth, h = innerHeight, r = document.documentElement.classList;
  r.toggle("folded", w < 600); r.toggle("unfolded", w >= 600); r.toggle("portrait", h > w); };
addEventListener("resize", shape); shape();

/* ---------- downloads: blob links can't be downloaded by Android itself, so hand the file to the app ---------- */
const click = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () {
  const href = this.getAttribute("href") || "";
  if (this.hasAttribute("download") && (href.startsWith("blob:") || href.startsWith("data:"))) {
    const name = this.getAttribute("download") || "field-file";
    fetch(href).then(r => r.blob()).then(b => fetch(`/api/download?name=${encodeURIComponent(name)}&type=${encodeURIComponent(b.type || "application/octet-stream")}`,
      { method: "POST", headers: H, body: b })).then(r => r.json())
      .then(o => toast(o.ok ? `Saved to Downloads: ${name}` : (o.error || "Couldn't save the file")))
      .catch(() => toast("Couldn't save the file"));
    return;
  }
  return click.call(this);
};

/* ---------- fingerprint unlock ---------- */
const login = COS.afterLogin;
COS.afterLogin = (...a) => {
  if (login) login(...a);
  const go = $("#go"); if (!go || $("#fpbtn")) return;
  fetch("/api/do?a=biometric&v=status", { headers: H }).then(r => r.json()).then(o => {
    if (!o || !o.ok || !o.available || $("#fpbtn")) return;
    const b = document.createElement("button"); b.className = "btn wide ghost"; b.id = "fpbtn"; b.type = "button";
    b.innerHTML = `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v4M8 9a4 4 0 0 1 8 0v5a8 8 0 0 1-1 4M6 12v2a6 6 0 0 0 2 4.5M4 9a8 8 0 0 1 15.5-3M20 12v2"/></svg> Unlock with fingerprint`;
    b.style.marginTop = "8px";
    b.onclick = () => fetch("/api/do?a=biometric&v=unlock", { headers: H }).then(r => r.json()).then(x => {
      if (x && x.ok) COS.unlockOwner(); else if (x && x.error) toast(x.error); }).catch(() => toast("Fingerprint didn't work"));
    go.after(b);
  }).catch(() => {});
};

/* ---------- Android back gesture (MainActivity asks this first) ---------- */
COS.androidBack = () => {
  const p = document.querySelector(".qpanel"); if (p) { p.remove(); return true; }
  const h = location.hash || "#/login";
  if (["#/home", "#/login", "#/portal", "#/portal/start", ""].includes(h)) return false;     // let Android go to the home screen
  const b = document.getElementById("back"); if (b) { b.click(); return true; }
  return false;
};

/* ---------- auto-lock also counts time spent away from the app (the phone goes in a pocket, other apps are used) ---------- */
const AWAY = "field-phone-away-at";
const lockIfAway = () => {
  let at = 0; try { at = Number(localStorage.getItem(AWAY)) || 0; } catch (e) { /* ignore */ }
  let mins = 10; try { const q = JSON.parse(localStorage.getItem("field-os-quick")) || {}; mins = Number(q.autolock); if (q.autolock === "never") mins = 0; else if (!mins) mins = 10; } catch (e) { /* default */ }
  if (at && mins && Date.now() - at >= mins * 60000 && COS.D.session && !location.hash.startsWith("#/login")) location.hash = "#/login";
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { try { localStorage.setItem(AWAY, String(Date.now())); } catch (e) { /* ignore */ } }
  else { lockIfAway(); try { localStorage.removeItem(AWAY); } catch (e) { /* ignore */ } }
});
lockIfAway(); try { localStorage.removeItem(AWAY); } catch (e) { /* ignore */ }   // the app was closed by Android while away: same rule when it opens again

/* ---------- Update OS -> Update app ---------- */
const up = S.update;
if (up) {
  S.update = (...a) => up(...a).replace(`</svg> Update OS</h1>`, `</svg> Update app</h1>`)
    .replace(/<p>Gets the newest Field OS fixes[^<]*<\/p>/, `<p>Gets the newest Field OS phone app from your laptop over your home Wi-Fi. Screen design changes
      arrive by themselves from the tablet at every Phone sync. Your records are not touched.</p>`)
    .replace(/<p class="sub" style="margin-top:10px">The laptop and tablet[^<]*<\/p>/, `<p class="sub" style="margin-top:10px">The laptop and phone need to be on the
      same Wi-Fi. Android asks you to confirm the install (the first time also: allow Field OS to install apps).</p>`);
  S.update.after = up.after;
}
})();
