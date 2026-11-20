/* Field OS mock-up: one small hash router + one function per screen.
   Screens only read/write the D object, so they can later be pointed at the real local database (fieldd).
   Tools (calculator, notepad, room sketch, camera, recorder, backups) live in tools.js and register into COS.S. */
(() => {
"use strict";
const D = window.FIELD;
const KEY = "field-os-mock-v5";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const first = name => String(name).split(" ")[0];
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* ---------- saved state (mock: browser storage; tablet: local database) ---------- */
const SAVED = ["customers", "jobs", "prospects", "signing", "uploads", "vault", "materials", "priceDate", "books", "qty", "session", "portal",
  "emailTemplates", "notes", "sketches", "vaultHash", "recordings", "schedule", "rates", "outbox", "partners", "inbox", "libVersion", "libPending", "ownerPinHash", "ownerPassHash", "kbd", "vaultTries", "vaultLocked"];
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) Object.assign(D, s); } catch (e) { /* storage blocked: defaults */ } }
function save() { try { const o = {}; SAVED.forEach(k => { if (D[k] !== undefined) o[k] = D[k]; }); localStorage.setItem(KEY, JSON.stringify(o)); }
  catch (e) { toast("Storage full: make an offline backup in Apps"); }
  if (window.COS && window.COS.afterSave) window.COS.afterSave(); }      // tablet: sync.js copies the change into the database
load();
/* ---------- library: repair research + store price sheets (web/js/library.js, web/js/pricebook.js) ---------- */
const LIB = window.FIELD_LIBRARY, PB = window.FIELD_PRICEBOOK;
const priceLabel = d => { const t = new Date(d + "T12:00:00"); return isNaN(t) ? d : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
function applyLibraryPrices() {            // keeps her quantities and any product or price she picked by hand
  const old = new Map((D.materials || []).map(m => [m.id, m]));
  D.materials = LIB.materials.map(m => { const o = old.get(m.id); const n = JSON.parse(JSON.stringify(m));
    if (o && o.picked) o.picked.forEach((pk, si) => { if (pk) { n.prices[si] = o.prices[si]; n.match[si] = o.match[si]; } });
    if (o && o.picked) n.picked = o.picked; return n; });
  D.priceDate = priceLabel(LIB.priceDate) + " store price sheets (Supplier A Brookside, Supplier B Riverton)";
  D.libVersion = LIB.version; D.libPending = null;
}
if (LIB) {
  const have = new Set(D.repairs.map(r => r.name.toLowerCase()));
  LIB.repairs.forEach(r => { if (!have.has(r.name.toLowerCase())) D.repairs.push({ ...r, links: [
    { label: "Video how-to", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent("how to " + r.name) },
    { label: "Step-by-step guide", url: "https://duckduckgo.com/?q=" + encodeURIComponent("how to " + r.name + " step by step guide") }] }); });
  if (!D.libVersion || !(D.materials || []).some(m => String(m.id).startsWith("lib-"))) { applyLibraryPrices(); save(); }   // first time: the owner asked for these sheets
  else if (D.libVersion !== LIB.version) D.libPending = LIB.version;           // later sheets wait for her tap on Update prices
}
D.materials.forEach(m => { m.prices = m.prices.slice(0, D.stores.length); });   // older saves had a third store
D.qty = D.qty || {}; D.session = D.session || null; D.portal = D.portal || { customer: null }; D.notes = D.notes || [];
D.outbox = D.outbox || []; D.sketches = D.sketches || []; D.recordings = D.recordings || []; D.uploads = D.uploads || []; D.vault = D.vault || [];
/* records from the other device / the cloud drive / an older save may miss a list a screen expects: fill them in (never crash) */
function fixShapes() {
  (D.jobs || []).forEach(j => { if (!j || typeof j !== "object") return;
    ["docs", "measurements", "notes", "photos", "repairs", "time"].forEach(k => { if (!Array.isArray(j[k])) j[k] = typeof j[k] === "string" && j[k] ? [{ text: j[k], when: j.created || "" }] : []; });
    if (typeof j.stage !== "number") j.stage = Number(j.stage) || 0; if (j.title == null) j.title = ""; if (j.address == null) j.address = ""; });
  (D.customers || []).forEach(c => { if (c && typeof c === "object") ["name", "phone", "email", "address"].forEach(k => { if (c[k] == null) c[k] = ""; }); });
  ["customers", "jobs", "prospects", "signing", "uploads", "partners", "inbox", "outbox", "notes", "vault", "schedule"].forEach(k => { if (D[k] != null && !Array.isArray(D[k])) D[k] = []; });
}
fixShapes();
let vaultOpen = false;                       // the Private tab re-locks every time the page loads
const hist = { owner: [], portal: [] };      // separate back-arrow history: the customer side can never step back into the owner side
let goingBack = false;

/* ---------- icons ---------- */
const P = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  cal: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2",
  map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
  assistant: "M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1",
  users: "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  question: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  alert: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v6M12 17h.01",
  check: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12l3 3 5-6",
  clockdoc: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5M13 2v6h6v2M17 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM17 14.5V17l1.8 1.2",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z",
  nails: "M3 3h8v2.5H3zM6 5.5h2V16l-1 5-1-5zM13 6h8v2.5h-8zM16 8.5h2V17l-1 4-1-4z",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM20 17v4H6.5",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM10 11V9a2 2 0 0 1 4 0v2M9 11h6v4H9z",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  door: "M14 3H6a1 1 0 0 0-1 1v17h10V4a1 1 0 0 0-1-1zM3 21h18M11.5 12.5h.01M15 5h3a1 1 0 0 1 1 1v15",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4", flash: "M8 2h8v5l-2 3v12h-4V10L8 7zM12 13v2",
  bolt: "M13 2L3 14h8l-1 8 10-12h-8z", card: "M2 5h20v14H2zM2 10h20M6 15h4", keyboard: "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  pin: "M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", battery: "M2 7h17v10H2zM22 11v2M5 10v4M9 10v4",
  monitor: "M2 4h20v13H2zM8 21h8M12 17v4", finger: "M12 4a7 7 0 0 0-7 7v3M19 11a7 7 0 0 0-3.5-6M9 12a3 3 0 0 1 6 0v3a6 6 0 0 1-1 3M12 12v4a8 8 0 0 1-2 5M6 17a10 10 0 0 0 1 3M17 15a12 12 0 0 1-1 5",
  key: "M15 7a4 4 0 1 0-3.9 5L4 19v2h3v-2h2v-2h2l1.3-1.3A4 4 0 0 0 15 7zM16 7h.01", edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  plus: "M12 5v14M5 12h14", lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  browser: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 8h9.2M8.5 14L3.9 6.1M15.5 14l-4.6 7.9",
  term: "M3 4h18v16H3zM7 9l3 3-3 3M13 15h4", doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01", wifi: "M5 12.6a10 10 0 0 1 14 0M1.4 9a15 15 0 0 1 21.2 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01", dollar: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15.5 8.5h-5a1.75 1.75 0 0 0 0 3.5h3a1.75 1.75 0 0 1 0 3.5h-5M12 6v12",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9", back: "M19 12H5M12 19l-7-7 7-7",
  refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15",
  copy: "M9 9h13v13H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  ruler: "M21.3 8.7l-6-6L2.7 15.3l6 6zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2",
  calc: "M5 2h14v20H5zM8 5h8v4H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01",
  note: "M4 3h16v18H4zM8 8h8M8 12h8M8 16h5", mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  sketch: "M3 3h18v18H3zM3 12h7v9M10 3v5M14 12h7M14 12v3", folder: "M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  cloud: "M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10zM12 12v6M9 15l3-3 3 3", zip: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 4h2M10 7h2M10 10h2M10 13h2v3h-2z",
  id: "M3 5h18v14H3zM8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16a3 3 0 0 1 6 0M14 9h4M14 13h4",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6", upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2M9 6h6",
};
const ic = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || P.file}"/></svg>`;

/* ---------- offline: everything works without internet except the few things marked "needs-net" ---------- */
const isOnline = () => navigator.onLine && !(window.COS && window.COS.radioOff && window.COS.radioOff());
function netUI() {
  const on = isOnline(); document.body.classList.toggle("offline", !on);
  const tag = document.getElementById("nettag"); if (tag) tag.hidden = on;
  if (on && D.outbox.length && !(window.COS && COS.onTablet)) { const n = D.outbox.length; D.outbox = []; save(); toast(`${n} queued email${n === 1 ? "" : "s"} sent (mock)`); }
  /* on the tablet queued emails stay in the outbox until email is connected (Emails > Connect email); nothing pretends to send */
}
window.addEventListener("online", netUI); window.addEventListener("offline", netUI);
/* Loading graphic: the logo mark, filled with a green -> gold gradient that loops */
function loading(on, msg = "Loading...") { let el = document.getElementById("loader");
  if (!on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "loader"; el.className = "loader"; document.body.append(el); }
  el.innerHTML = `<div class="loadbox"><div class="field-spin" role="img" aria-label="Loading"></div><b>${esc(msg)}</b></div>`; }
const withLoading = (msg, ms, fn) => { loading(true, msg); setTimeout(() => { loading(false); fn(); }, ms); };
const LOGO = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20512%20512%22%20width%3D%22512%22%20height%3D%22512%22%3E%3Ccircle%20cx%3D%22256%22%20cy%3D%22256%22%20r%3D%22256%22%20fill%3D%22%2309350C%22%2F%3E%3Ccircle%20cx%3D%22256%22%20cy%3D%22256%22%20r%3D%22222%22%20fill%3D%22none%22%20stroke%3D%22%23E2C45C%22%20stroke-width%3D%2218%22%2F%3E%3Cpath%20d%3D%22M186%20136H346V192H250V238H330V294H250V376H186Z%22%20fill%3D%22%23E2C45C%22%2F%3E%3C%2Fsvg%3E";   // inline logo mark (no image file)
/* Email signature: same look as the owner's email signature (logo, name, title, phone, website). Added to every email and auto-reply.
   On the tablet emails go out through the business mailbox owner@example.com, and the logo comes from example.com/email-logo.png. */
const FROM = "Alex Morgan <owner@example.com>";
const signature = () => `<table class="sig" cellpadding="0" cellspacing="0"><tr><td class="sigimg"><img src="${LOGO}" width="80" height="80" alt="Acme Home Services"></td>
  <td class="sigtxt"><div class="signame">Alex Morgan</div><div>Owner, Acme Home Services LLC</div>
  <div>(555) 555-0100 &middot; <a href="https://example.com">example.com</a></div></td></tr></table>`;
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }

