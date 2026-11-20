/* Field OS "Remove sample data / start fresh" (owner only). The mock-up ships with made-up customers (Dana Whitfield,
   Marcus Lee, Patricia Gomez...), their jobs, quotes, photos, emails, schedule and bookkeeping lines. Before the tablet's real
   database is switched on, the owner removes them once here, so they never end up in the real records or the books.
   - Removes only the known sample records (by id) and anything that belongs to a sample customer or job; her own records,
     partners, rates, price lists, repair guide and settings stay.
   - Two taps: "Remove sample data", then "Yes, remove it". On the tablet a banner on Home leads here while samples remain.
   - sync.js refuses the first import into the real database while samples remain (COS.fresh.hasSample).
   Loaded last (after quick.js). */
(() => {
"use strict";
const COS = window.COS;
if (!COS || !COS.S) return;
const { S, D, $, esc, toast, save } = COS;

const IDS = {
  customers: ["c1", "c2", "c3"], jobs: ["j1", "j2", "j3", "j4", "j5"], prospects: ["p1", "p2", "p3"], signing: ["s1", "s2", "s3"],
  uploads: ["u1", "u2", "u3"], inbox: ["e1", "e2", "e3", "e4", "e5"], schedule: ["a1", "a2", "a3"],
};
// the mock-up's six bookkeeping lines (date + description), so a real line on the same day is never touched
const BOOKS = [["2026-11-05", "INV-1000 Patricia Gomez (cash)"], ["2026-11-10", "Q-1001 deposit, Dana Whitfield"],
  ["2026-11-09", "Supplier A: patch kit, compound, door stop"], ["2026-11-07", "State LLC filing fee"],
  ["2026-11-11", "Oscillating multi-tool"], ["2026-11-12", "Riverton -> Oak Hill -> Riverton (14 mi)"]];
const LABEL = { customers: "customers", jobs: "jobs", prospects: "prospects", signing: "documents waiting to be signed", uploads: "photos and files",
  inbox: "emails", schedule: "schedule entries", books: "bookkeeping lines" };

const list = k => Array.isArray(D[k]) ? D[k] : [];
const sampleBook = e => e && BOOKS.some(([d, t]) => e.date === d && e.desc === t);

/* what would be removed: {collection: [records]} (only non-empty) */
function plan() {
  const cust = new Set(IDS.customers), jobs = new Set(IDS.jobs);
  list("jobs").forEach(j => { if (j && cust.has(j.customer)) jobs.add(j.id); });
  const out = {};
  const pick = (k, f) => { const r = list(k).filter(x => x && f(x)); if (r.length) out[k] = r; };
  pick("customers", c => cust.has(c.id));
  pick("jobs", j => jobs.has(j.id));
  pick("prospects", p => IDS.prospects.includes(p.id));
  pick("signing", s => IDS.signing.includes(s.id) || cust.has(s.customer) || jobs.has(s.job));
  pick("uploads", u => IDS.uploads.includes(u.id) || cust.has(u.customer) || jobs.has(u.job));
  pick("inbox", m => IDS.inbox.includes(m.id));
  pick("schedule", a => IDS.schedule.includes(a.id) || jobs.has(a.job));
  const b = (D.books && Array.isArray(D.books.entries) ? D.books.entries : []).filter(sampleBook);
  if (b.length) out.books = b;
  return out;
}
const hasSample = () => Object.keys(plan()).length > 0;

function removeSample() {
  const p = plan();
  Object.keys(p).forEach(k => {
    if (k === "books") { D.books.entries = D.books.entries.filter(e => !sampleBook(e)); return; }
    const gone = new Set(p[k]);
    D[k] = list(k).filter(x => !gone.has(x));
  });
  if (D.portal && IDS.customers.includes(D.portal.customer)) D.portal.customer = null;
  save();
  return Object.values(p).reduce((n, r) => n + r.length, 0);
}

const summary = p => Object.keys(p).map(k => `<li>${p[k].length} ${esc(LABEL[k])}${k === "customers" ? ` (${p[k].map(c => esc(c.name)).join(", ")})` : ""}</li>`).join("");

S.fresh = () => {
  const p = plan();
  if (!Object.keys(p).length) return `<div class="pagehead"><h1>Start fresh</h1></div><div class="card"><p>No sample data left on this tablet. Everything here is yours.</p>
    <a class="btn" href="#/home">Back to Home</a></div>`;
  return `<div class="pagehead"><h1>Remove sample data</h1></div>
    <div class="card"><p>This tablet still has the made-up example records that came with Field OS. Remove them before your real records go
    into the tablet's database, so the sample customers never show up in your books or reports.</p>
    <p><b>What will be removed:</b></p><ul>${summary(p)}</ul>
    <p class="sub">Your own customers and jobs, partners, rates, price lists, repair guide, emails you added and settings stay as they are.</p>
    <div id="freshgo"><button class="btn" id="fresh1">Remove sample data</button> <a class="btn ghost" href="#/home">Not now</a></div>
    <div id="freshconfirm" hidden><p><b>Remove the sample records now?</b> This cannot be undone from the screen.</p>
    <button class="btn" id="fresh2">Yes, remove it</button> <button class="btn ghost" id="freshno">Cancel</button></div></div>`;
};
S.fresh.after = () => {
  const one = $("#fresh1"); if (!one) return;
  one.onclick = () => { $("#freshgo").hidden = true; $("#freshconfirm").hidden = false; };
  $("#freshno").onclick = () => { $("#freshgo").hidden = false; $("#freshconfirm").hidden = true; };
  $("#fresh2").onclick = () => { const n = removeSample(); toast(`Sample data removed (${n} record${n === 1 ? "" : "s"}). Field OS is ready for your real records.`); location.hash = "#/home"; };
};

/* Home banner (tablet only; the laptop mock-up keeps its sample data on purpose) */
const home = S.home;
if (home) {
  S.home = (...a) => {
    // launch (2026-11-13): on the tablet the samples are removed automatically the first time the owner opens Home;
    // the save that follows starts the first sync into the real database (sync.js afterSave)
    if (COS.onTablet && D.session === "owner" && hasSample()) {
      const n = removeSample(); setTimeout(() => toast(`Sample data removed (${n} records). Your real records now go into the tablet's database.`), 400);
    }
    const html = home(...a);
    if (!COS.onTablet || D.session !== "owner" || !hasSample()) return html;
    const banner = `<div class="card" style="border-left:5px solid #A6822A;margin:12px 0"><b>This tablet still has the sample customers.</b>
      <div class="sub">Remove them once before your real records go into the tablet's database.</div>
      <a class="btn small" style="margin-top:8px" href="#/fresh">Remove sample data / start fresh</a></div>`;
    const i = html.indexOf('class="pagehead"'), end = i < 0 ? -1 : html.indexOf("</div>", i);   // under the greeting, clear of the logo
    return end < 0 ? banner + html : html.slice(0, end + 6) + banner + html.slice(end + 6);
  };
  if (home.after) S.home.after = home.after;
}
COS.fresh = { plan, hasSample, removeSample };
})();
