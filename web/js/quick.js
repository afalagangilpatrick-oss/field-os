/* Field OS quick settings: small icons at the bottom of the side bar (volume, brightness, Wi-Fi, Bluetooth,
   rotation lock, on-screen keyboard, night light, airplane mode, power). On the tablet every control calls
   scripts/ubuntu/quick-settings.sh through the local Field OS service; the mock-up only shows the command. */
(() => {
"use strict";
const { $, $$, esc, toast } = window.COS;
const KEY = "field-os-quick";
let Q = { volume: 60, mute: false, brightness: 70, wifi: true, net: "HomeNetwork", bt: true, rotlock: false, kbd: false, night: false, airplane: false, autolock: "10", screen: "10" };
try { Object.assign(Q, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* defaults */ }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(Q)); } catch (e) { /* ignore */ } };
const QS = "scripts/ubuntu/quick-settings.sh";
const P = {
  volume: "M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14", mute: "M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  wifi: "M5 12.6a10 10 0 0 1 14 0M1.4 9a15 15 0 0 1 21.2 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  timer: "M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 2h6",
  bt: "M7 7l10 10-5 5V2l5 5L7 17", rotate: "M21 2v6h-6M21 13a9 9 0 1 1-3-7.7L21 8M10 11V9a2 2 0 0 1 4 0v2M9 11h6v5H9z",
  kbd: "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", plane: "M17.8 19.2L16 11l3.5-3.5A2.1 2.1 0 0 0 16.5 4.5L13 8 4.8 6.2 3 8l7 3.5L7 15H4l-1 1 4 2 2 4 1-1v-3l3.5-3L17 21z",
  power: "M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10",
  turn: "M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const ITEMS = { volume: ["Volume", () => Q.mute ? "mute" : "volume"], brightness: ["Brightness", () => "sun"], wifi: ["Wi-Fi", () => "wifi"], bt: ["Bluetooth", () => "bt"],
  rotlock: ["Rotation lock", () => "rotate"], kbd: ["On-screen keyboard", () => "kbd"], night: ["Night light", () => "moon"], airplane: ["Airplane mode", () => "plane"], power: ["Power", () => "power"], autolock: ["Auto-lock", () => "lock"], screen: ["Screen sleep", () => "timer"], turn: ["Rotate screen", () => "turn"] };
const OWNER = ["volume", "brightness", "wifi", "autolock", "screen", "bt", "rotlock", "kbd", "night", "airplane", "power"];
const LOGIN = ["volume", "brightness", "turn", "bt", "wifi", "power"];   // login screen: no one is signed in yet
const CUSTOMER = ["volume", "brightness", "turn", "kbd"];  // customers can't change networks or power
/* phone app: Android already has volume, Wi-Fi, Bluetooth, airplane mode, night light, its keyboard and its power menu.
   Those icons open Android's own panel instead of a Field OS one; brightness, rotation, screen sleep and auto-lock stay Field OS's. */
const PHONE = () => !!window.COS.onPhone;
const NATIVE = new Set(["volume", "wifi", "bt", "airplane", "night"]);
const forPhone = list => PHONE() ? list.filter(k => k !== "kbd" && k !== "power") : list;
const state = k => ({ wifi: Q.wifi && !Q.airplane, bt: Q.bt && !Q.airplane, rotlock: Q.rotlock, kbd: Q.kbd, night: Q.night, airplane: Q.airplane, volume: !Q.mute }[k]);