/* ---------- lookups ---------- */
const cust = id => D.customers.find(c => c.id === id);
const shown = () => D.customers.filter(c => !c.hidden);
const job = id => D.jobs.find(j => j.id === id);
const repair = id => D.repairs.find(r => r.id === id);
const jobsOf = cid => D.jobs.filter(j => j.customer === cid);
const liveJobs = () => D.jobs.filter(j => cust(j.customer) && !cust(j.customer).hidden);
const avg = m => { const p = m.prices.filter(x => x > 0); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0; };
const jobMaterialRange = j => j.repairs.map(repair).filter(Boolean).reduce((a, r) => [a[0] + r.cost[0], a[1] + r.cost[1]], [0, 0]);
async function sha(text) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
function thumb(file) {   // small copy of a photo so the mock-up can keep it (the tablet keeps the full file on disk)
  return new Promise(res => { if (!file.type.startsWith("image/")) return res(""); const img = new Image(); img.onload = () => {
    const c = document.createElement("canvas"), k = 220 / Math.max(img.width, img.height); c.width = img.width * k; c.height = img.height * k;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", .7)); URL.revokeObjectURL(img.src); }; img.onerror = () => res(""); img.src = URL.createObjectURL(file); }); }
async function addUploads(files, customer, jobId, from) {
  for (const f of files) D.uploads.push({ id: uid("u"), customer, job: jobId || "", name: f.name, kind: f.type.startsWith("image/") ? "photo" : "document", when: today(), from, hidden: false, thumb: await thumb(f) });
  save();
}

/* ---------- navigation + shell ---------- */
const OWNER_NAV = [["home", "Home", "home"], ["customers", "Customers", "users"], ["prospects", "Prospects", "question"], ["schedule", "Schedule", "cal"], ["sign", "Sign & Send", "pen"],
  ["emails", "Emails", "mail"], ["partners", "Partners", "link"], ["rates", "Rates", "tag"], ["books", "Books", "book"], ["repairs", "Repair Guide", "tool"], ["materials", "Materials", "nails"],
  ["utilities", "Utilities", "flash"], ["apps", "Apps", "grid"], ["files", "Local Files", "folder"], ["info", "More info", "info"], ["private", "Private", "shield"]];
const PORTAL_NAV = [["portal", "Welcome", "home"], ["portal/sign", "Sign", "pen"], ["portal/photos", "Photos", "camera"], ["portal/invoices", "Invoices", "dollar"], ["portal/docs", "Documents", "file"]];
const SECTION = { customer: "customers", job: "customers", completed: "home", deleted: "customers", app: "utilities", downloads: "files", update: "utilities", partner: "partners", hardware: "utilities", gallery: "utilities", tool: "utilities" };

function shell(route, body, portal = false) {
  const nav = portal ? PORTAL_NAV : OWNER_NAV;
  let top = portal ? route.split("/").slice(0, 2).join("/") : route.split("/")[0];
  top = SECTION[top] || top;
  document.body.className = portal ? "portal" : "";
  const c = portal && cust(D.portal.customer);
  $("#app").innerHTML = `<div class="shell">
    <header class="topbar"><div class="vbrand" aria-label="Field OS">${[..."FIELD"].map(l => `<span>${l}</span>`).join("")}<span class="gap">O</span><span>S</span></div>
      <a class="btn small ghost light exitbtn" href="#/login">${ic("door")} ${portal ? "Done" : "EXIT"}</a>
      <button class="qtoggle" id="qtoggle" aria-expanded="false" aria-label="Quick settings" title="Quick settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="spacer"></div><img class="hanglogo" src="${LOGO}" alt="Acme Home Services"><div class="spacer"></div>
      <div class="rightcol"><span class="clock" id="clock"></span>
        <div class="r2"><span class="nettag" id="nettag" hidden>Offline</span><span class="whotag ${portal ? "cust" : ""}">${portal ? `${ic("users")} ${c ? esc(first(c.name)) : "Customer"}` : `${ic("lock")} Owner`}</span><span class="batt" id="batt" title="Battery"></span></div></div></header>
    <nav class="rail"><div class="links">${nav.map(([r, label, i]) => `<a href="#/${r}" class="${r === top ? "on" : ""}">${ic(i)}<span>${label}</span></a>`).join("")}</div></nav>
    <main class="main${route === "home" || route === "portal" ? " homepage" : ""}${route === "home" ? " greet" : ""}"><button class="backbtn" id="back" aria-label="Back">${ic("back")} Back</button>${body}</main></div>`;
  $("#back").onclick = goBack;
  tick(); battery(); netUI();
  if (window.COS && window.COS.afterShell) window.COS.afterShell(portal);   // quick settings (quick.js)
}
function goBack() {
  const side = D.session === "customer" ? "portal" : "owner", h = hist[side];
  h.pop(); goingBack = true;
  location.hash = h.length ? h[h.length - 1] : (side === "portal" ? "#/portal" : "#/home");
}
function tick() { const c = $("#clock"); if (c) c.textContent = new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
setInterval(tick, 30000);
async function battery() {   // laptop/tablet battery in the browser; on the tablet fieldd reads it from UPower
  const el = $("#batt"); if (!el) return;
  const draw = (lvl, chg) => { const pct = Math.round(lvl * 100);
    el.innerHTML = `<svg viewBox="0 0 30 16" class="battsvg"><rect x="1" y="1" width="24" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="26" y="5" width="3" height="6" rx="1" fill="currentColor"/>
      <rect x="4" y="4" width="${Math.max(1, 18 * lvl)}" height="8" rx="1" fill="${pct <= 20 ? "#F2A08F" : "currentColor"}" opacity="${chg ? .55 : 1}"/>
      ${chg ? `<path d="M15 -1 L8 9 H13 L11 17 L19 6 H14 Z" fill="#E2C45C" stroke="#09350C" stroke-width="1.2" stroke-linejoin="round"/>` : ""}</svg>${pct}%`;
    el.title = `Battery ${pct}%${chg ? ", charging" : ""}`; };
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); draw(b.level, b.charging); b.onlevelchange = b.onchargingchange = () => draw(b.level, b.charging); return; } } catch (e) { /* no battery API */ }
  draw(.85, false);
}

/* ================= SCREENS ================= */
const S = {};

S.login = () => {
  document.body.className = "";
  $("#app").innerHTML = `<div class="login"><div class="time" id="ltime"></div><div class="box">
    <div class="brandcol"><img src="${LOGO}" alt="Acme Home Services" class="biglogo"><h1>Field OS</h1><div class="tag">Every job, one tablet.</div></div>
    <div class="formcol"><div class="users">
      <button class="user" data-u="owner"><div class="avatar">${ic("lock")}</div><b>Owner</b><span>PIN or password</span></button>
      <button class="user" data-u="customer"><div class="avatar" style="background:var(--gold)">${ic("users")}</div><b>Customer</b><span>Sign, upload photos, invoices</span></button>
    </div>
    <div id="pw" hidden><div class="seg" id="lmode" style="margin-bottom:10px"><button class="on" data-m="pin">PIN</button><button data-m="pass">Password</button></div>
      <div id="pinbox"><div class="pindots" id="pdots"></div>
        <div class="pinpad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].map(k => `<button class="btn ghost" data-pin="${k}">${k === "del" ? "&#9003;" : k === "clr" ? "Clear" : k}</button>`).join("")}</div></div>
      <div id="passbox" hidden><label class="f" style="text-align:left">Owner password<input type="password" class="in" id="pwd" placeholder="Enter password" autocomplete="current-password"></label></div>
      <button class="btn green wide" id="go">Unlock</button>
      <button class="linkbtn" id="forgot">Forgot password?</button>
      <div id="reset" hidden class="card" style="text-align:left;margin-top:10px"><b>Send a password reset to:</b>
        <div style="display:grid;gap:8px;margin-top:8px"><button class="btn ghost" data-r="email">${ic("mail")} Email ow&bull;&bull;&bull;@example.com</button>
        <button class="btn ghost" data-r="text">${ic("mail")} Text the phone ending in &bull;&bull;00</button></div><div id="rmsg" class="note" hidden style="margin-top:8px"></div></div></div>
    <div id="cust" hidden><button class="btn wide" id="goc">Enter customer area</button></div>
    </div></div></div>`;
  const t = $("#ltime"); let bootNote = ""; const upd = () => { const d = new Date(); t.innerHTML = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + `<small>${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</small>${bootNote}`; }; upd();
  if (window.COS && COS.onTablet && !COS.bootShown) fetch("/api/boot").then(r => r.json()).then(b => { COS.bootShown = true;
    const s = (b.firmware_s || 0) + (b.loader_s || 0) + (b.screen_s || 0);
    if (s) { bootNote = `<small class="bootnote">Started in ${Math.round(s)} s</small>`; upd(); } }).catch(() => {});
  $$(".user").forEach(u => u.onclick = () => { $$(".user").forEach(x => x.classList.toggle("on", x === u)); $("#pw").hidden = u.dataset.u !== "owner"; $("#cust").hidden = u.dataset.u !== "customer"; $(".login .box").classList.toggle("entering", u.dataset.u === "owner"); });
  let pin = "", mode = "pin";
  const dots = () => { $("#pdots").innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<span class="${i < pin.length ? "on" : ""}"></span>`).join(""); }; dots();
  $$("[data-pin]").forEach(b => b.onclick = () => { const k = b.dataset.pin; if (k === "clr") pin = ""; else if (k === "del") pin = pin.slice(0, -1); else if (pin.length < 8) pin += k; dots(); });
  $$("#lmode button").forEach(b => b.onclick = () => { mode = b.dataset.m; $$("#lmode button").forEach(x => x.classList.toggle("on", x === b)); $("#pinbox").hidden = mode !== "pin"; $("#passbox").hidden = mode !== "pass"; if (mode === "pass") $("#pwd").focus(); });
  $("#go").onclick = async () => { if (mode === "pin" && pin.length < 4) { toast("Enter your PIN (4 to 8 numbers)"); return; }
    if (mode === "pin" && D.ownerPinHash && await sha("field-owner-pin:" + pin) !== D.ownerPinHash) { pin = ""; dots(); toast("Wrong PIN"); return; }
    if (mode === "pass" && D.ownerPassHash && await sha("field-owner-pass:" + $("#pwd").value) !== D.ownerPassHash) { toast("Wrong password"); return; }
    withLoading("Unlocking...", 700, () => { D.session = "owner"; hist.owner = []; save(); location.hash = "#/home"; }); };
  $("#pwd").onkeydown = e => { if (e.key === "Enter") $("#go").click(); };
  $("#forgot").onclick = () => { $("#reset").hidden = !$("#reset").hidden; };
  $$("[data-r]").forEach(b => b.onclick = () => { const m = $("#rmsg"); m.hidden = false;
    m.textContent = window.COS && COS.onTablet ? "Password reset by email or text isn't connected yet. Use your PIN, or ask the assistant to reset it." : b.dataset.r === "email" ? "Reset link sent to your business email. It expires in 30 minutes (mock)." : "Reset code texted to your phone. It expires in 10 minutes (mock)."; });
  $("#goc").onclick = () => { D.session = "customer"; D.portal = { customer: null }; hist.portal = []; save(); location.hash = "#/portal/start"; };
  if (window.COS && window.COS.afterLogin) window.COS.afterLogin();   // small quick settings, lower left (quick.js)
};

S.home = () => {
  const js = liveJobs(), open = js.filter(j => j.stage < 7), done = js.filter(j => j.stage === 7).sort((a, b) => (b.completed || "").localeCompare(a.completed || ""));
  const owed = js.flatMap(j => j.docs).filter(d => d.type === "Invoice" && d.status !== "Paid").reduce((a, d) => a + d.total, 0);
  const month = today().slice(0, 7), inc = D.books.entries.filter(e => e.type === "Income" && e.date.startsWith(month)).reduce((a, e) => a + e.amount, 0);
  const newReq = D.prospects.filter(p => p.status === "New").length;
  const tiles = [["customers", "Customers", "users", `${shown().length} customers`], ["prospects", "Prospects", "question", `${newReq} new request${newReq === 1 ? "" : "s"}`], ["schedule", "Schedule", "cal", "Month calendar"],
    ["sign", "Sign & Send", "pen", `${D.signing.filter(s => s.status.startsWith("Waiting")).length} waiting`], ["emails", "Emails", "mail", "Inbox, drafts, auto-replies"],
    ["partners", "Partners", "link", `${(D.partners || []).length} partner${(D.partners || []).length === 1 ? "" : "s"}`], ["rates", "Rates & Discounts", "tag", "Your private guides"],
    ["books", "Bookkeeping", "book", "Income, expenses, export"], ["editdocs", "Edit documents", "edit", "Coming soon", true], ["repairs", "Repair Guide", "tool", `${D.repairs.length} repairs`],
    ["materials", "Materials", "nails", "Quantities + prices"], ["utilities", "Utilities", "flash", "Camera, flashlight, backups, more"], ["apps", "Apps", "grid", "Assistant, browser, payments, social"],
    ["files", "Local Files", "folder", "Documents, pictures, downloads"], ["info", "More info", "info", "Hardware, how-to guides"], ["private", "Private", "shield", ""],   // no caption on Private
    ["sync", "Phone sync", "phone", window.COS && COS.onPhone ? "Tablet, phone + cloud" : "Phone + cloud drive"]];   // added after her order (2026-11-14)
  const row = j => `<a class="row" href="#/job/${j.id}"><div class="avatar">${esc(cust(j.customer).name[0])}</div><div class="grow"><b>${esc(j.title)}</b>
    <div class="sub">${esc(cust(j.customer).name)} &middot; ${esc(j.address)}${j.completed ? ` &middot; finished ${esc(j.completed)}` : ""}</div></div><span class="pill ${j.stage === 7 ? "gray" : j.stage >= 5 ? "green" : "gold"}">${D.stages[j.stage]}</span></a>`;
  return `<div class="pagehead"><h1>Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${esc(D.owner.name)}</h1><a class="btn" href="#/customers/new">${ic("plus")} New customer</a></div>
    <div class="stats">
      <a class="statbtn" href="#/home">${ic("alert")}<b>${open.length}</b><span>Open jobs</span></a>
      <a class="statbtn" href="#/completed">${ic("check")}<b>${done.length}</b><span>Completed jobs</span></a>
      <a class="statbtn" href="#/books/entries">${ic("clockdoc")}<b class="money">${money(owed)}</b><span>Unpaid invoices</span></a>
      <a class="statbtn" href="#/books">${ic("dollar")}<b class="money">${money(inc)}</b><span>Income this month</span></a></div>
    <div class="tiles">${tiles.map(([r, b, i, s, soon]) => soon ? `<div class="tile soon" aria-disabled="true">${ic(i)}<b>${b}</b><span>${s}</span></div>` : `<a class="tile" href="#/${r}">${ic(i)}<b>${b}</b>${s ? `<span>${s}</span>` : ""}</a>`).join("")}</div>
    <div class="grid g2" style="margin-top:22px"><div><h2>Jobs in progress</h2><div class="list">${open.map(row).join("") || `<div class="row sub">None.</div>`}</div></div>
    <div><h2>Recently completed</h2><div class="list">${done.slice(0, 4).map(row).join("") || `<div class="row sub">None yet.</div>`}</div>
    <a class="btn ghost small" style="margin-top:10px" href="#/completed">All completed jobs</a></div></div>`;
};
S.completed = () => { const done = liveJobs().filter(j => j.stage === 7).sort((a, b) => (b.completed || "").localeCompare(a.completed || ""));
  return `<h1>Completed jobs</h1><div class="list">${done.map(j => `<a class="row" href="#/job/${j.id}"><div class="grow"><b>${esc(j.title)}</b><div class="sub">${esc(cust(j.customer).name)} &middot; finished ${esc(j.completed || "")}</div></div>
    <span class="money">${money(j.docs.filter(d => d.type === "Invoice").reduce((a, d) => a + d.total, 0))}</span></a>`).join("") || `<div class="row sub">None yet.</div>`}</div>`; };

S.customers = (arg) => {
  if (arg === "new") return customerForm();
  return `<div class="pagehead"><h1>Customers</h1><div class="search">${ic("search")}<input class="in" id="q" placeholder="Search name, town, phone"></div>
    <a class="btn" href="#/customers/new">${ic("plus")} New customer</a></div>
    <div class="list" id="clist">${shown().map(c => `<a class="row" href="#/customer/${c.id}" data-s="${esc((c.name + c.address + c.phone).toLowerCase())}">
      <div class="avatar">${esc(c.name[0])}</div><div class="grow"><b>${esc(c.name)}</b>${c.readded ? `<b class="readd" title="Re-added from Private">*</b>` : ""}<div class="sub">${esc(c.address)} &middot; ${esc(c.phone)}</div></div>
      ${c.referral ? `<span class="pill gold">Referral</span>` : ""}<span class="pill green">${jobsOf(c.id).length} job${jobsOf(c.id).length === 1 ? "" : "s"}</span></a>`).join("")}</div>`;
};
S.customers.after = () => { const q = $("#q"); if (q) q.oninput = () => $$("#clist .row").forEach(r => r.hidden = !r.dataset.s.includes(q.value.toLowerCase())); bindForm(); };

function customerForm(c = {}) {
  return `<h1>${c.id ? "Edit customer" : "New customer"}</h1>
  <form class="card" id="cform" style="max-width:760px"><div class="grid g2">
    <label class="f">Full name<input name="name" required value="${esc(c.name)}"></label><label class="f">Phone<input name="phone" type="tel" value="${esc(c.phone)}"></label>
    <label class="f">Email<input name="email" type="email" value="${esc(c.email)}"></label>
    <label class="f">Preferred contact<select name="preferred">${["Text", "Call", "Email"].map(o => `<option ${c.preferred === o ? "selected" : ""}>${o}</option>`).join("")}</select></label></div>
    <label class="f">Address<input name="address" value="${esc(c.address)}"></label>
    <label class="check"><input type="checkbox" name="referral" ${c.referral ? "checked" : ""}> Came from a referral</label>
    <div class="grid g2"><label class="f">Referring partner<select name="partner"><option value="">Not a partner</option>${(D.partners || []).map(p => `<option value="${p.id}" ${c.partner === p.id ? "selected" : ""}>${esc(p.business)}</option>`).join("")}</select></label>
    <label class="f">Referred by (anyone else)<input name="referredBy" value="${esc(c.referredBy)}"></label></div>
    <label class="f">Notes<textarea name="notes" rows="3">${esc(c.notes)}</textarea></label>
    <input type="hidden" name="id" value="${esc(c.id || "")}"><button class="btn green">${ic("save")} Save customer</button></form>`;
}
function bindForm() {
  const f = $("#cform"); if (!f) return;
  f.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); v.referral = !!f.referral.checked || !!v.partner;
    let c = v.id && cust(v.id); if (c) Object.assign(c, v); else { c = { ...v, id: uid("c"), since: today() }; D.customers.push(c); }
    save(); toast("Customer saved"); location.hash = "#/customer/" + c.id; };
}

S.customer = (id, sub) => {
  const c = cust(id); if (!c || c.hidden) return `<p>Customer not found.</p>`;
  if (sub === "edit") return customerForm(c);
  const js = jobsOf(id), L = c.license || {}, ups = D.uploads.filter(u => u.customer === id && !u.hidden);
  return `<div class="pagehead"><h1>${esc(c.name)}${c.readded ? `<b class="readd" title="Re-added from Private">*</b>` : ""}</h1><a class="btn ghost" href="#/customer/${id}/edit">Edit</a><button class="btn" id="newjob">${ic("plus")} New job</button>
    <button class="btn green" id="toportal">${ic("users")} Open customer side</button></div>
  <div class="grid g2"><div class="card"><h3>Contact</h3><dl class="kv">
    <dt>Phone</dt><dd><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>${window.COS && COS.onPhone && c.phone ? ` &middot; <a href="sms:${esc(c.phone)}">Text</a>` : ""}</dd><dt>Email</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd>
    <dt>Address</dt><dd>${esc(c.address)}</dd><dt>Prefers</dt><dd>${esc(c.preferred)}</dd><dt>Customer since</dt><dd>${esc(c.since)}</dd></dl>
    <label class="check" style="margin-top:6px"><input type="checkbox" id="ref" ${c.referral ? "checked" : ""}> Referral ${c.partner && COS.partner(c.partner) ? `<a class="pill gold" href="#/partner/${c.partner}">Partner: ${esc(COS.partner(c.partner).business)}</a>` : c.referredBy ? `<span class="sub" style="font-weight:400">(${esc(c.referredBy)})</span>` : ""}</label>
    ${c.notes ? `<div class="note" style="margin-top:8px">${esc(c.notes)}</div>` : ""}</div>
    <div class="card"><h3>${ic("id")} Driver's license / ID</h3><div class="grid" style="grid-template-columns:150px 1fr;align-items:start">
      <div class="ph lic" id="licph" ${L.photo ? `style="background-image:url(${L.photo})"` : ""}>${L.photo ? "" : "No photo yet"}</div>
      <div><div class="grid g2" style="gap:8px"><label class="f">License number<input id="lno" value="${esc(L.number)}"></label><label class="f">State<input id="lst" value="${esc(L.state)}"></label>
        <label class="f">Expires<input id="lex" type="date" value="${esc(L.expires)}"></label></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost small">${ic("camera")} Photo of license<input type="file" id="lphoto" accept="image/*" capture="environment" hidden></label>
        <button class="btn small green" id="lsave">${ic("save")} Save</button></div></div></div>
      <p class="sub" style="margin:6px 0 0">Owner only. Never shown on the customer side.</p></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Jobs (${js.length})</h3><div class="list">${js.map(j => `<a class="row" href="#/job/${j.id}"><div class="grow"><b>${esc(j.title)}</b>
      <div class="sub">Started ${esc(j.created)} &middot; ${j.photos.length} photos &middot; ${j.docs.length} documents</div></div><span class="pill ${j.stage === 7 ? "gray" : "green"}">${D.stages[j.stage]}</span></a>`).join("") || `<div class="row sub">No jobs yet.</div>`}</div></div>
    <div class="card"><h3>${ic("upload")} Customer uploads (${ups.length})</h3><div class="list">${ups.map(u => `<div class="row">${u.thumb ? `<div class="mini" style="background-image:url(${u.thumb})"></div>` : `<div class="mini">${ic(u.kind === "photo" ? "camera" : "file")}</div>`}
      <div class="grow"><b>${esc(u.name)}</b>${u.readded ? `<b class="readd" title="Re-added from Private">*</b>` : ""}<div class="sub">${esc(u.kind)} &middot; ${esc(u.when)} &middot; from ${esc(u.from)}</div></div>
      <button class="btn small danger" data-delup="${u.id}">${ic("trash")} Delete</button></div>`).join("") || `<div class="row sub">Nothing uploaded yet.</div>`}</div></div></div>
  <div style="margin-top:22px;text-align:right"><button class="btn danger" id="delcust">${ic("trash")} Delete customer</button></div>`;
};
S.customer.after = (id) => {
  const c = cust(id); if (!c) return; bindForm();
  const on = (s, ev, fn) => { const el = $(s); if (el) el[ev] = fn; };
  on("#ref", "onchange", () => { c.referral = $("#ref").checked; save(); toast(c.referral ? "Marked as referral" : "Referral removed"); });
  on("#newjob", "onclick", () => { const j = { id: uid("j"), customer: id, title: "New job", stage: 0, created: today(), address: c.address, details: "", repairs: [], measurements: [], photos: [], notes: [], docs: [], time: [] };
    D.jobs.push(j); save(); location.hash = "#/job/" + j.id; });
  on("#toportal", "onclick", () => { D.session = "customer"; D.portal = { customer: id }; hist.portal = []; save(); location.hash = "#/portal/start"; });
  on("#lphoto", "onchange", async e => { const t = await thumb(e.target.files[0]); c.license = { ...(c.license || {}), photo: t }; save(); route(); toast("License photo saved"); });
  on("#lsave", "onclick", () => { c.license = { ...(c.license || {}), number: $("#lno").value, state: $("#lst").value, expires: $("#lex").value }; save(); toast("License info saved"); });
  $$("[data-delup]").forEach(b => b.onclick = () => { const u = D.uploads.find(x => x.id === b.dataset.delup); u.hidden = true;
    D.vault.push({ kind: "upload", id: u.id, label: `${u.name} (${c.name})`, when: today() }); save(); location.hash = "#/deleted/upload"; });
  on("#delcust", "onclick", () => { c.hidden = true; D.vault.push({ kind: "customer", id: c.id, label: c.name, when: today() }); save(); location.hash = "#/deleted/entry"; });
};
S.deleted = (kind) => `<div class="card done-card">${ic("check", "i big")}<h1>${kind === "upload" ? "Upload deleted" : "Entry deleted"}</h1>
  <p class="sub">${kind === "upload" ? "The upload" : "The customer"} has been removed.</p><a class="btn green" href="#/customers">Back to customers</a></div>`;

S.job = (id, tab = "overview") => {
  const j = job(id); if (!j || !cust(j.customer) || cust(j.customer).hidden) return `<p>Job not found.</p>`; const c = cust(j.customer);
  const tabs = [["overview", "Overview"], ["repairs", "Repairs"], ["measure", "Measurements"], ["photos", "Photos"], ["docs", "Documents"], ["notes", "Notes"], ["time", "Time"]];
  const [lo, hi] = jobMaterialRange(j); const ups = D.uploads.filter(u => u.job === id && !u.hidden);
  let body = "";
  if (tab === "overview") body = `<div class="stage">${D.stages.map((s, i) => `<span class="${i < j.stage ? "done" : i === j.stage ? "now" : ""}">${s}</span>`).join("")}</div>
    <div class="grid g2"><div class="card"><h3>Job details</h3><label class="f">Title<input class="in" id="jt" value="${esc(j.title)}"></label>
      <label class="f">What needs doing<textarea class="in" id="jd" rows="4">${esc(j.details)}</textarea></label>
      <label class="f">Stage<select class="in" id="js">${D.stages.map((s, i) => `<option value="${i}" ${i === j.stage ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      <button class="btn green" id="jsave">${ic("save")} Save</button></div>
      <div class="card"><h3>At a glance</h3><dl class="kv"><dt>Customer</dt><dd><a href="#/customer/${c.id}">${esc(c.name)}</a></dd><dt>Address</dt><dd>${esc(j.address)}</dd>
        <dt>Repairs</dt><dd>${j.repairs.length}</dd><dt>Materials est.</dt><dd class="money">${money(lo)} - ${money(hi)}</dd><dt>Photos</dt><dd>${j.photos.length + ups.length}</dd><dt>Documents</dt><dd>${j.docs.length}</dd></dl>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="#/job/${id}/docs">${ic("file")} Make a document</a><a class="btn ghost" href="#/emails/${id}">${ic("mail")} Email customer</a></div></div></div>`;
  if (tab === "repairs") body = `<div class="card"><h3>Repairs on this job</h3><div class="list">${j.repairs.map(repair).filter(Boolean).map(r => `<div class="row"><div class="grow"><b>${esc(r.name)}</b>
      <div class="sub">${esc(r.desc)}</div></div><span class="pill ${r.size === "small" ? "green" : r.size === "medium" ? "gold" : "red"}">${r.size}</span><span class="money">${money(r.cost[0])} - ${money(r.cost[1])}</span>
      <button class="btn small ghost" data-rm="${r.id}">Remove</button></div>`).join("") || `<div class="row sub">No repairs yet.</div>`}</div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><select class="in" id="addr" style="max-width:420px">${D.repairs.map(r => `<option value="${r.id}">${esc(r.name)} (${r.size})</option>`).join("")}</select>
      <button class="btn" id="addrb">${ic("plus")} Add repair</button></div><p class="sub" style="margin-top:10px">Materials estimate (no labor): <b class="money">${money(lo)} - ${money(hi)}</b></p></div>`;
  if (tab === "measure") body = `<div class="card"><h3>Measurements</h3><table class="t"><thead><tr><th>What</th><th>Measurement</th></tr></thead><tbody>${j.measurements.map(m => `<tr><td>${esc(m.what)}</td><td>${esc(m.value)}</td></tr>`).join("") || `<tr><td colspan="2" class="sub">None yet.</td></tr>`}</tbody></table>
      <div class="grid g3" style="margin-top:12px"><input class="in" id="mw" placeholder="What (e.g. Kitchen wall)"><input class="in" id="mv" placeholder="Measurement (e.g. 10 ft x 8 ft)"><button class="btn" id="mb">${ic("ruler")} Add</button></div>
      <a class="btn ghost small" style="margin-top:10px" href="#/app/sketch/${id}">${ic("sketch")} Sketch the room</a></div>`;
  if (tab === "photos") body = `<div class="card"><div class="pagehead"><h3 style="flex:1;margin:0">Photos</h3>
      <label class="btn">${ic("camera")} Take / upload photo<input type="file" id="ph" accept="image/*" capture="environment" multiple hidden></label></div>
      <div class="photos" id="phs">${j.photos.map(p => `<div class="ph">${esc(p)}</div>`).join("")}${ups.filter(u => u.kind !== "document").map(u => `<div><div class="ph" ${u.thumb ? `style="background-image:url(${u.thumb})"` : ""}>${u.thumb ? "" : esc(u.kind === "audio" ? "Recording" : u.kind === "video" ? "Video" : u.name)}<span class="phtag">${esc(u.from)}</span></div>
        <label class="check small"><input type="checkbox" data-mshare="${u.id}" ${u.shared ? "checked" : ""}> Customer can see</label></div>`).join("")}</div>
      <a class="btn ghost small" style="margin-top:10px" href="#/gallery">Open Gallery</a>
      <p class="mock" style="margin-top:12px">On the tablet this opens the built-in camera; every photo is kept in this job's folder.</p></div>`;
  if (tab === "docs") body = `<div class="card"><h3>Documents</h3><div class="list">${j.docs.map((d, i) => `<div class="row"><div class="grow"><b>${esc(d.type)} ${esc(d.no)}</b><div class="sub">${d.total ? money(d.total) : ""}</div></div>
      <label class="check small"><input type="checkbox" data-share="${i}" ${d.shared ? "checked" : ""}> Show to customer</label>
      <span class="pill ${d.status === "Paid" || d.status.startsWith("Signed") ? "green" : "gold"}">${esc(d.status)}</span></div>`).join("") || `<div class="row sub">None yet.</div>`}</div>
      <h3 style="margin-top:18px">Make a new document (filled in for you)</h3><div style="display:flex;gap:10px;flex-wrap:wrap">
      <select class="in" id="dt" style="max-width:320px">${D.docTypes.map(t => `<option>${t}</option>`).join("")}</select><button class="btn" id="dmake">${ic("file")} Preview</button></div>
      <div id="dprev"></div></div>`;
  if (tab === "notes") body = `<div class="card"><h3>Notes</h3><div class="list">${j.notes.map(n => `<div class="row"><div class="grow">${esc(n.text)}<div class="sub">${esc(n.when)}</div></div></div>`).join("") || `<div class="row sub">No notes yet.</div>`}</div>
      <label class="f" style="margin-top:12px">Add a note<textarea class="in" id="nt" rows="3"></textarea></label><button class="btn" id="nb">${ic("save")} Save note</button>
      <a class="btn ghost" href="#/app/recorder/${id}">${ic("mic")} Voice note</a></div>`;
  if (tab === "time") { const hrs = j.time.reduce((a, t) => a + t.hours, 0);
    body = `<div class="card"><h3>Time on this job: ${hrs} h</h3><table class="t"><thead><tr><th>Day</th><th class="num">Hours</th></tr></thead><tbody>${j.time.map(t => `<tr><td>${t.day}</td><td class="num">${t.hours}</td></tr>`).join("") || `<tr><td colspan=2 class="sub">None yet.</td></tr>`}</tbody></table>
      <div class="grid g3" style="margin-top:12px"><input class="in" id="th" type="number" step="0.25" min="0" placeholder="Hours"><button class="btn" id="tb">Add time</button></div></div>`; }
  return `<div class="crumbs"><a href="#/customer/${c.id}">${esc(c.name)}</a> / ${esc(j.title)}</div>
    <div class="pagehead"><h1>${esc(j.title)}</h1><span class="pill green">${D.stages[j.stage]}</span></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" onclick="location.hash='#/job/${id}/${k}'">${l}</button>`).join("")}</div>${body}`;
};
S.job.after = (id) => {
  const j = job(id); if (!j) return;
  const on = (s, ev, fn) => { const el = $(s); if (el) el[ev] = fn; };
  on("#jsave", "onclick", () => { j.title = $("#jt").value; j.details = $("#jd").value; j.stage = +$("#js").value; if (j.stage === 7 && !j.completed) j.completed = today(); save(); toast("Job saved"); route(); });
  on("#addrb", "onclick", () => { j.repairs.push($("#addr").value); save(); route(); });
  $$("[data-rm]").forEach(b => b.onclick = () => { j.repairs = j.repairs.filter(r => r !== b.dataset.rm); save(); route(); });
  $$("[data-share]").forEach(b => b.onchange = () => { j.docs[+b.dataset.share].shared = b.checked; save(); toast(b.checked ? "Customer can now see it" : "Hidden from customer"); });
  on("#mb", "onclick", () => { if (!$("#mw").value) return; j.measurements.push({ what: $("#mw").value, value: $("#mv").value }); save(); route(); });
  on("#nb", "onclick", () => { if (!$("#nt").value.trim()) return; j.notes.push({ when: today(), text: $("#nt").value }); save(); route(); });
  on("#tb", "onclick", () => { const h = parseFloat($("#th").value); if (h > 0) { j.time.push({ day: today(), hours: h }); save(); route(); } });
  $$("[data-mshare]").forEach(b => b.onchange = () => { const u = D.uploads.find(x => x.id === b.dataset.mshare); u.shared = b.checked; save(); toast(b.checked ? "Customer can now see it" : "Hidden from customer"); });
  on("#ph", "onchange", async e => { await addUploads([...e.target.files], j.customer, id, "owner"); toast("Photo saved"); route(); });
  on("#dmake", "onclick", () => { $("#dprev").innerHTML = docPreview($("#dt").value, j); bindDoc(j); });
};

function nextNo(type) { const pre = { "Quote": "Q", "Work order": "WO", "Change order": "CO", "Invoice": "INV", "Final payment notice": "FPN", "Late payment reminder": "LPR", "Thank-you letter": "TY" }[type] || "DOC";
  return `${pre}-${1000 + D.jobs.flatMap(j => j.docs).length + 3}`; }
function docPreview(type, j) {
  const c = cust(j.customer), rs = j.repairs.map(repair).filter(Boolean);
  const mat = rs.reduce((a, r) => a + (r.cost[0] + r.cost[1]) / 2, 0), labor = Math.max(150, rs.length * 95), total = Math.round(mat + labor), no = nextNo(type);
  return `<div class="card" style="margin-top:14px;border:2px solid var(--green)" id="docbox" data-no="${no}" data-total="${total}">
    <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap"><div><h2 style="margin:0">${esc(type)}</h2><div class="sub">${no} &middot; ${today()}</div></div>
    <div style="text-align:right"><b>Acme Home Services LLC</b><div class="sub">Riverton, ST &middot; example.com</div></div></div><hr style="border:0;border-top:1px solid var(--line)">
    <dl class="kv"><dt>Customer</dt><dd>${esc(c.name)}</dd><dt>Address</dt><dd>${esc(j.address)}</dd><dt>Job</dt><dd>${esc(j.title)}</dd></dl>
    <table class="t" style="margin-top:10px"><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody>
    ${rs.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${money((r.cost[0] + r.cost[1]) / 2)}</td></tr>`).join("")}
    <tr><td>Labor (from your rates, editable)</td><td class="num"><input class="in qty" id="lab" type="number" value="${labor}" style="width:110px"></td></tr></tbody>
    <tfoot><tr><td>Total</td><td class="num" id="dtot">${money(total)}</td></tr></tfoot></table>
    <p class="mock" style="margin-top:10px">Filled in automatically from the customer, job, repairs and your rates. Edit anything before sending.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"><button class="btn green" id="dsave">${ic("save")} Save to job</button><button class="btn" id="dsign">${ic("pen")} Send to customer to sign</button>
    <a class="btn ghost" href="#/emails/${j.id}">${ic("mail")} Draft email</a></div></div>`;
}
function bindDoc(j) {
  const box = $("#docbox"), mat = +box.dataset.total - +$("#lab").value;
  $("#lab").oninput = () => { $("#dtot").textContent = money(mat + +$("#lab").value); };
  const add = status => { const type = $("#dt").value, total = Math.round(mat + +$("#lab").value); j.docs.push({ type, no: box.dataset.no, status, total, shared: status !== "Draft" }); return { type, total }; };
  $("#dsave").onclick = () => { add("Draft"); save(); toast("Saved to job"); route(); };
  $("#dsign").onclick = () => { const d = add("Waiting for signature");
    D.signing.unshift({ id: uid("s"), customer: j.customer, job: j.id, doc: `${d.type} ${box.dataset.no}`, total: d.total, sent: today(), status: "Waiting for signature" });
    save(); toast("Sent to the customer side to sign"); route(); };
}

S.prospects = () => `<div class="pagehead"><h1>Prospective customers</h1><a class="btn" href="#/customers/new">${ic("plus")} Add from a call or text</a></div>
  <p class="sub">Website quote and contact forms land here automatically, with your auto-reply already drafted. Turn one into a customer with one tap.
    <button class="btn small ghost needs-net" onclick="COS.onTablet && COS.mailCheck ? COS.mailCheck().then(() => location.hash === '#/prospects' && COS.route()) : COS.withLoading('Checking your inbox...', 900, () => COS.toast('No new requests (mock)'))">${ic("refresh")} Check for new requests</button></p>
  <div class="list">${D.prospects.map(p => `<div class="row"><div class="avatar" style="background:var(--gold)">${esc(p.name[0])}</div><div class="grow"><b>${esc(p.name)}</b> <span class="pill ${p.status === "New" ? "gold" : "gray"}">${esc(p.status)}</span>
    <div class="sub">${esc(p.source)} &middot; ${esc(p.received)} &middot; ${esc(p.town)}${p.photos ? ` &middot; ${p.photos} photos` : ""}</div><div>${esc(p.message)}</div></div>
    <div style="display:flex;flex-direction:column;gap:6px"><button class="btn small green" data-conv="${p.id}">Make customer</button><a class="btn small ghost" href="#/emails/p:${p.id}">Reply</a></div></div>`).join("") || `<div class="row sub">No new requests.</div>`}</div>`;
S.prospects.after = () => $$("[data-conv]").forEach(b => b.onclick = () => {
  const p = D.prospects.find(x => x.id === b.dataset.conv), c = { id: uid("c"), name: p.name, phone: p.phone, email: p.email, address: p.town + ", ST", referral: false, referredBy: "", preferred: "Email", since: today(), notes: "" };
  D.customers.push(c); D.jobs.push({ id: uid("j"), customer: c.id, title: p.message.slice(0, 40), stage: 0, created: today(), address: c.address, details: p.message, repairs: [], measurements: [], photos: [], notes: [{ when: today(), text: "From " + p.source }], docs: [], time: [] });
  D.prospects = D.prospects.filter(x => x !== p); save(); toast("Customer + job created"); location.hash = "#/customer/" + c.id; });

S.sign = () => `<h1>Sign &amp; Send</h1>
  <div class="grid g2"><div class="card"><h3>Send something to sign</h3>
    <label class="f">Customer<select class="in" id="sc">${shown().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
    <label class="f">Job<select class="in" id="sj"></select></label>
    <label class="f">Document<select class="in" id="sd">${D.docTypes.map(t => `<option>${t}</option>`).join("")}</select></label>
    <label class="f">How<select class="in" id="sh"><option>Customer signs on the tablet (customer side)</option><option id="shmail" ${isOnline() ? "" : "disabled"}>Email a signing link${isOnline() ? "" : " (needs internet)"}</option></select></label>
    <button class="btn" id="sgo">${ic("pen")} Send</button></div>
  <div class="card"><h3>Waiting and signed</h3><div class="list">${D.signing.filter(s => cust(s.customer) && !cust(s.customer).hidden).map(s => `<div class="row"><div class="grow"><b>${esc(s.doc)}</b><div class="sub">${esc(cust(s.customer).name)} &middot; sent ${esc(s.sent)}</div></div>
    <span class="pill ${s.status.startsWith("Signed") ? "green" : "gold"}">${esc(s.status)}</span></div>`).join("")}</div></div></div>`;
S.sign.after = () => {
  const fill = () => { $("#sj").innerHTML = jobsOf($("#sc").value).map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join("") || "<option value=''>No jobs</option>"; };
  $("#sc").onchange = fill; fill();
  $("#sgo").onclick = () => { D.signing.unshift({ id: uid("s"), customer: $("#sc").value, job: $("#sj").value, doc: $("#sd").value, total: 0, sent: today(), status: "Waiting for signature" }); save(); toast("Sent to the customer side"); route(); };
};
function pad(cv) { const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; const g = cv.getContext("2d"); g.scale(2, 2); g.lineWidth = 2.4; g.lineCap = "round"; g.strokeStyle = "#09350C";
  let draw = false; cv.dataset.inked = ""; const pt = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.onpointerdown = e => { draw = true; cv.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(...pt(e)); };
  cv.onpointermove = e => { if (draw) { g.lineTo(...pt(e)); g.stroke(); cv.dataset.inked = "1"; } }; cv.onpointerup = () => draw = false; }

S.repairs = () => {
  const cats = [...new Set(D.repairs.map(r => r.cat))].sort();
  return `<div class="pagehead"><h1>Repair guide</h1><div class="search">${ic("search")}<input class="in" id="rq" placeholder="Search repairs or materials"></div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="seg" id="rsize">${["All", "Small", "Medium", "Large"].map((s, i) => `<button class="${i ? "" : "on"}" data-v="${s.toLowerCase()}">${s}</button>`).join("")}</div>
  <select class="in" id="rcat" style="max-width:240px;margin:0"><option value="">All categories</option>${cats.map(c => `<option>${c}</option>`).join("")}</select></div>
  <p class="sub">${D.repairs.length} repairs. Costs are rough materials only, no labor. Plumbing and electrical items are like-for-like only; anything bigger needs a licensed trade.</p>
  <div class="grid g2" id="rlist" style="margin-top:12px">${D.repairs.map(r => `<div class="card repair ${r.size}" data-size="${r.size}" data-cat="${esc(r.cat)}" data-s="${esc((r.name + r.desc + r.materials.join(" ")).toLowerCase())}">
    <h3>${esc(r.name)}</h3><div class="meta"><span class="pill ${r.size === "small" ? "green" : r.size === "medium" ? "gold" : "red"}">${r.size}</span><span class="pill gray">${esc(r.cat)}</span>
    <span class="money"><b>${money(r.cost[0])} - ${money(r.cost[1])}</b> materials (no labor)</span></div><div>${esc(r.desc)}</div>
    <b style="display:block;margin-top:8px">Materials</b><ul>${r.materials.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
    ${r.sources && r.sources.length ? `<div class="sub" style="margin-top:6px">Background reading: ${r.sources.map(x => esc(x.title + " (" + x.where + ")")).join("; ")}</div>` : ""}
    <div class="links">${r.links.map(l => `<a class="needs-net" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &rarr;</a>`).join("")}</div></div>`).join("")}</div>`;
};
S.repairs.after = () => {
  let size = "all"; const apply = () => { const q = $("#rq").value.toLowerCase(), cat = $("#rcat").value;
    $$("#rlist .repair").forEach(el => el.hidden = !((size === "all" || el.dataset.size === size) && (!cat || el.dataset.cat === cat) && el.dataset.s.includes(q))); };
  $$("#rsize button").forEach(b => b.onclick = () => { size = b.dataset.v; $$("#rsize button").forEach(x => x.classList.toggle("on", x === b)); apply(); });
  $("#rq").oninput = apply; $("#rcat").onchange = apply;
};

S.materials = (tab = "mine") => {
  const total = D.materials.reduce((a, m) => a + avg(m) * (+D.qty[m.id] || 0), 0), cats = [...new Set(D.materials.map(m => m.cat))].sort();
  const seg = `<div class="seg" id="mtab" style="margin-bottom:12px"><button class="${tab === "mine" ? "on" : ""}" data-v="mine">My materials (${D.materials.length})</button><button class="${tab === "book" ? "on" : ""}" data-v="book">Store price lists${PB ? " (" + PB.items.length.toLocaleString() + ")" : ""}</button></div>`;
  if (tab === "book") return `<div class="pagehead"><h1>Materials</h1></div>${seg}${priceBook()}`;
  const cell = (m, si) => { const p = m.prices[si], mt = m.match && m.match[si];
    if (D.manualStores.includes(si)) return `<td class="num"><input class="in qty" type="number" min="0" step="0.01" inputmode="decimal" data-price="${m.id}" data-si="${si}" value="${p || ""}" placeholder="enter" aria-label="${esc(D.stores[si])} price"></td>`;
    return `<td class="num">${p ? money(p) : "-"}${mt ? `<div class="sub" title="${esc(mt.product)}">${esc(mt.product.length > 34 ? mt.product.slice(0, 33) + "…" : mt.product)}</div>` : ""}</td>`; };
  return `<div class="pagehead"><h1>Materials</h1><div class="search">${ic("search")}<input class="in" id="mq" placeholder="Search materials"></div>
    <button class="btn" id="upd">${ic("refresh")} ${D.libPending ? "New prices ready: tap to use them" : "Update prices now"}</button></div>${seg}
  <div class="note" style="margin-bottom:12px">Prices: <b>${esc(D.priceDate)}</b>. Regular prices, matched to the closest product in each store's sheet (the product shows under the price). They only change when you tap <b>Update prices</b>. Tap <b>Compare</b> on a row to see other products or type your own price. Type a quantity and the cost fills in.</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><label class="f" style="margin:0">Load a job's materials<select class="in" id="mjob"><option value="">Choose a job</option>${liveJobs().map(j => `<option value="${j.id}">${esc(cust(j.customer).name)}: ${esc(j.title)}</option>`).join("")}</select></label>
    <label class="f" style="margin:0">Category<select class="in" id="mcat"><option value="">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
    <button class="btn ghost" id="mclear" style="align-self:end">Clear quantities</button></div>
  <div class="tablewrap"><table class="t" id="mt"><thead><tr><th>Material</th><th>Unit</th>${D.stores.map(s => `<th class="num">${esc(s)}</th>`).join("")}<th class="num">Average</th><th class="num">Qty</th><th class="num">Cost</th></tr></thead>
  <tbody>${D.materials.map(m => `<tr class="mrow" data-id="${m.id}" data-cat="${esc(m.cat)}" data-s="${esc((m.name + m.cat).toLowerCase())}"><td><b>${esc(m.name)}</b><div class="sub">${esc(m.cat)}${m.match ? ` · <a href="#" data-pk="${m.id}">Compare</a>` : ""}</div></td><td>${esc(m.unit)}</td>
    ${m.prices.map((p, si) => cell(m, si)).join("")}<td class="num"><b id="av-${m.id}">${money(avg(m))}</b></td>
    <td class="num"><input class="in qty" type="number" min="0" step="any" inputmode="decimal" data-id="${m.id}" value="${D.qty[m.id] || ""}"></td><td class="num" id="lt-${m.id}">${money(avg(m) * (+D.qty[m.id] || 0))}</td></tr>
    <tr class="pick" id="pk-${m.id}" hidden><td colspan="${5 + D.stores.length}"></td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="${3 + D.stores.length}">Total materials</td><td></td><td class="num" id="mtot">${money(total)}</td></tr></tfoot></table></div>`;
};
function priceBook() {
  if (!PB) return `<p class="sub">No store price sheets loaded yet.</p>`;
  const depts = [...new Set(PB.items.map(x => x[1]))].sort();
  return `<div class="note" style="margin-bottom:12px">Every product in the store price sheets from <b>${esc(priceLabel(PB.date))}</b>: ${PB.stores.map(s => `<b>${esc(s.where || s.name)}</b> (${s.count.toLocaleString()} products)`).join("; ")}. Regular prices; sale prices are in the notes. Search to compare the same kind of item at both stores.</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="search" style="flex:1;min-width:220px">${ic("search")}<input class="in" id="bq" placeholder="Search products, brands, model numbers"></div>
    <select class="in" id="bstore" style="max-width:180px;margin:0"><option value="">Both stores</option>${PB.stores.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join("")}</select>
    <select class="in" id="bdept" style="max-width:220px;margin:0"><option value="">All departments</option>${depts.map(d => `<option>${esc(d)}</option>`).join("")}</select>
    <select class="in" id="bsort" style="max-width:170px;margin:0"><option value="p">Lowest price first</option><option value="n">By name</option></select></div>
  <div class="tablewrap"><table class="t" id="bt"><thead><tr><th>Store</th><th>Product</th><th>Department</th><th>Model #</th><th class="num">Price</th><th>Notes</th></tr></thead><tbody></tbody></table></div>
  <p class="sub" id="bcount"></p>`;
}
function priceBookAfter() {
  const draw = () => { const q = $("#bq").value.toLowerCase().split(/\s+/).filter(Boolean), st = $("#bstore").value, dp = $("#bdept").value;
    let rows = PB.items.filter(x => (st === "" || x[0] === +st) && (!dp || x[1] === dp) && q.every(w => (x[3] + " " + x[4] + " " + x[2] + " " + x[5] + " " + x[6]).toLowerCase().includes(w)));
    rows.sort($("#bsort").value === "p" ? (a, b) => (a[7] ?? 1e9) - (b[7] ?? 1e9) : (a, b) => a[3].localeCompare(b[3]));
    const shown = rows.slice(0, 200);
    $("#bt tbody").innerHTML = shown.map(x => `<tr><td><span class="pill ${x[0] ? "gray" : "gold"}">${esc(PB.stores[x[0]].name)}</span></td><td><b>${esc(x[3])}</b>${x[4] ? `<div class="sub">${esc(x[4])}</div>` : ""}</td>
      <td>${esc(x[1])}<div class="sub">${esc(x[2])}</div></td><td>${esc(x[5])}</td><td class="num">${x[8] ? esc(x[8]) : x[7] != null ? money(x[7]) : "-"}</td><td class="sub">${esc(x[9])}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">Nothing matches.</td></tr>`;
    $("#bcount").textContent = rows.length > 200 ? `Showing 200 of ${rows.length.toLocaleString()}. Type more words to narrow it down.` : `${rows.length.toLocaleString()} products.`; };
  ["#bq", "#bstore", "#bdept", "#bsort"].forEach(id => $(id)[id === "#bq" ? "oninput" : "onchange"] = draw); draw();
}
S.materials.after = (tab = "mine") => {
  $$("#mtab button").forEach(b => b.onclick = () => { location.hash = "#/materials" + (b.dataset.v === "book" ? "/book" : ""); });
  if (tab === "book") return priceBookAfter();
  const recalc = () => { let t = 0; D.materials.forEach(m => { const v = avg(m) * (+D.qty[m.id] || 0); t += v; $("#lt-" + m.id).textContent = money(v); }); $("#mtot").textContent = money(t); save(); };
  $$("input.qty[data-id]").forEach(i => i.oninput = () => { D.qty[i.dataset.id] = i.value; recalc(); });
  $$("input[data-price]").forEach(i => i.oninput = () => { const m = D.materials.find(x => x.id === i.dataset.price); m.prices[+i.dataset.si] = parseFloat(i.value) || 0; $("#av-" + m.id).textContent = money(avg(m)); recalc(); });
  const filter = () => { const q = $("#mq").value.toLowerCase(), c = $("#mcat").value;
    $$("#mt tbody tr.mrow").forEach(r => { r.hidden = !(r.dataset.s.includes(q) && (!c || r.dataset.cat === c)); if (r.hidden) $("#pk-" + r.dataset.id).hidden = true; }); };
  $("#mq").oninput = filter; $("#mcat").onchange = filter;
  $("#mclear").onclick = () => { D.qty = {}; save(); route(); };
  $("#upd").onclick = () => {
    if (LIB && D.libPending) return withLoading("Loading the new store prices...", 900, () => { applyLibraryPrices(); save(); toast("Prices updated from the new store sheets"); route(); });
    toast(LIB ? `These are the newest price sheets (${priceLabel(LIB.priceDate)}). Send new Supplier A / Supplier B sheets to the assistant; they arrive with Update OS, then tap here.` : "No store price sheets loaded yet");
  };
  const pickHtml = m => D.stores.map((s, si) => { const mt = m.match[si], alts = (m.alts && m.alts[si]) || [];
    return `<div style="margin:6px 0 12px"><b>${esc(s)}</b>: ${mt ? `using <b>${esc(mt.product)}</b>${mt.model ? " (model " + esc(mt.model) + ")" : ""} ${mt.priceText ? esc(mt.priceText) : money(m.prices[si])}${mt.notes ? ` <span class="sub">${esc(mt.notes)}</span>` : ""}` : `<span class="sub">no close match in the price sheet</span>`}
      ${alts.length ? `<div class="sub" style="margin-top:4px">Other products in the sheet:</div><ul style="margin:4px 0">${alts.map((x, ai) => `<li>${esc(x[0])}${x[1] ? " (" + esc(x[1]) + ")" : ""} <b>${x[3] ? esc(x[3]) : money(x[2])}</b> <a href="#" data-use="${m.id}" data-si="${si}" data-ai="${ai}">Use this</a></li>`).join("")}</ul>` : ""}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="sub">Or type a price:</span><input class="in" style="max-width:120px;margin:0" type="number" min="0" step="0.01" inputmode="decimal" id="own-${m.id}-${si}" value="">
        <button class="btn small ghost" data-own="${m.id}" data-si="${si}">Use my price</button>${mt || m.prices[si] ? `<button class="btn small ghost" data-none="${m.id}" data-si="${si}">No price</button>` : ""}</div></div>`; }).join("");
  const setPick = (m, si, price, match) => { m.prices[si] = price || 0; m.match[si] = match; m.picked = m.picked || D.stores.map(() => false); m.picked[si] = true; save();
    const open = m.id; route(); const r = $("#pk-" + open); if (r) { r.hidden = false; r.firstElementChild.innerHTML = pickHtml(m); bindPick(r); } };
  const bindPick = row => {
    $$("[data-use]", row).forEach(a => a.onclick = e => { e.preventDefault(); const m = D.materials.find(x => x.id === a.dataset.use), si = +a.dataset.si, x = m.alts[si][+a.dataset.ai];
      setPick(m, si, x[2], { product: x[0], model: x[1], item: "", priceText: x[3], notes: "", score: x[4] }); toast("Price updated"); });
    $$("[data-own]", row).forEach(b => b.onclick = () => { const m = D.materials.find(x => x.id === b.dataset.own), si = +b.dataset.si, v = parseFloat($(`#own-${m.id}-${si}`).value);
      if (!(v > 0)) return toast("Type a price first"); setPick(m, si, Math.round(v * 100) / 100, { product: "Your price", model: "", item: "", priceText: "", notes: "typed in " + today(), score: 1 }); toast("Price saved"); });
    $$("[data-none]", row).forEach(b => b.onclick = () => { const m = D.materials.find(x => x.id === b.dataset.none); setPick(m, +b.dataset.si, 0, null); toast("Price cleared for that store"); });
  };
  $$("[data-pk]").forEach(a => a.onclick = e => { e.preventDefault(); const m = D.materials.find(x => x.id === a.dataset.pk), row = $("#pk-" + m.id);
    row.hidden = !row.hidden; if (!row.hidden) { row.firstElementChild.innerHTML = pickHtml(m); bindPick(row); } });
  $("#mjob").onchange = () => { const j = job($("#mjob").value); if (!j) return; const names = j.repairs.map(repair).filter(Boolean).flatMap(r => r.materials).join(" ").toLowerCase();
    D.materials.forEach(m => { const k = m.name.toLowerCase().split(/[ ,(]+/).filter(w => w.length > 2).slice(0, 2).join(" "); if (k && names.includes(k)) D.qty[m.id] = D.qty[m.id] || 1; }); save(); route(); toast("Job materials loaded; adjust quantities"); };
};

S.rates = (tab = "a") => { const R = D.rates;
  const tbl = (key, h) => `<div class="tablewrap"><table class="t edit" data-key="${key}"><thead><tr>${h.map(x => `<th>${x}</th>`).join("")}<th></th></tr></thead><tbody>${R[key].map((r, i) => `<tr>${h.map((_, k) => `<td><input class="in cell" data-row="${i}" data-col="${k}" value="${esc(r[k] ?? "")}"></td>`).join("")}<td><button class="btn small ghost" data-delrow="${key}:${i}" aria-label="Remove row">${ic("trash")}</button></td></tr>`).join("")}</tbody></table></div>
    <button class="btn small ghost" data-addrow="${key}:${h.length}" style="margin-top:8px">${ic("plus")} Add a row</button>`;
  const T = { a: tbl("small", ["Job", "Rate"]), b: `<p class="note">PRIVATE: for the owner only. Not printed on quotes or the website.</p><h3 style="margin-top:12px">Your reduced flat rates (small jobs, about 1 hour)</h3>${tbl("reduced", ["Who", "Flat rate", "How to confirm"])}
    <h3 style="margin-top:16px">Other discounts (pick what fits)</h3>${tbl("discounts", ["Discount", "Typical amount", "Notes"])}`, c: tbl("flat", ["Job (labor only)", "Typical range"]) };
  return `<div class="pagehead"><h1>Rates &amp; discounts</h1><span class="pill red">Private: owner only</span><button class="btn green" id="rsave">${ic("save")} Save changes</button></div>
  <div class="grid g3" style="margin-bottom:14px">${[["hourly", "Hourly"], ["minimum", "Minimum"], ["urgent", "Urgent / emergency"]].map(([k, l]) => `<label class="card stat"><span>${l}</span><input class="in big" data-top="${k}" value="${esc(R[k])}"></label>`).join("")}</div>
  <div class="tabs">${[["a", "Small-job flat rates"], ["b", "Private discounts"], ["c", "Common job ranges"]].map(([k, l]) => `<button class="${k === tab ? "on" : ""}" onclick="location.hash='#/rates/${k}'">${l}</button>`).join("")}</div>
  ${T[tab] || T.a}<p class="sub" style="margin-top:10px">Tap any box to change it. Changes are kept when you tap <b>Save changes</b> (or add / remove a row).</p>`; };
S.rates.after = () => { const R = D.rates;
  const collect = () => { $$("[data-top]").forEach(i => R[i.dataset.top] = i.value);
    $$("table.edit").forEach(t => { const key = t.dataset.key; $$("input.cell", t).forEach(i => { R[key][+i.dataset.row][+i.dataset.col] = i.value; }); }); };
  $("#rsave").onclick = () => { collect(); save(); toast("Rates and discounts saved"); };
  $$("[data-addrow]").forEach(b => b.onclick = () => { collect(); const [key, n] = b.dataset.addrow.split(":"); R[key].push(Array(+n).fill("")); save(); route(); });
  $$("[data-delrow]").forEach(b => b.onclick = () => { collect(); const [key, i] = b.dataset.delrow.split(":"); R[key].splice(+i, 1); save(); toast("Row removed"); route(); });
};

S.books = (tab = "summary") => {
  const E = D.books.entries, sum = t => E.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
  const inc = sum("Income"), exp = sum("Expense"), miles = sum("Mileage"), mileDed = E.filter(e => e.type === "Mileage").reduce((a, e) => a + e.amount * mileRate(e.date), 0), profit = inc - exp - mileDed;
  const tabs = [["summary", "Summary"], ["entries", "All entries"], ["add", "Add entry"], ["reports", "Reports"]];
  let body = "";
  if (tab === "summary") body = `<div class="grid g4"><div class="card stat"><b class="money">${money(inc)}</b><span>Income</span></div><div class="card stat"><b class="money">${money(exp)}</b><span>Expenses</span></div>
    <div class="card stat"><b class="money">${money(mileDed)}</b><span>Mileage (${miles} mi)</span></div><div class="card stat"><b class="money">${money(profit)}</b><span>Profit</span></div></div>
    <div class="card" style="margin-top:14px"><h3>Set aside for taxes</h3><p>About <b class="money">${money(Math.max(0, profit) * 0.3)}</b> (30% of profit, a common starting point; confirm with a CPA).</p>
    <h3>By category</h3><table class="t"><tbody>${D.books.categories.map(c => [c, E.filter(e => e.cat === c).reduce((a, e) => a + (e.type === "Mileage" ? e.amount * mileRate(e.date) : e.amount), 0)]).filter(x => x[1]).map(([c, v]) => `<tr><td>${c}</td><td class="num">${money(v)}</td></tr>`).join("")}</tbody></table></div>`;
  if (tab === "entries") body = `<div class="tablewrap"><table class="t"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Job</th><th class="num">Amount</th></tr></thead><tbody>
    ${[...E].sort((a, b) => b.date.localeCompare(a.date)).map(e => `<tr><td>${e.date}</td><td><span class="pill ${e.type === "Income" ? "green" : e.type === "Expense" ? "red" : "gold"}">${e.type}</span></td><td>${esc(e.cat)}</td><td>${esc(e.desc)}</td>
    <td>${e.job && job(e.job) ? `<a href="#/job/${e.job}">${esc(job(e.job).title)}</a>` : ""}</td><td class="num">${e.type === "Mileage" ? e.amount + " mi" : money(e.amount)}</td></tr>`).join("")}</tbody></table></div>
    <button class="btn ghost" id="csv" style="margin-top:12px">${ic("copy")} Export spreadsheet (CSV)</button>`;
  if (tab === "add") body = `<form class="card" id="bform" style="max-width:640px"><div class="grid g2"><label class="f">Date<input name="date" type="date" value="${today()}"></label>
    <label class="f">Type<select name="type"><option>Income</option><option>Expense</option><option>Mileage</option></select></label>
    <label class="f">Category<select name="cat">${D.books.categories.map(c => `<option>${c}</option>`).join("")}</select></label>
    <label class="f">Amount ($ or miles)<input name="amount" type="number" step="0.01" min="0" required inputmode="decimal"></label></div>
    <label class="f">Description<input name="desc"></label><label class="f">Job (optional)<select name="job"><option value="">None</option>${liveJobs().map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join("")}</select></label>
    <label class="btn ghost" style="margin-bottom:12px">${ic("camera")} Snap receipt<input type="file" accept="image/*" capture="environment" hidden></label><br><button class="btn green">${ic("save")} Save entry</button></form>`;
  if (tab === "reports") body = `<div class="grid g3">${["Profit & loss (month / year)", "Expenses by category", "Income by customer", "Mileage log", "Quarterly estimated tax worksheet", "Schedule C summary"].map(r => `<div class="card"><b>${r}</b><p class="sub">Printable PDF + spreadsheet</p><button class="btn small ghost" onclick="this.textContent='Coming in build'">Open</button></div>`).join("")}</div>`;
  return `<div class="pagehead"><h1>Bookkeeping</h1><span class="pill green">Your own, in-house</span><button class="btn" id="csvtop">${ic("download")} Export</button></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" onclick="location.hash='#/books/${k}'">${l}</button>`).join("")}</div>${body}`;
};
S.books.after = () => {
  const f = $("#bform"); if (f) f.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); v.amount = +v.amount; delete v[""]; D.books.entries.push(v); save(); toast("Entry saved"); location.hash = "#/books/entries"; };
  const c = $("#csv") || $("#csvtop"); if ($("#csvtop") && $("#csv")) $("#csvtop").onclick = () => $("#csv").click(); if (c) c.onclick = () => { const rows = [["date", "type", "category", "description", "amount"], ...D.books.entries.map(e => [e.date, e.type, e.cat, e.desc, e.amount])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = "field-books.csv"; a.click(); };
};

S.emails = (target) => {
  if (target === "templates") { const names = Object.keys(D.emailTemplates);
    return `<div class="pagehead"><h1>Email templates</h1><a class="btn ghost" href="#/emails">${ic("mail")} Write an email</a></div>
      <p class="sub">Edit your auto-reply and other emails. Words in {curly brackets} fill in automatically: {first} name, {job}, {total}, {link}, {address}, {date}, {topic}.</p>
      <div class="card"><b>Every email and auto-reply is sent from ${esc(FROM)}</b> and ends with your signature:<div class="sigbox">${signature()}</div></div>
      ${names.map((n, i) => `<div class="card"><h3>${esc(n)}${i === 0 ? ` <span class="pill gold">sent automatically to new website requests</span>` : ""}</h3>
      <textarea class="in emailbox tpl" data-t="${esc(n)}" rows="9">${esc(D.emailTemplates[n])}</textarea><button class="btn small green" data-save="${esc(n)}" style="margin-top:8px">${ic("save")} Save template</button></div>`).join("")}`; }
  let who = null;
  if (target && target.startsWith("p:")) { const p = D.prospects.find(x => x.id === target.slice(2)); if (p) who = { name: p.name, email: p.email }; }
  else if (target && job(target)) who = cust(job(target).customer);
  const names = Object.keys(D.emailTemplates);
  return `<div class="pagehead"><h1>Emails</h1><a class="btn ghost" href="#/emails/templates">${ic("pen")} Edit templates &amp; auto-reply</a></div>
  <p class="sub">Drafts fill in from the customer and job. Nothing sends until you tap Send. You can also copy and paste.</p>
  <div class="grid g2"><div class="card"><label class="f">To<select class="in" id="eto">${shown().map(c => `<option value="${c.id}" ${who && who.id === c.id ? "selected" : ""}>${esc(c.name)} &lt;${esc(c.email)}&gt;</option>`).join("")}
    ${who && !who.id ? `<option value="prospect" selected>${esc(who.name)} &lt;${esc(who.email)}&gt;</option>` : ""}</select></label>
    <label class="f">Job<select class="in" id="ejob"></select></label>
    <label class="f">Email type<select class="in" id="etpl">${names.map(n => `<option>${n}</option>`).join("")}</select></label></div>
  <div class="card"><div class="sub" style="margin-bottom:8px"><b>From:</b> ${esc(FROM)}</div><label class="f">Subject<input class="in" id="esub"></label><label class="f">Message<textarea class="in emailbox" id="ebody"></textarea></label>
    <div class="sigbox"><div class="sub">Signature (added automatically)</div>${signature()}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn green" id="esend">${ic("mail")} Send</button><button class="btn ghost" id="ecopy">${ic("copy")} Copy</button><button class="btn ghost" id="edel">Don't send</button></div></div></div>`;
};
S.emails.after = (target) => {
  if (target === "templates") { $$("[data-save]").forEach(b => b.onclick = () => { const n = b.dataset.save; D.emailTemplates[n] = $(`textarea[data-t="${CSS.escape(n)}"]`).value; save(); toast("Template saved"); }); return; }
  const prospect = target && target.startsWith("p:") ? D.prospects.find(x => x.id === target.slice(2)) : null;
  const fillJobs = () => { const v = $("#eto").value; $("#ejob").innerHTML = (v === "prospect" ? [] : jobsOf(v)).map(j => `<option value="${j.id}" ${target === j.id ? "selected" : ""}>${esc(j.title)}</option>`).join("") || "<option value=''>(none)</option>"; };
  const fill = () => { const v = $("#eto").value, c = v === "prospect" ? { name: prospect.name, address: prospect.town } : (cust(v) || { name: "", address: "" }), j = job($("#ejob").value);   // no customers yet: empty draft, no crash
    const docs = j ? j.docs : [], tot = docs.length ? money(docs[docs.length - 1].total) : "$___";
    const map = { first: first(c.name), topic: v === "prospect" ? prospect.message : j ? j.title : "your project", job: j ? j.title : "your project", total: tot, link: "[signing link]", address: j ? j.address : c.address || "", date: "[date]" };
    const tpl = $("#etpl").value; $("#esub").value = `${tpl.replace(/ \/.*/, "")} - Acme Home Services`; $("#ebody").value = D.emailTemplates[tpl].replace(/\{(\w+)\}/g, (m, k) => map[k] ?? m); };
  $("#eto").onchange = () => { fillJobs(); fill(); }; $("#ejob").onchange = fill; $("#etpl").onchange = fill;
  if (prospect) $("#etpl").value = Object.keys(D.emailTemplates)[0]; fillJobs(); fill();
  $("#ecopy").onclick = async () => { const sigText = "\n\nAlex Morgan\nOwner, Acme Home Services LLC\n(555) 555-0100 · example.com";
    try { await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${esc($("#ebody").value)}</div><br>${signature().replace(`src="${LOGO}"`, 'src="https://example.com/email-logo.png"')}`], { type: "text/html" }), "text/plain": new Blob([$("#ebody").value + sigText], { type: "text/plain" }) })]); toast("Copied with signature"); return; } catch (e) { /* fall back to plain text */ }
    try { await navigator.clipboard.writeText($("#ebody").value + sigText); toast("Copied"); } catch (e) { $("#ebody").select(); toast("Selected: press Ctrl+C"); } };
  if (!isOnline()) $("#esend").innerHTML = `${ic("mail")} Send when online`;
  $("#esend").onclick = () => { if (!isOnline()) { D.outbox.push({ to: $("#eto").value, subject: $("#esub").value, body: $("#ebody").value, when: today() }); save(); toast("No internet: saved to the outbox, it sends when you're back online"); return; }
    if (window.COS && COS.onTablet) { D.outbox.push({ to: $("#eto").value, subject: $("#esub").value, body: $("#ebody").value, when: today() }); save();
      toast("Saved to the outbox: email isn't connected yet (Emails > Connect email)"); return; }
    toast("Sent (mock). On the tablet this sends from your business email."); };
  $("#edel").onclick = () => { toast("Draft discarded"); fill(); };
};

