/* Field OS "Phone sync" (2026-11-14): the same records on the tablet and the phone app.
   One screen on both devices (#/sync, Home tile + Utilities tile):
   - Sync now: every paired device that can be reached (same Wi-Fi, the phone's hotspot, or Bluetooth tethering), then the cloud drive.
   - Pair: the tablet shows an 8-digit code, the phone types it (once).
   - Bluetooth (tablet): find + pair the phone, then join its Bluetooth tethering. (Phone: a button to its tethering settings.)
   - Cloud drive: one-time setup of the small script in the owner's cloud account; then the drive is the meeting point + cloud backup.
   - Conflicts: when both devices changed the same record, pick which one to keep (the other is never thrown away silently).
   Talks to the local service (/api/sync/..., fieldlib/syncsvc.py). In the laptop mock-up it shows sample values. */
(() => {
"use strict";
const COS = window.COS;
if (!COS || !COS.S) return;
const { S, $, $$, esc, ic, toast } = COS;
const H = { "X-Field": "1" };
const real = () => !!COS.onTablet;
const phone = () => !!COS.onPhone;
const get = (q) => fetch("/api/sync/" + q, { headers: H }).then(r => r.json()).catch(() => ({ ok: false, error: "The Field OS service didn't answer" }));
const post = (body) => fetch("/api/sync", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(r => r.json()).catch(() => ({ ok: false, error: "The Field OS service didn't answer" }));
const bt = (a, v) => fetch(`/api/bt?a=${a}&v=${encodeURIComponent(v || "")}`, { headers: H }).then(r => r.json()).catch(() => ({ ok: false, error: "No answer" }));
const native = (a, v) => COS.tablet ? COS.tablet("do", a, v) : Promise.resolve({ ok: false });

const SAMPLE = { me: { name: "Field OS tablet", kind: "tablet" }, addrs: ["192.0.2.40"], auto: true, seq: 0, conflictCount: 0, conflicts: [],
  peers: [{ id: "p1", name: "Owner's phone", kind: "phone", last_sync: "2026-11-14 09:30", last_via: "wifi", addr: "192.0.2.52" }],
  drive: { configured: false, last: "" }, pairing: { open: false }, last: {} };

const VIA = { wifi: "Wi-Fi", bluetooth: "Bluetooth", drive: "cloud drive" };
const other = () => phone() ? "tablet" : "phone";
let st = null, timer = null;

S.sync = () => `<div class="pagehead"><h1>${ic("phone")} Phone sync</h1>
    <button class="btn green" id="syncnow">${ic("refresh")} Sync now</button></div>
  ${real() ? "" : `<p class="mock">Sample values. On the tablet and the phone app this syncs for real.</p>`}
  <p class="sub" style="max-width:820px">Your customers, jobs, documents, books and settings are the same on the tablet and on your phone. They sync
  by themselves every few minutes when both are on the same Wi-Fi (or the tablet is on the phone's hotspot or Bluetooth), and through your
  cloud drive when they can't see each other. Tap <b>Sync now</b> any time.</p>
  <div id="syncres"></div>
  <div class="grid g2" id="syncbody"><div class="card"><div class="field-spin small"></div> Checking...</div></div>`;

S.sync.after = () => {
  $("#syncnow").onclick = () => runSync("auto");
  load();
  clearInterval(timer);
  timer = setInterval(() => { if (location.hash !== "#/sync") { clearInterval(timer); return; } if (st && st.pairing && st.pairing.open) load(true); }, 5000);
};

function load(quiet) {
  const p = real() ? get("status") : Promise.resolve(SAMPLE);
  return p.then(s => { st = s; if (location.hash === "#/sync" && !(quiet && document.activeElement && document.activeElement.tagName === "INPUT")) draw(); });
}

function ago(t) { return t ? esc(t) : "never"; }

function result(r) {
  if (!r || !r.results) return r && r.error ? `<div class="note">${esc(r.error)}</div>` : "";
  return r.results.map(x => x.ok
    ? `<div class="row">${ic("check")}<span class="grow"><b>${esc(x.peer)}</b> <span class="sub">(${esc(VIA[x.via] || x.via || "")})</span><br>
        <span class="sub">${x.via === "drive" ? `${x.uploaded ? "uploaded this device" : "nothing new to upload"} &middot; ${x.received || 0} change${x.received === 1 ? "" : "s"} from the other device${x.backup ? " &middot; today's backup saved" : ""}`
        : `${x.sent || 0} sent &middot; ${x.received || 0} received`}${x.conflicts ? ` &middot; <b>${x.conflicts} to check below</b>` : ""}${x.web && !String(x.web).startsWith("not") ? ` &middot; screens updated` : ""}</span></span></div>`
    : `<div class="row">${ic("alert")}<span class="grow"><b>${esc(x.peer || "")}</b><br><span class="sub">${esc(x.error || "didn't work")}</span></span></div>`).join("");
}

function runSync(target) {
  const btn = $("#syncnow"); if (btn) { btn.disabled = true; btn.innerHTML = `<span class="field-spin small"></span> Syncing...`; }
  const done = r => { if (btn) { btn.disabled = false; btn.innerHTML = `${ic("refresh")} Sync now`; }
    const box = $("#syncres"); if (box) box.innerHTML = `<div class="card list" style="margin-bottom:14px">${result(r)}</div>`;
    const got = r && r.results && r.results.some(x => x.ok && (x.received || x.conflicts));
    if (got && COS.sync && COS.sync.refresh) COS.sync.refresh().then(() => { if (location.hash === "#/sync") load(); }); else load(); };
  if (!real()) { setTimeout(() => done({ results: [{ ok: true, peer: "Owner's phone", via: "wifi", sent: 2, received: 1 }] }), 900); return; }
  const go = () => get("run?a=" + encodeURIComponent(target)).then(done);
  if (COS.sync && COS.sync.push) COS.sync.push().then(go, go); else go();
}

function draw() {
  const s = st || {}, me = s.me || {}, peers = s.peers || [], body = $("#syncbody"); if (!body) return;
  if (s.ok === false && s.error) { body.innerHTML = `<div class="card"><div class="note">${esc(s.error)}</div></div>`; return; }
  const peerRows = peers.map(p => `<div class="row">${ic(p.kind === "phone" ? "phone" : "monitor")}<span class="grow"><b>${esc(p.name || "Field OS " + p.kind)}</b><br>
      <span class="sub">Last sync: ${ago(p.last_sync)}${p.last_via ? ` by ${esc(VIA[p.last_via] || p.last_via)}` : ""}</span></span>
      <button class="btn small ghost" data-forget="${esc(p.id)}">Forget</button></div>`).join("");
  const pairing = s.pairing || {};
  const showCode = pairing.open ? `<div class="paircode">${esc(pairing.code)}</div>
      <p class="sub">On the ${other()}: Field OS &gt; Phone sync &gt; <b>Pair with ${phone() ? "phone" : "tablet"}</b>, and type this code.
      It works for ${Math.max(0, Math.ceil((pairing.seconds || 0) / 60))} more minute${pairing.seconds > 60 ? "s" : ""}.</p>
      <button class="btn small ghost" id="pairclose">Stop showing the code</button>`
    : `<button class="btn" id="pairopen">${ic("key")} Show a pairing code</button>`;
  const typeCode = `<label class="f">Code shown on the ${other()}<input class="in" id="paircode" inputmode="numeric" autocomplete="off" maxlength="9" placeholder="1234 5678"></label>
      <details><summary class="sub">Can't find it? Type the ${other()}'s address</summary><input class="in" id="pairaddr" inputmode="decimal" placeholder="192.0.2.40"></details>
      <button class="btn green" id="pairjoin" style="margin-top:8px">Pair</button><div id="pairmsg" class="note" hidden></div>`;
  const pairCard = `<div class="card"><h3>${ic("link")} ${phone() ? "Pair with tablet" : "Pair a phone"}</h3>
      ${phone() ? `<p class="sub">On the tablet open Phone sync &gt; <b>Show a pairing code</b>. Both need to be on the same Wi-Fi, or the tablet on this phone's hotspot.</p>${typeCode}`
        : `<p class="sub">Once only. Then the phone and tablet recognise each other by themselves.</p>${showCode}
           <details style="margin-top:10px"><summary class="sub">The phone is showing a code instead</summary>${typeCode}</details>`}
    </div>`;
  const btCard = phone()
    ? `<div class="card"><h3>${ic("link")} Bluetooth</h3><p class="sub">When there is no Wi-Fi: turn on <b>Bluetooth tethering</b> on this phone, then on the tablet
        open Phone sync &gt; Bluetooth &gt; <b>Connect to the phone</b>. Or turn on this phone's Wi-Fi hotspot and join it from the tablet's Wi-Fi settings.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-native="panel" data-v="tether">Open hotspot &amp; tethering</button>
        <button class="btn ghost" data-native="panel" data-v="bt">Bluetooth settings</button></div></div>`
    : (COS.features || []).includes("bt") || !real() ? `<div class="card" id="btcard"><h3>${ic("link")} Bluetooth</h3>
        <p class="sub">No Wi-Fi? On the phone turn on Settings &gt; Network &amp; internet &gt; Hotspot &amp; tethering &gt; <b>Bluetooth tethering</b>.
        Pair once, then tap Connect.</p><div id="btbody"><button class="btn ghost" id="btload">Show Bluetooth phones</button></div></div>` : "";
  const d = s.drive || {};
  const driveCard = `<div class="card"><h3>${ic("cloud")} Cloud drive</h3>
      ${d.configured ? `<p>Set up. Last cloud sync: <b>${ago(d.last)}</b>. Every few minutes this ${me.kind || "device"} keeps its records in your cloud drive
        folder <b>Field OS sync</b> (and one backup a day), so the ${other()} gets your changes even when they're apart.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn needs-net" id="drivenow">${ic("cloud")} Sync with the cloud now</button>
        <button class="btn small ghost" id="driveforget">Turn off</button></div>`
      : `<p class="sub">Once, on either device (the other one gets it at the next sync). Uses your business cloud account
        (owner@example.com); no extra apps.</p>
        <ol class="steps"><li><button class="btn small" id="drivescript">1. Copy the sync script</button></li>
        <li><a class="btn small ghost needs-net" target="_blank" rel="noopener" href="https://script.google.com/home/projects/create">2. Open Google Apps Script</a>
          <div class="sub">Sign in as owner@example.com. Select all the sample text, paste the script, then <b>Deploy &gt; New deployment</b>
          &gt; gear &gt; <b>Web app</b>: Execute as <b>Me</b>, Who has access <b>Anyone</b> &gt; Deploy &gt; Authorize (Advanced &gt; Go to project) and copy the <b>Web app URL</b>.</div></li>
        <li><label class="f">3. Paste the Web app URL<input class="in" id="driveurl" placeholder="https://script.google.com/macros/s/.../exec" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <button class="btn small green" id="drivesave">Save and test</button></li></ol>
        <textarea class="in" id="drivetext" hidden readonly style="height:120px;font:12px monospace"></textarea><div id="drivemsg" class="note" hidden></div>`}
    </div>`;
  const conf = (s.conflicts || []);
  const confCard = conf.length ? `<div class="card" style="border-left:5px solid #A6822A"><h3>${ic("alert")} Changed on both devices (${conf.length})</h3>
      <p class="sub">The newest change is on the screens now. If the other version was the right one, bring it back.</p>
      ${conf.map(c => `<div class="row"><span class="grow"><b>${esc(label(c))}</b> <span class="sub">(${esc(c.coll)}, ${esc(c.when)})</span><br>
        <span class="sub">On the screens: ${esc(brief(c.kept, c.coll))}<br>Other version: ${c.lostDeleted ? "deleted" : esc(brief(c.lost, c.coll))}</span></span>
        <span style="display:grid;gap:6px"><button class="btn small" data-keep="kept" data-c="${esc(c.id)}">Keep this one</button>
        <button class="btn small ghost" data-keep="lost" data-c="${esc(c.id)}">Use the other</button></span></div>`).join("")}</div>` : "";
  body.innerHTML = `${confCard}
    <div class="card"><h3>${ic(me.kind === "phone" ? "phone" : "monitor")} This ${esc(me.kind || "device")}</h3>
      <label class="f">Name (shown on the other device)<input class="in" id="myname" value="${esc(me.name || "")}" maxlength="60"></label>
      <button class="btn small ghost" id="rename">Save name</button>
      <label class="switch" style="margin-top:10px">Sync by itself every few minutes<input type="checkbox" id="autosync" ${s.auto !== false ? "checked" : ""}></label>
      ${s.addrs && s.addrs.length ? `<p class="sub" style="margin-top:8px">Network address: ${s.addrs.map(esc).join(", ")}</p>` : ""}
      ${s.web ? `<p class="sub">Screens version: ${esc(s.web)}</p>` : ""}</div>
    <div class="card"><h3>${ic("users")} Paired ${phone() ? "tablet" : "phones"}</h3>
      <div class="list">${peerRows || `<div class="row sub">None yet: pair below.</div>`}</div>
      ${s.last && s.last.when ? `<p class="sub" style="margin-top:8px">Last sync from this ${esc(me.kind || "device")}: ${esc(s.last.when)}</p>` : ""}</div>
    ${pairCard}${btCard}${driveCard}`;
  bind();
}

function label(c) { const d = c.kept || c.lost || {}; return d.name || d.title || d.subject || d.text && String(d.text).slice(0, 40) || c.doc; }
function brief(d, coll) {
  if (!d) return "deleted";
  const keys = Object.keys(d).filter(k => !["id", "thumb", "signature", "docs", "photos"].includes(k) && typeof d[k] !== "object").slice(0, 5);
  return keys.map(k => `${k}: ${String(d[k]).slice(0, 40)}`).join(", ");
}

function bind() {
  const mock = () => { toast("Mock-up: works on the tablet and in the phone app"); return !real(); };
  const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
  on("#rename", () => { if (mock()) return; post({ action: "rename", name: $("#myname").value }).then(r => toast(r.ok ? "Name saved" : r.error)); });
  const a = $("#autosync"); if (a) a.onchange = () => { if (mock()) return; get("auto?a=" + (a.checked ? "on" : "off")).then(() => toast(a.checked ? "Syncs by itself" : "Syncs only when you tap Sync now")); };
  on("#pairopen", () => { if (mock()) return; get("pair?a=open").then(() => load()); });
  on("#pairclose", () => { if (mock()) return; get("pair?a=close").then(() => load()); });
  on("#pairjoin", () => {
    if (mock()) return;
    const code = ($("#paircode").value || "").replace(/\D/g, ""), addr = (($("#pairaddr") || {}).value || "").trim(), m = $("#pairmsg");
    if (code.length !== 8) { m.hidden = false; m.textContent = "The code has 8 numbers."; return; }
    m.hidden = false; m.innerHTML = `<span class="field-spin small"></span> Looking for the ${other()} and pairing...`;
    $("#pairjoin").disabled = true;
    post({ action: "join", code, addr }).then(r => {
      $("#pairjoin").disabled = false;
      if (!r.ok) { m.textContent = r.error || "Pairing didn't work"; return; }
      toast(`Paired with ${r.peer}`);
      if (COS.sync && COS.sync.refresh) COS.sync.refresh().then(() => load()); else load();
    });
  });
  $$("[data-forget]").forEach(b => b.onclick = () => {
    if (mock()) return;
    if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Tap again to forget"; return; }
    get("forget?v=" + encodeURIComponent(b.dataset.forget)).then(() => { toast("Forgotten. Pair again to sync with it."); load(); });
  });
  $$("[data-keep]").forEach(b => b.onclick = () => {
    if (mock()) return;
    post({ action: "resolve", id: b.dataset.c, keep: b.dataset.keep }).then(r => { toast(r.ok ? "Done" : r.error);
      if (COS.sync && COS.sync.refresh) COS.sync.refresh().then(() => load()); else load(); });
  });
  $$("[data-native]").forEach(b => b.onclick = () => native(b.dataset.native, b.dataset.v));
  on("#drivenow", () => runSync("drive"));
  on("#driveforget", () => { if (mock()) return; post({ action: "drive-forget" }).then(() => { toast("Cloud drive sync turned off on this device"); load(); }); });
  on("#drivescript", () => {
    if (mock()) return;
    post({ action: "drive-script" }).then(r => {
      if (!r.ok) { toast(r.error || "Couldn't make the script"); return; }
      const t = $("#drivetext"); t.value = r.script; t.hidden = false;
      const copied = () => toast("Script copied. Paste it in Google Apps Script (step 2).");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(r.script).then(copied, () => { t.select(); document.execCommand("copy"); copied(); });
      else { t.select(); document.execCommand("copy"); copied(); }
    });
  });
  on("#drivesave", () => {
    if (mock()) return;
    const m = $("#drivemsg"); m.hidden = false; m.innerHTML = `<span class="field-spin small"></span> Testing with Google...`;
    post({ action: "drive-save", url: $("#driveurl").value }).then(r => {
      if (!r.ok) { m.textContent = r.error; return; }
      toast("Cloud drive sync is set up"); runSync("drive");
    });
  });
  on("#btload", () => btLoad());
}

/* ---------- Bluetooth on the tablet ---------- */
let btPoll = null;
function btLoad(scan) {
  const box = $("#btbody"); if (!box) return;
  if (!real()) { box.innerHTML = `<div class="row">${ic("phone")}<span class="grow"><b>Owner's phone</b><br><span class="sub">Paired &middot; offers tethering</span></span>
    <button class="btn small" onclick="COS.toast('Mock-up')">Connect to the phone</button></div>`; return; }
  box.innerHTML = `<div class="field-spin small"></div> ${scan ? "Looking for phones (12 seconds)..." : "Checking Bluetooth..."}`;
  (scan ? bt("scan") : bt("status")).then(r => {
    if (!$("#btbody")) return;
    if (!r.ok) { box.innerHTML = `<div class="note">${esc(r.error || "Bluetooth isn't working")}</div><button class="btn small ghost" id="btpower">Turn Bluetooth on</button>`;
      $("#btpower").onclick = () => bt("power").then(() => btLoad()); return; }
    const list = scan ? r.devices : r.paired;
    box.innerHTML = `${r.tethered ? `<div class="note" style="margin-bottom:8px">Connected to the phone by Bluetooth. Tap <b>Sync now</b>.
        <button class="btn small ghost" id="btoff">Disconnect</button></div>` : ""}
      <div class="list">${(list || []).map(d => `<div class="row">${ic(d.phone ? "phone" : "link")}<span class="grow"><b>${esc(d.name || d.mac)}</b><br>
        <span class="sub">${d.paired ? "Paired" : "Not paired"}${d.nap ? " &middot; offers tethering" : ""}</span></span>
        ${d.paired ? `<button class="btn small" data-tether="${esc(d.mac)}">Connect to the phone</button>` : `<button class="btn small ghost" data-pair="${esc(d.mac)}">Pair</button>`}</div>`).join("")
        || `<div class="row sub">${scan ? "No phones found. On the phone open Settings > Connected devices > Pair new device (that makes it visible), then look again." : "No paired phone yet."}</div>`}</div>
      <div id="btpairbox"></div>
      <button class="btn small ghost" id="btscan" style="margin-top:8px">Look for phones</button>`;
    $("#btscan").onclick = () => btLoad(true);
    const off = $("#btoff"); if (off) off.onclick = () => bt("untether").then(() => btLoad());
    $$("[data-tether]").forEach(b => b.onclick = () => { b.disabled = true; b.textContent = "Connecting..."; bt("tether", b.dataset.tether).then(x => {
      if (x.ok) { toast("Connected by Bluetooth. Syncing..."); runSync("auto"); } else { toast(x.error || "Didn't connect"); }
      btLoad(); }); });
    $$("[data-pair]").forEach(b => b.onclick = () => { bt("pair", b.dataset.pair).then(() => btPair()); });
  });
}
function btPair() {
  clearInterval(btPoll);
  btPoll = setInterval(() => bt("pairstate").then(p => {
    const box = $("#btpairbox"); if (!box) { clearInterval(btPoll); return; }
    if (p.state === "confirm") box.innerHTML = `<div class="card"><p>Does the phone show <b class="paircode" style="font-size:1.6rem">${esc(p.passkey || "the same number")}</b>?</p>
      <button class="btn green" id="btyes">Yes, the numbers match</button> <button class="btn ghost" id="btno">No</button>
      <p class="sub">Then tap Pair on the phone too.</p></div>`;
    else if (p.state === "pairing") box.innerHTML = `<div class="sub"><span class="field-spin small"></span> Pairing... watch the phone's screen.</div>`;
    else { clearInterval(btPoll); box.innerHTML = p.state === "paired" ? `<div class="note">Paired.</div>` : `<div class="note">${esc(p.error || "Pairing stopped")}</div>`; if (p.state === "paired") setTimeout(() => btLoad(), 800); return; }
    const y = $("#btyes"), n = $("#btno");
    if (y) y.onclick = () => bt("answer", "yes"); if (n) n.onclick = () => bt("answer", "no");
  }), 1000);
}
})();
