/* Field OS real saved data (tablet only). The screens keep working on the in-page data object D exactly as in the mock-up;
   this file mirrors D into the tablet's database through fieldd (/api/data...) so nothing lives only in the browser.
   - Active only when fieldd says the store is ready (/api/store). Otherwise nothing changes (browser storage as before).
   - The database is only read or written while the OWNER is signed in (the API refuses the login screen and the customer side).
     Changes made on the customer side (signatures, photos) wait in the page and go to the database at the next owner sign-in.
   - First owner sign-in with an empty database: everything saved on this tablet so far is imported.
   - Nothing is sent while the mock-up's sample records are still on the tablet (fresh.js: Home banner -> Remove sample data),
     so the made-up customers never reach the real database or the books.
   Loaded after app.js and tablet.js. */
(() => {
"use strict";
const COS = window.COS;
if (!COS || !COS.onTablet) return;
const COLL = ["customers", "jobs", "prospects", "signing", "uploads", "partners", "inbox", "outbox", "notes", "vault", "materials", "schedule"];
const UI = ["priceDate", "books", "qty", "emailTemplates", "sketches", "vaultHash", "recordings", "rates", "stores", "repairs",
  "ownerPinHash", "ownerPassHash", "owner"];   // PIN + password + owner details go to the phone too (Phone sync, 2026-11-14)
const SENT = "field-sync-sent";
const D = COS.D;

function xhr(method, url, body) {                        // synchronous on purpose: used only at sign-in, before the screen draws
  const x = new XMLHttpRequest();
  x.open(method, url, false);
  x.setRequestHeader("X-Field", "1");
  if (body !== undefined) x.setRequestHeader("Content-Type", "application/json");
  try { x.send(body === undefined ? null : JSON.stringify(body)); } catch (e) { return { status: 0, json: null }; }
  let json = null; try { json = JSON.parse(x.responseText); } catch (e) { /* not JSON */ }
  return { status: x.status, json };
}
const store = xhr("GET", "/api/store").json;
if (!store || !store.ready) return;

const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ":" + s.length; };
let sent = {}; try { sent = JSON.parse(localStorage.getItem(SENT)) || {}; } catch (e) { sent = {}; }
const keep = () => { try { localStorage.setItem(SENT, JSON.stringify(sent)); } catch (e) { /* full: resend next time */ } };

/* what D looks like as database documents: one doc per list item (with an id), the rest as settings "ui:<key>" */
function docs() {
  const out = [];
  COLL.forEach(c => (Array.isArray(D[c]) ? D[c] : []).forEach(d => { if (d && typeof d === "object" && d.id) out.push([c, d]); }));
  UI.forEach(k => { if (D[k] !== undefined) out.push(["settings", { id: "ui:" + k, value: D[k] }]); });
  return out;
}

let busy = false, again = false, synced = false;
async function push() {                                  // owner only: send what changed since the last send
  if (D.session !== "owner") return;
  if (busy) { again = true; return; }
  busy = true;
  try {
    const now = {};
    for (const [c, d] of docs()) {
      const k = c + "/" + d.id, h = hash(JSON.stringify(d)); now[k] = h;
      if (sent[k] === h) continue;
      const r = await fetch(`/api/data/${c}`, { method: "POST", headers: { "X-Field": "1", "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (r.ok) sent[k] = h; else if (r.status === 403) break;
    }
    for (const k of Object.keys(sent)) if (!(k in now)) {      // removed on the screen -> removed in the database (soft delete)
      const r = await fetch(`/api/data/${k}`, { method: "DELETE", headers: { "X-Field": "1" } });
      if (r.ok || r.status === 404) delete sent[k];
    }
    keep();
  } catch (e) { /* service restarting: try again on the next save */ }
  busy = false;
  if (again) { again = false; push(); }
}

function pull(all) {                                     // owner sign-in: the database is the source of truth
  const r = xhr("GET", "/api/export");                   // all = after a Phone sync: empty lists count too (deleted on the other device)
  if (r.status !== 200 || !r.json) return false;
  const data = r.json;
  COLL.forEach(c => { if (Array.isArray(data[c]) && (all || data[c].length || !Array.isArray(D[c]))) D[c] = data[c]; });
  (data.settings || []).forEach(s => { if (String(s.id).startsWith("ui:")) D[s.id.slice(3)] = s.value; });
  if (COS.fixShapes) COS.fixShapes();
  sent = {};
  docs().forEach(([c, d]) => { sent[c + "/" + d.id] = hash(JSON.stringify(d)); });
  keep();
  return true;
}

const sampleLeft = () => !!(COS.fresh && COS.fresh.hasSample());

function signIn() {
  if (sampleLeft()) { COS.toast("Remove the sample data first (banner on Home), then your records go into the tablet's database"); return; }
  xhr("GET", "/api/role?a=owner");                       // make sure the service knows before asking for owner data
  const st = xhr("GET", "/api/store").json || {};
  if (st.empty) {                                        // first time: bring in everything saved on this tablet so far
    const all = {}; COLL.concat(UI).forEach(k => { if (D[k] !== undefined) all[k] = D[k]; });
    all.owner = D.owner; all.stores = D.stores; all.repairs = D.repairs;
    const r = xhr("POST", "/api/import-mockup", all);
    if (r.status !== 200) { COS.toast("Could not move your data into the tablet's database yet"); return; }
  }
  // changes made since the last owner session (customer side, offline) go first, then the database version comes back
  synced = true;
  push().then(() => { if (pull()) { COS.save(); COS.route(); } });
}

// right after "Remove sample data" (or any save while the first sync is still pending) the first sync runs once; then saves push
let tried = false;
COS.afterSave = () => { if (D.session !== "owner" || sampleLeft()) return; if (synced) { push(); return; } if (!tried) { tried = true; signIn(); } };
let last = D.session;
window.addEventListener("hashchange", () => setTimeout(() => {
  if (D.session === "owner" && last !== "owner") signIn();
  last = D.session;
}, 0));
/* Phone sync: when the other device's changes arrive (a sync started here, there, or the quiet background one), bring them
   onto the screens: send anything not sent yet, then reload from the database. Never while something is being typed. */
const typing = () => { const el = document.activeElement; return el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable); };
async function refresh() {
  if (D.session !== "owner" || sampleLeft()) return false;
  await push();
  if (!pull(true)) return false;
  COS.save(); COS.route(); return true;
}
let seq = null;
setInterval(() => {
  if (D.session !== "owner" || !synced || typing()) return;
  fetch("/api/sync/seq", { headers: { "X-Field": "1" } }).then(r => r.ok ? r.json() : null).then(o => {
    if (!o || typeof o.seq !== "number") return;
    if (seq !== null && o.seq !== seq && !o.busy) refresh();
    if (!o.busy) seq = o.seq;
  }).catch(() => {});
}, 20000);
COS.sync = { push, pull, docs, refresh, ready: true };
})();