/* ---------- Private tab: hidden ("deleted") items, separate password ---------- */
const LAUNCH = "b26fbc21f8096076ae062e222aaecf479bf6aab942ab11477bce700eb30d2ff8";   // sha256 of the launch-date answer (demo answer: 01/01/26), never the answer itself
const launchIso = t => { const n = String(t).match(/\d+/g) || []; if (n.length < 3) return "";
  let [m, d, y] = n.map(Number); if (y < 100) y += 2000; return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
let vaultMode = "";      // "", "forgot" or "reset"
S.private = () => {
  if (vaultOpen) { const items = D.vault.slice().reverse();
    return `<div class="pagehead"><h1>Private</h1><button class="btn ghost" id="vlock">${ic("lock")} Lock</button></div>
    <p class="sub">When a customer deletes an upload or asks for their profile to be deleted, they see "deleted", but it is moved here instead. They never see it again unless you re-add it. Re-added items show a <b class="readd">*</b>.</p>
    <div class="list">${items.map(v => `<div class="row"><div class="mini">${ic(v.kind === "customer" ? "users" : "file")}</div><div class="grow"><b>${esc(v.label)}</b><div class="sub">${v.kind === "customer" ? "Customer profile" : "Customer upload"} &middot; moved here ${esc(v.when)}</div></div>
      <button class="btn small ghost" data-restore="${esc(v.kind)}:${esc(v.id)}">${ic("plus")} Re-add</button></div>`).join("") || `<div class="row sub">Nothing here yet.</div>`}</div>`; }
  const box = inner => `<div class="card" style="max-width:520px;margin:30px auto;text-align:center">${ic("shield", "i big")}<h1>Private</h1>${inner}<div id="vmsg" class="sub" style="margin-top:8px"></div></div>`;
  if (D.vaultLocked) return box(`<p><b>Locked after 3 wrong answers.</b></p><p class="sub">It can only be unlocked from the Terminal or by the assistant on this tablet.</p>
    <button class="btn ghost" id="vcheck">${ic("refresh")} Check again</button>`);
  if (!D.vaultHash) return box(`<p class="sub">Create a Private password. Use a different one from your login.</p>
    <input class="in" type="password" id="vp" placeholder="New Private password" autocomplete="off"><input class="in" type="password" id="vp2" placeholder="Type it again" style="margin-top:8px" autocomplete="off">
    <button class="btn green wide" id="vcreate" style="margin-top:10px">${ic("plus")} Create password</button>`);
  if (vaultMode === "forgot") return box(`<p class="sub">Security question (${3 - (D.vaultTries || 0)} ${3 - (D.vaultTries || 0) === 1 ? "try" : "tries"} left):</p><p><b>What is the launch date?</b></p>
    <input class="in" id="vq" placeholder="MM/DD/YY" inputmode="numeric" autocomplete="off"><button class="btn green wide" id="vans" style="margin-top:10px">Check</button>
    <button class="linkbtn" id="vback">Back</button>`);
  if (vaultMode === "reset") return box(`<p class="sub">Set a new Private password.</p>
    <input class="in" type="password" id="vp" placeholder="New password" autocomplete="off"><input class="in" type="password" id="vp2" placeholder="Confirm new password" style="margin-top:8px" autocomplete="off">
    <button class="btn green wide" id="vcreate" style="margin-top:10px">Save new password</button>`);
  return box(`<p class="sub">Enter your Private password (not your login password).</p><input class="in" type="password" id="vp" placeholder="Private password" autocomplete="off">
    <button class="btn green wide" id="vgo" style="margin-top:10px">Open</button><button class="linkbtn" id="vforgot">Forgot password?</button>`);
};
S.private.after = () => {
  const msg = t => { $("#vmsg").textContent = t; };
  if ($("#vlock")) { $("#vlock").onclick = () => { vaultOpen = false; route(); };
    $$("[data-restore]").forEach(b => b.onclick = () => { const [kind, id] = b.dataset.restore.split(":");
      const it = kind === "customer" ? cust(id) : D.uploads.find(u => u.id === id); if (it) { it.hidden = false; it.readded = true; }
      D.vault = D.vault.filter(v => !(v.kind === kind && v.id === id)); save(); toast("Re-added (marked with a red *)"); route(); }); return; }
  if ($("#vcheck")) { $("#vcheck").onclick = () => { if (!(COS.onTablet && COS.tablet)) return msg("Still locked.");
    COS.tablet("privatelock", "status").then(r => { if (r && r.ok && r.unlocked) { D.vaultLocked = false; D.vaultTries = 0; vaultMode = "reset"; save(); route(); } else msg("Still locked."); }); };
    $("#vcheck").click(); return; }
  if ($("#vcreate")) { $("#vcreate").onclick = async () => { const p = $("#vp").value; if (!p) return msg("Type a password.");
    if (p !== $("#vp2").value) return msg("Passwords don't match."); D.vaultHash = await sha("field-private:" + p); D.vaultTries = 0; vaultMode = ""; save(); vaultOpen = true; toast("Private password saved"); route(); }; return; }
  if ($("#vans")) { $("#vback").onclick = () => { vaultMode = ""; route(); };
    const ans = async () => { if (await sha("field-launch:" + launchIso($("#vq").value)) === LAUNCH) { D.vaultTries = 0; vaultMode = "reset"; save(); route(); return; }
      D.vaultTries = (D.vaultTries || 0) + 1;
      if (D.vaultTries >= 3) { D.vaultLocked = true; vaultMode = ""; if (COS.onTablet && COS.tablet) COS.tablet("privatelock", "lock"); }
      save(); route(); if (!D.vaultLocked) setTimeout(() => msg("That's not it."), 0); };
    $("#vans").onclick = ans; $("#vq").onkeydown = e => { if (e.key === "Enter") ans(); }; return; }
  const run = async () => { const p = $("#vp").value; if (!p) return;
    if (await sha("field-private:" + p) === D.vaultHash) { vaultOpen = true; route(); } else msg("Wrong password."); };
  $("#vgo").onclick = run; $("#vp").onkeydown = e => { if (e.key === "Enter") run(); };
  $("#vforgot").onclick = () => { vaultMode = "forgot"; route(); };
};

/* ---------- customer side ---------- */
const pc = () => cust(D.portal.customer);
S.portal = (sub, arg) => {
  const c = pc();
  if (sub === "start" || !c) return `<div class="card" style="max-width:640px;margin:10px auto"><h1>Welcome to Acme Home Services</h1>
    <p class="sub">Type your name to bring up your information.</p><div style="display:flex;gap:10px"><input class="in" id="pname" placeholder="Your full name" value="${c ? esc(c.name) : ""}" autocomplete="off">
    <button class="btn green" id="pfind">${ic("search")} Find me</button></div><div id="pinfo"></div></div>`;
  const js = jobsOf(c.id), docs = js.flatMap(j => j.docs.map(d => ({ ...d, job: j.title })));
  const toSign = D.signing.filter(s => s.customer === c.id && s.status.startsWith("Waiting"));
  if (!sub) return `<h1>Welcome, ${esc(first(c.name))}</h1><p class="sub">This is your customer area. You only see your own documents.</p>
    <div class="tiles">${[["portal/sign", "Sign", "pen", `${toSign.length} to sign`], ["portal/photos", "Add photos", "camera", "Show me the problem"], ["portal/invoices", "Invoices", "dollar", "Paid and unpaid"], ["portal/docs", "Documents", "file", "Shared with you"]]
      .map(([r, b, i, s]) => `<a class="tile" href="#/${r}">${ic(i)}<b>${b}</b><span>${s}</span></a>`).join("")}</div>`;
  if (sub === "sign" && arg) { const s = D.signing.find(x => x.id === arg && x.customer === c.id); if (!s) return "<p>Not found.</p>";
    return `<h1>Sign</h1><div class="card"><h3>${esc(s.doc)}${s.job && job(s.job) ? `: ${esc(job(s.job).title)}` : ""}</h3>${s.total ? `<p>Total <b>${money(s.total)}</b>.</p>` : ""}<p>By signing you accept this document and its terms.</p>
      <label class="f">Type your full name<input class="in" id="sname" value="${esc(c.name)}"></label><canvas class="sigpad" id="pad"></canvas>
      <div style="display:flex;gap:10px;margin-top:10px"><button class="btn ghost" id="clr">Clear</button><button class="btn green" id="ok">${ic("pen")} Sign</button></div></div>`; }
  if (sub === "sign") return `<h1>Sign</h1><div class="list">${toSign.map(s => `<a class="row" href="#/portal/sign/${s.id}"><div class="grow"><b>${esc(s.doc)}</b><div class="sub">Sent ${esc(s.sent)}</div></div><span class="pill gold">Tap to sign</span></a>`).join("") || `<div class="row sub">Nothing to sign right now.</div>`}</div>`;
  if (sub === "photos") { const mine = D.uploads.filter(u => u.customer === c.id && u.from === "customer" && !u.hidden);
    const fromUs = D.uploads.filter(u => u.customer === c.id && u.from === "owner" && u.shared && !u.hidden && u.kind !== "document"), MU = (window.COS.MEDIA_URLS || {});
    const sharedHtml = `<h2 style="margin-top:18px">From Acme Home Services</h2><div class="photos">${fromUs.map(u => u.kind === "photo" ? `<div class="ph" ${u.thumb ? `style="background-image:url(${u.thumb})"` : ""}>${u.thumb ? "" : esc(u.name)}</div>`
      : MU[u.id] ? (u.kind === "video" ? `<video class="ph" src="${MU[u.id]}" controls></video>` : `<div class="ph"><audio src="${MU[u.id]}" controls></audio></div>`) : `<div class="ph">${u.kind === "video" ? "Video" : "Recording"}</div>`).join("") || `<div class="sub">Nothing shared yet.</div>`}</div>`;
    return `<h1>Add photos or files</h1><div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap"><label class="btn">${ic("camera")} Take a photo<input type="file" accept="image/*" capture="environment" multiple hidden id="ph"></label>
      <label class="btn ghost">${ic("upload")} Upload a file<input type="file" multiple hidden id="pf"></label></div>
      <div class="photos" style="margin-top:12px">${mine.map(u => `<div class="ph" ${u.thumb ? `style="background-image:url(${u.thumb})"` : ""}>${u.thumb ? "" : esc(u.name)}</div>`).join("")}</div>${sharedHtml}</div>`; }
  if (sub === "invoices") { const inv = docs.filter(d => d.type === "Invoice" || d.type === "Quote");
    return `<h1>Invoices</h1><div class="list">${inv.map(d => `<div class="row"><div class="grow"><b>${esc(d.type)} ${esc(d.no)}</b><div class="sub">${esc(d.job)}</div></div><span class="money">${money(d.total)}</span><span class="pill ${d.status === "Paid" ? "green" : "gold"}">${d.status === "Paid" ? "Paid" : "Unpaid"}</span></div>`).join("") || `<div class="row sub">No invoices yet.</div>`}</div>`; }
  if (sub === "docs") { const sh = docs.filter(d => d.shared);
    return `<h1>Documents</h1><div class="list">${sh.map(d => `<div class="row"><div class="grow"><b>${esc(d.type)} ${esc(d.no)}</b><div class="sub">${esc(d.job)}</div></div><button class="btn small ghost">View</button></div>`).join("") || `<div class="row sub">Nothing shared yet.</div>`}</div>`; }
  return "";
};
S.portal.after = (sub, arg) => {
  const c = pc();
  if (sub === "start" || !c) {
    const show = (m) => { const box = $("#pinfo");
      box.innerHTML = `${m ? `<p class="note" style="margin-top:12px">Found you! Check your information.</p>` : `<p class="note" style="margin-top:12px">We couldn't find that name. Fill in your information and tap Save.</p>`}
        <div class="grid g2" style="margin-top:10px"><label class="f">Name<input class="in" id="pn" value="${esc(m ? m.name : $("#pname").value)}"></label><label class="f">Phone<input class="in" id="pp" type="tel" value="${esc(m ? m.phone : "")}"></label>
        <label class="f">Email<input class="in" id="pe" type="email" value="${esc(m ? m.email : "")}"></label><label class="f">Address<input class="in" id="pa" value="${esc(m ? m.address : "")}"></label></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn green" id="psave">${ic("save")} Save</button><label class="btn">${ic("upload")} Upload photos / files<input type="file" multiple hidden id="pup"></label>
        <button class="btn ghost" id="pnext">Continue</button></div>`;
      const ensure = () => { let cc = m || pc(); if (!cc) { cc = { id: uid("c"), name: $("#pn").value, phone: "", email: "", address: "", referral: false, referredBy: "", preferred: "Text", since: today(), notes: "Added themselves on the customer side." }; D.customers.push(cc); }
        D.portal.customer = cc.id; return cc; };
      $("#psave").onclick = () => { const cc = ensure(); Object.assign(cc, { name: $("#pn").value, phone: $("#pp").value, email: $("#pe").value, address: $("#pa").value }); save(); toast("Saved. Thank you!"); };
      $("#pup").onchange = async e => { const cc = ensure(); await addUploads([...e.target.files], cc.id, "", "customer"); toast("Uploaded. Thank you!"); };
      $("#pnext").onclick = () => { ensure(); save(); location.hash = "#/portal"; };
    };
    const find = () => { const q = $("#pname").value.trim().toLowerCase(); if (!q) return; const m = shown().find(x => x.name.toLowerCase() === q) || shown().find(x => x.name.toLowerCase().startsWith(q)); if (m) D.portal.customer = m.id; show(m); };
    $("#pfind").onclick = find; $("#pname").onkeydown = e => { if (e.key === "Enter") find(); };
    if (c) find();
    return;
  }
  if (sub === "sign" && arg) { pad($("#pad")); $("#clr").onclick = () => pad($("#pad"));
    $("#ok").onclick = () => { if (!$("#pad").dataset.inked) { toast("Please sign in the box"); return; } const s = D.signing.find(x => x.id === arg);
      s.status = "Signed " + today(); s.signedName = $("#sname").value; s.signature = $("#pad").toDataURL("image/png");
      const j = job(s.job); if (j) { const d = j.docs.find(x => s.doc.endsWith(x.no)); if (d) d.status = s.status; }
      save(); toast("Signed. Thank you!"); location.hash = "#/portal/sign"; }; }
  if (sub === "photos") ["#ph", "#pf"].forEach(sel => $(sel).onchange = async e => { await addUploads([...e.target.files], c.id, "", "customer"); toast("Saved. Thank you!"); route(); });
};

/* ---------- router ---------- */
function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "login").split("/"), [name, a, b] = parts;
  if (name !== "login" && !D.session) { location.hash = "#/login"; return; }
  if (name === "login") { D.session = null; vaultOpen = false; save(); return S.login(); }
  const side = name === "portal" ? "portal" : "owner";
  if (side === "portal" && D.session !== "customer") { location.hash = "#/login"; return; }
  if (side === "owner" && D.session !== "owner") { location.hash = "#/portal"; return; }   // the customer side can never open owner screens
  const h = hist[side], here = location.hash; if (!goingBack && h[h.length - 1] !== here) h.push(here); goingBack = false;
  if (side === "portal") { shell("portal" + (a ? "/" + a : ""), S.portal(a, b), true); S.portal.after(a, b); }
  else { const fn = S[name] || S.home; shell(name, fn(a, b)); if (fn.after) fn.after(a, b); }
  const back = $("#back"); if (back) back.hidden = side === "owner" ? name === "home" : !a;   // every screen except the two home screens
  $(".main").scrollTop = 0;
}
window.COS = { S, D, $, $$, esc, money, ic, toast, save, today, uid, route, cust, job, jobsOf, thumb, addUploads, sha, loading, withLoading, isOnline, netUI };
/* the phone app unlocks the owner side with the phone's fingerprint too (phone.js) */
window.COS.fixShapes = fixShapes;
window.COS.unlockOwner = () => withLoading("Unlocking...", 400, () => { D.session = "owner"; hist.owner = []; save(); location.hash = "#/home"; });
window.addEventListener("hashchange", route);
window.addEventListener("load", route);
})();
