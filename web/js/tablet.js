/* Field OS on the real tablet: connects the screens to the local Field OS service (fieldd) so quick settings, screen
   rotation, the on-screen keyboard, power and app buttons do the real thing. In the laptop mock-up there is no service,
   so this file does nothing there. Loaded before quick.js. */
(() => {
"use strict";
const COS = window.COS;
try { const x = new XMLHttpRequest(); x.open("GET", "/api/ping", false); x.send(); const p = x.status === 200 ? JSON.parse(x.responseText) : {};
  COS.onTablet = p.tablet === true;                    // the phone app answers the same way (its own local service), plus device "phone"
  COS.onPhone = COS.onTablet && p.device === "phone"; COS.features = Array.isArray(p.features) ? p.features : []; }
catch (e) { COS.onTablet = false; COS.onPhone = false; COS.features = []; }
if (!COS.onTablet) return;
const api = (path, a, v) => fetch(`/api/${path}?a=${encodeURIComponent(a)}&v=${encodeURIComponent(v ?? "")}`, { headers: { "X-Field": "1" } }).then(r => r.json()).catch(() => ({ ok: false }));
COS.tablet = api;
/* the window is kept out of sight until the page has drawn (no white flash at start-up) */
requestAnimationFrame(() => requestAnimationFrame(() => fetch("/api/ready", { headers: { "X-Field": "1" } }).catch(() => {})));
document.documentElement.classList.add("tablet");
if (COS.onPhone) document.documentElement.classList.add("phone");   // phone app: Android's own keyboard, panels and power menu

/* tell the tablet who is using it: the login screen and the customer side can't open apps, and leaving the owner side closes them */
const role = () => location.hash.startsWith("#/login") || !COS.D.session ? "locked" : COS.D.session === "owner" ? "owner" : "customer";
let lastRole = "";
const syncRole = () => { const r = role(), who = r === "customer" ? (COS.D.portal && COS.D.portal.customer) || "" : "";
  if (r + who !== lastRole) { lastRole = r + who; api("role", r, who); } };
window.addEventListener("hashchange", () => setTimeout(syncRole, 0));
window.addEventListener("load", () => setTimeout(syncRole, 0));
syncRole();

/* quick settings: whenever a setting is saved, send what changed to the tablet */
const MAP = { volume: v => ["volume", v], mute: v => ["mute", v ? "on" : "off"], brightness: v => ["brightness", Math.max(5, v)], wifi: v => ["wifi", v ? "on" : "off"],
  bt: v => ["bluetooth", v ? "on" : "off"], rotlock: v => ["rotation-lock", v ? "on" : "off"], kbd: v => ["keyboard", v ? "on" : "off"],
  night: v => ["night-light", v ? "on" : "off"], airplane: v => ["airplane", v ? "on" : "off"], turn: v => ["rotate", v || "normal"], screen: v => ["screen-timeout", v] };
const set = Storage.prototype.setItem;
Storage.prototype.setItem = function (k, val) {
  if (k === "field-os-quick") { let old = {}, now = {}; try { old = JSON.parse(this.getItem(k)) || {}; now = JSON.parse(val) || {}; } catch (e) { /* ignore */ }
    Object.keys(MAP).forEach(key => { if (now[key] !== undefined && now[key] !== old[key] && !(key === "turn" && !now[key] && !old[key])) api("do", ...MAP[key](now[key])); }); }
  return set.call(this, k, val);
};

document.addEventListener("click", e => {
  const pw = e.target.closest("[data-pw]");                       // power menu: sleep at once, restart / shut down on the confirming tap
  if (pw && (pw.dataset.pw === "sleep" || pw.dataset.sure)) api("do", "power", pw.dataset.pw);
  const open = { "#/app/terminal": "terminal", "#/app/browser": "browser", "#/app/assistant": "assistant", "#/app/docs": "docs" };
  Object.keys(COS.WEBAPPS || {}).forEach(k => { open["#/app/" + k] = k; });
  if (COS.onPhone) open["#/app/cardreader"] = "cardreader";     // phone: card reader app (Tap to Pay)
  const a = e.target.closest("a[href]"); const app = a && open[a.getAttribute("href")];
  if (app) { e.preventDefault(); e.stopPropagation();
    const fromApps = location.hash === "#/apps" && a.classList.contains("tile");   // (Apps screen tiles)          // the terminal opens from the Apps screen's button only
    if (COS.D.session !== "owner" || (app === "terminal" && !fromApps)) return;
    syncRole(); api("open", app, app === "terminal" ? "apps" : ""); COS.toast(`Opening ${app[0].toUpperCase() + app.slice(1)}...`); }
  if (e.target.closest("#mopen")) { /* Google Maps opens through window.open in a new tab of the tablet's browser */ }
}, true);

/* live design updates: fieldd swaps in new screen files by itself (design-only updates); reload once the tablet is idle.
   Never while a customer has the tablet or while something is being typed. */
let ver = null, idleSince = Date.now();
["pointerdown", "keydown", "touchstart"].forEach(t => document.addEventListener(t, () => { idleSince = Date.now(); }, true));
const checkVersion = () => fetch("/api/version").then(r => r.json()).then(o => {
  if (!o || !o.version) return; if (ver === null) { ver = o.version; return; }
  if (o.version !== ver && role() !== "customer" && !TEXT(document.activeElement) && (role() === "locked" || Date.now() - idleSince > 120000)) {
    try { sessionStorage.setItem("field-updated", o.version); } catch (e) { /* ignore */ }
    location.reload(); }
}).catch(() => {});
setInterval(checkVersion, 60000); checkVersion();
try { if (sessionStorage.getItem("field-updated")) { sessionStorage.removeItem("field-updated"); setTimeout(() => COS.toast("Field OS design updated"), 800); } } catch (e) { /* ignore */ }

/* on-screen keyboard: comes up when a text box is tapped, goes away when you leave it */
function TEXT(el) { return el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "range", "file", "button", "submit", "date", "time"].includes(el.type))); }
let hide = null;
if (!COS.onPhone) {                                     // the phone has Android's own keyboard: none of this is needed there
document.addEventListener("focusin", e => { if (TEXT(e.target)) { clearTimeout(hide); api("do", "keyboard", "on"); } });
document.addEventListener("focusout", e => { if (TEXT(e.target)) hide = setTimeout(() => { api("do", "keyboard", "off"); kbdBtn(false); }, 400); });
/* tapping or double-tapping a text box that is already selected brings the keyboard back (after Hide keyboard) */
["click", "dblclick"].forEach(ev => document.addEventListener(ev, e => { if (TEXT(e.target)) { clearTimeout(hide); api("do", "keyboard", "on"); kbdBtn(true); } }, true));
document.addEventListener("focusin", e => { if (TEXT(e.target)) kbdBtn(true); });
/* Hide keyboard: sits right on top of the keyboard (the screen shrinks above the keyboard, so the bottom edge is the keyboard's top) */
/* the keyboard's own Hide key hides it without telling the page: when the screen grows back taller, drop our button too */
let lastH = innerHeight;
addEventListener("resize", () => { if (innerHeight > lastH + 80) kbdBtn(false); lastH = innerHeight; });
function kbdBtn(show) {
  let b = document.getElementById("kbdhide");
  if (!b) { b = document.createElement("button"); b.id = "kbdhide"; b.type = "button"; b.className = "kbdhide";
    b.innerHTML = '<svg viewBox="0 0 24 24" class="i" aria-hidden="true"><path d="M2 5h20v10H2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 12h10M9 18l3 3 3-3"/></svg> Hide keyboard';
    b.addEventListener("pointerdown", e => e.preventDefault());       // keep the text box from losing focus first
    b.onclick = () => { clearTimeout(hide); api("do", "keyboard", "off"); kbdBtn(false); };
    document.body.append(b); }
  b.hidden = !show;
}
}
})();