function loginBar() {
  const q = document.createElement("div"); q.className = "quick loginq"; q.setAttribute("aria-label", "Quick settings");
  q.innerHTML = forPhone(LOGIN).map(k => { const st = state(k); return `<button data-q="${k}" title="${ITEMS[k][0]}" aria-label="${ITEMS[k][0]}" class="${st === true && k !== "volume" ? "on" : st === false ? "off" : ""}">${ic(ITEMS[k][1]())}</button>`; }).join("");
  $("#app").append(q); $$("[data-q]", q).forEach(b => b.onclick = () => panel(b.dataset.q, "login"));
}
function bar(portal) {
  if (!portal && Q.turn && window.top === window) { Q.turn = ""; keep(); }   // the owner side always opens the right way up
  applyTurn();
  const tb = $(".topbar"), tog = $("#qtoggle"); if (!tb || !tog) return;
  // quick settings drop down from the top bar (between the Exit button and the logo): one row of small icons, no title
  const q = document.createElement("div"); q.className = "quick qdrop"; q.hidden = !Q.qopen; q.setAttribute("aria-label", "Quick settings");
  q.innerHTML = forPhone(portal ? CUSTOMER : OWNER).map(k => { const st = state(k);
    return `<button data-q="${k}" title="${ITEMS[k][0]}" aria-label="${ITEMS[k][0]}" class="${st === true && k !== "volume" ? "on" : st === false ? "off" : ""}">${ic(ITEMS[k][1]())}</button>`; }).join("");
  tb.after(q);
  // the arrow sits halfway between Exit and the logo; the icons drop down in one row that fits in that gap
  // (never under the Exit button or the logo): icons shrink a little if the gap is narrow
  const place = () => {
    const ex = $(".exitbtn", tb), lg = $(".hanglogo", tb); if (!ex || !lg) return;
    const tr = tb.getBoundingClientRect(), er = ex.getBoundingClientRect(), lr = lg.getBoundingClientRect();
    const lo = er.right + 8, hi = lr.left - 8;
    tog.style.left = ((lo + hi) / 2 - tr.left - tog.offsetWidth / 2) + "px";
    const n = q.children.length, pad = 16, size = Math.max(26, Math.min(40, Math.floor((hi - lo - pad) / n)));
    q.style.setProperty("--qb", size + "px");
    const w = n * size + pad, mid = (lo + hi) / 2;
    q.style.left = Math.max(lo, Math.min(hi - w, mid - w / 2)) + "px";
  };
  if (!window.__qplace) { window.__qplace = true; addEventListener("resize", () => { const t = $("#qtoggle"); if (t && t.__place) t.__place(); }); }
  tog.__place = place;
  place(); tog.setAttribute("aria-expanded", String(!!Q.qopen)); tog.classList.toggle("on", !!Q.qopen);
  tog.onclick = () => { Q.qopen = !Q.qopen; keep(); close(); q.hidden = !Q.qopen; tog.setAttribute("aria-expanded", String(Q.qopen)); tog.classList.toggle("on", Q.qopen); place(); };
  $$("[data-q]", q).forEach(b => b.onclick = () => panel(b.dataset.q, portal));
}
function close() { const p = $(".qpanel"); if (p) p.remove(); }
function panel(k, portal) {
  if (PHONE() && NATIVE.has(k) && window.COS.tablet) { close(); window.COS.tablet("do", "panel", k); return; }
  close(); const d = document.createElement("div"); d.className = "qpanel" + (portal === "login" ? " atlogin" : ""); const [title, icon] = ITEMS[k];
  const sw = (key, label) => `<label class="switch">${label}<input type="checkbox" data-sw="${key}" ${Q[key] ? "checked" : ""}></label>`;
  let body = "", cmd = "";
  if (k === "volume") { body = `<input type="range" min="0" max="100" value="${Q.volume}" id="qr">${sw("mute", "Mute")}`; cmd = `${QS} volume ${Q.volume}`; }
  if (k === "brightness") { body = `<input type="range" min="5" max="100" value="${Q.brightness}" id="qr">`; cmd = `${QS} brightness ${Q.brightness}`; }
  if (k === "wifi" && window.COS.onTablet) { body = `${sw("wifi", "Wi-Fi")}<div id="wifibox"><p class="sub">Looking for networks...</p></div>`; cmd = "NetworkManager (real networks)"; }
  else if (k === "wifi") { body = `${sw("wifi", "Wi-Fi")}<div class="list">${["HomeNetwork", "Cafe WiFi", "Customer-Guest"].map(n => `<button class="row tap" style="width:100%;border:0;background:${n === Q.net ? "var(--green-soft)" : "none"};font:inherit;text-align:left" data-net="${n}">
      ${ic("wifi")}<span class="grow">${esc(n)}</span>${n === Q.net ? `<span class="pill green">Connected</span>` : ""}</button>`).join("")}</div>`; cmd = `${QS} wifi ${Q.wifi ? "on" : "off"}`; }
  if (k === "bt") { body = `${sw("bt", "Bluetooth")}<div class="list"><div class="row">${ic("bt")}<span class="grow">Stylus / pen</span><span class="pill green">Paired</span></div>
      <div class="row">${ic("bt")}<span class="grow">Truck speaker</span><span class="pill gray">Not connected</span></div></div>`; cmd = `${QS} bluetooth ${Q.bt ? "on" : "off"}`; }
  if (k === "rotlock") { body = sw("rotlock", "Lock screen rotation"); cmd = `${QS} rotation-lock ${Q.rotlock ? "on" : "off"}`; }
  const choose = (key, opts) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${opts.map(([v, l]) => `<button class="btn ${Q[key] === v ? "green" : "ghost"}" data-pick="${key}:${v}">${l}</button>`).join("")}</div>`;
  if (k === "autolock") { body = `<p class="sub" style="margin:0 0 10px">Go back to the login screen when nobody has touched the tablet for:</p>` + choose("autolock", [["5", "5 minutes"], ["10", "10 minutes"], ["30", "30 minutes"], ["never", "No auto-lock"]]); cmd = "Field OS screens (no command)"; }
  if (k === "screen" && PHONE()) { body = `<p class="sub" style="margin:0 0 10px">While Field OS is open, the screen:</p>` + choose("screen", [["10", "Sleeps like normal (Android setting)"], ["never", "Stays on (job site)"]]); cmd = "Android"; }
  else if (k === "screen") { body = `<p class="sub" style="margin:0 0 10px">Turn the screen off when nothing has happened for:</p>` + choose("screen", [["5", "5 minutes"], ["10", "10 minutes"], ["30", "30 minutes"], ["never", "Never sleep"]]); cmd = `field-idle.sh screen ${Q.screen}`; }
  if (k === "kbd") { body = sw("kbd", "Show on-screen keyboard"); cmd = `${QS} keyboard ${Q.kbd ? "on" : "off"}`; }
  if (k === "night") { body = sw("night", "Night light (warmer screen)"); cmd = `${QS} night-light ${Q.night ? "on" : "off"}`; }
  if (k === "airplane") { body = sw("airplane", "Airplane mode (Wi-Fi + Bluetooth off)"); cmd = `${QS} airplane ${Q.airplane ? "on" : "off"}`; }
  if (k === "turn") { body = `<div class="grid g2" style="gap:8px">${[["normal", "Normal"], ["left", "Turn left"], ["right", "Turn right"], ["inverted", "Upside down (face the other person)"]]
      .map(([v, l]) => `<button class="btn ${Q.turn === v || (!Q.turn && v === "normal") ? "green" : "ghost"}" data-turn="${v}">${l}</button>`).join("")}</div>`; cmd = `${QS} rotate ${Q.turn || "normal"}`; }
  if (k === "power") { body = `<div style="display:grid;gap:8px">${(portal === "login" ? [["restart", "Restart"], ["shutdown", "Power off"]] : [["sleep", "Sleep"], ["restart", "Restart"], ["shutdown", "Shut down"]]).map(([a, l]) => `<button class="btn ${a === "shutdown" ? "danger" : "ghost"}" data-pw="${a}">${l}</button>`).join("")}</div>`; cmd = `${QS} power sleep|restart|shutdown`; }
  d.innerHTML = `<button class="btn small ghost x" aria-label="Close">&times;</button><h3>${ic(icon())} ${title}</h3>${body}${window.COS.onTablet ? "" : `<div class="cmd">On the tablet: ${esc(cmd)}</div>`}`;
  document.body.append(d);
  const refresh = () => { const r = $(".quick"); if (!r) return; r.remove(); if (portal === "login") loginBar(); else bar(document.body.classList.contains("portal")); };
  $(".x", d).onclick = close;
  if (k === "wifi" && window.COS.onTablet) wifiReal(d);
  const r = $("#qr", d); if (r) r.oninput = () => { Q[k] = +r.value; keep(); $(".cmd", d).textContent = `On the tablet: ${QS} ${k} ${r.value}`;
    if (k === "brightness") if (!window.COS.onTablet) document.documentElement.style.filter = `brightness(${0.55 + Q.brightness / 222})`; };
  $$("[data-sw]", d).forEach(x => x.onchange = () => { Q[x.dataset.sw] = x.checked; keep(); refresh(); if (window.COS.netUI) window.COS.netUI(); toast(`${x.parentElement.textContent.trim()}: ${x.checked ? "on" : "off"}`);
    if (x.dataset.sw === "wifi" && window.COS.onTablet) setTimeout(() => wifiReal(d), x.checked ? 3000 : 300); });
  $$("[data-net]", d).forEach(x => x.onclick = () => { Q.net = x.dataset.net; Q.wifi = true; keep(); panel("wifi", portal); toast(`Connected to ${Q.net} (mock)`); });
  $$("[data-pick]", d).forEach(x => x.onclick = () => { const [key, v] = x.dataset.pick.split(":"); Q[key] = v; keep(); panel(k, portal);
    toast(`${ITEMS[key][0]}: ${v === "never" ? (key === "screen" ? "never sleep" : "off") : v + " minutes"}`); });
  $$("[data-turn]", d).forEach(x => x.onclick = () => { Q.turn = x.dataset.turn; keep(); close(); applyTurn(); });
  $$("[data-pw]", d).forEach(x => x.onclick = () => { if (x.dataset.pw !== "sleep" && !x.dataset.sure) { x.dataset.sure = "1"; x.textContent = `Tap again to ${x.textContent.toLowerCase()}`; return; }
    close(); toast(`${x.dataset.pw === "sleep" ? "Sleeping" : x.dataset.pw === "restart" ? "Restarting" : "Shutting down"}${window.COS.onTablet ? "..." : " (mock)"}`); });
}
document.addEventListener("pointerdown", e => { const p = $(".qpanel"); if (p && !p.contains(e.target) && !e.target.closest(".quick")) close(); });
window.addEventListener("hashchange", close);
if (Q.brightness !== 70) if (!window.COS.onTablet) document.documentElement.style.filter = `brightness(${0.55 + Q.brightness / 222})`;
function applyTurn() {
  if (window.COS.onTablet) return;   // the real tablet turns its actual screen (tablet.js -> quick-settings.sh rotate)   // mock-up preview of the tablet turned: upside down flips the screen; left / right show the upright (portrait) layout
  const app = document.getElementById("app"); if (app) app.style.transform = Q.turn === "inverted" ? "rotate(180deg)" : "";
  let pv = document.getElementById("portrait");
  if ((Q.turn === "left" || Q.turn === "right") && window.top === window) {
    if (!pv) { pv = document.createElement("div"); pv.id = "portrait"; pv.className = "portraitpv";
      pv.innerHTML = `<div class="pvbar"><b>Upright (portrait) view: tablet turned ${Q.turn}</b><button class="btn small" id="pvback">Back to landscape</button></div><div class="pvframe"><iframe title="Portrait view" src="${location.href.split("#")[0]}#/login"></iframe></div>`;
      document.body.append(pv); pv.querySelector("#pvback").onclick = () => { Q.turn = "normal"; keep(); applyTurn(); };
      const fit = () => { const f = pv.querySelector(".pvframe"), k = Math.min((innerHeight - 70) / 1280, (innerWidth - 40) / 720); f.style.transform = `scale(${k})`; f.style.width = "720px"; f.style.height = "1280px"; };
      fit(); window.addEventListener("resize", fit); }
  } else if (pv) pv.remove(); }
applyTurn();
/* auto-lock: no touch, key or pen for the chosen minutes -> back to the login screen (owner and customer side) */
let lastTouch = Date.now();
["pointerdown", "keydown", "wheel", "touchstart"].forEach(ev => document.addEventListener(ev, () => { lastTouch = Date.now(); }, { capture: true, passive: true }));
setInterval(() => { const m = Number(Q.autolock); if (!m || location.hash.startsWith("#/login") || !window.COS.D.session) return;
  if (Date.now() - lastTouch >= m * 60000) { close(); location.hash = "#/login"; } }, 15000);
/* ---------- real Wi-Fi on the tablet (fieldd -> NetworkManager) ---------- */
const H = { "X-Field": "1" };
const wget = a => fetch(`/api/wifi?a=${a}`, { headers: H }).then(r => r.json()).catch(() => ({ ok: false, error: "The tablet service didn't answer." }));
const wpost = body => fetch("/api/wifi", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(r => r.json()).catch(() => ({ ok: false, error: "The tablet service didn't answer." }));
const bars = s => `<span class="wbars" title="${s}%">${[25, 50, 75].map((t, i) => `<i class="${s >= t || i === 0 ? "on" : ""}" style="height:${6 + i * 4}px"></i>`).join("")}</span>`;
async function wifiReal(d, quick) {
  const box = $("#wifibox", d); if (!box) return;
  if (!Q.wifi || Q.airplane) { box.innerHTML = `<p class="sub">Wi-Fi is off. Turn it on above to see networks.</p>`; return; }
  box.innerHTML = `<p class="sub">Looking for networks...</p>`;
  const res = await wget(quick ? "list&v=cached" : "list");
  if (!$("#wifibox", d)) return;
  if (!res.ok) { box.innerHTML = `<p class="note">${esc(res.error || "Couldn't read the networks.")}</p><button class="btn small ghost" id="wrescan">Try again</button>`;
    $("#wrescan", d).onclick = () => wifiReal(d); return; }
  const nets = res.networks || [];
  box.innerHTML = `<div class="list wlist">${nets.map((n, i) => `<button class="row tap wnet ${n.connected ? "on" : ""}" data-i="${i}">
      ${ic("wifi")}<span class="grow"><b>${esc(n.ssid)}</b><span class="sub">${n.connected ? "Connected" : n.saved ? "Saved" : n.secure ? "Password needed" : "Open network"}</span></span>
      ${n.secure ? `<span title="Secured">&#128274;</span>` : ""}${bars(n.signal)}</button>`).join("") || `<div class="row sub">No networks found.</div>`}</div>
    <div id="wform"></div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn small ghost" id="wrescan">Rescan</button><button class="btn small ghost" id="whidden">Other network...</button></div>`;
  $("#wrescan", d).onclick = () => wifiReal(d);
  $("#whidden", d).onclick = () => form(d, null);
  $$(".wnet", d).forEach(b => b.onclick = () => { const n = nets[+b.dataset.i];
    if (n.connected) return form(d, n, true);
    if (n.saved || !n.secure) return join(d, { action: "connect", ssid: n.ssid });
    form(d, n); });
}
function form(d, n, connected) {
  const f = $("#wform", d);
  if (connected) {
    f.innerHTML = `<div class="card wcard"><b>${esc(n.ssid)}</b> is connected.<div style="display:flex;gap:8px;margin-top:8px"><button class="btn small danger" id="wforget">Forget this network</button><button class="btn small ghost" id="wcancel">Close</button></div></div>`;
    $("#wforget", d).onclick = async () => { await wpost({ action: "forget", ssid: n.ssid }); toast(`Forgot ${n.ssid}`); wifiReal(d); };
  } else {
    f.innerHTML = `<div class="card wcard">${n ? `<b>${esc(n.ssid)}</b>` : `<label class="f">Network name<input id="wssid" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`}
      <label class="f">Password<input id="wpw" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <label class="switch">Show password<input type="checkbox" id="wshow"></label>
      <div id="werr" class="note" hidden></div>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="btn green" id="wgo">Connect</button><button class="btn ghost" id="wcancel">Cancel</button></div></div>`;
    $("#wshow", d).onchange = e => { $("#wpw", d).type = e.target.checked ? "text" : "password"; };
    $("#wgo", d).onclick = () => { const ssid = n ? n.ssid : $("#wssid", d).value.trim(), pw = $("#wpw", d).value;
      if (!ssid) { toast("Type the network name"); return; }
      join(d, { action: "connect", ssid, password: pw, hidden: !n }); };
    setTimeout(() => ($("#wssid", d) || $("#wpw", d)).focus(), 50);
  }
  $("#wcancel", d).onclick = () => { f.innerHTML = ""; };
}
async function join(d, req) {
  const f = $("#wform", d);
  if (f) f.innerHTML = `<div class="card wcard"><div class="field-spin small"></div> Connecting to <b>${esc(req.ssid)}</b>...</div>`;
  const r = await wpost(req);
  if (r.ok) { toast(`Connected to ${req.ssid}`); Q.net = req.ssid; keep(); if (window.COS.netUI) window.COS.netUI(); wifiReal(d, true); return; }
  if (!f || !$("#wifibox", d)) { toast(r.error || "Wi-Fi didn't connect"); return; }
  form(d, req.hidden ? null : { ssid: req.ssid, secure: true });
  if (req.hidden && $("#wssid", d)) $("#wssid", d).value = req.ssid;
  const e = $("#werr", d); e.hidden = false; e.textContent = r.error || "Wi-Fi didn't connect.";
}
window.COS.wifiPanel = () => panel("wifi", document.body.classList.contains("portal") ? true : (location.hash.startsWith("#/login") ? "login" : false));
window.COS.radioOff = () => Q.airplane || Q.wifi === false;   // mock-up: Wi-Fi off / airplane mode = offline
window.COS.afterShell = bar;
window.COS.afterLogin = loginBar;
})();
