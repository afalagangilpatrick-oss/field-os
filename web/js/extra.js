/* Field OS: Partners (profiles + which customers each partner referred) and the Emails tabs (Write, Inbox, Business &
   partners, Templates). In the laptop mock-up the Inbox shows SAMPLE messages; on the tablet, Emails > Connect email links her
   real Google Workspace mailbox (IMAP + SMTP with an app password, through fieldd /api/mail) - see the end of this file. */
(() => {
"use strict";
const { S, D, $, $$, esc, money, ic, toast, save, today, uid, route, cust, jobsOf } = window.COS;

/* ---------------- data ---------------- */
D.partners = D.partners || [
  { id: "pt1", name: "Jordan Reyes", role: "Founder", business: "Tidy Spaces Co.", email: "jordan@example.org", phone: "(555) 555-0188",
    website: "https://www.example.org", town: "Riverton, ST", logo: "", logoBg: "#553740", status: "Confirmed",
    deal: "Referral partnership", since: "2026-11-13", notes: "Home organizing, decluttering, downsizing, move-in / move-out. Serves about 75 miles around Riverton." },
];
D.customers.forEach(c => { if (c.partner === undefined) c.partner = /tidy spaces/i.test(c.referredBy || "") ? "pt1" : ""; });
D.inbox = D.inbox || [
  { id: "e1", folder: "business", from: "Jordan Reyes", email: "jordan@example.org", subject: "Re: Referral partnership with Acme Home Services?", when: "2026-11-12 16:20", read: false,
    body: "Hi Alex,\n\nI'd love to set this up. A lot of my move-in and downsizing clients need small repairs. Can we go over the agreement at our meeting on the 30th?\n\nJordan" },
  { id: "e2", folder: "business", from: "Local property manager (sample)", email: "office@example.com", subject: "Contracted repair work for our rentals", when: "2026-11-12 11:05", read: true,
    body: "Hello,\n\nWe manage 40 units in Fairview and Millbrook and are looking for a reliable repair person for turnovers. Do you have a rate sheet?\n\nThanks" },
  { id: "e3", folder: "inbox", from: "Kevin Brooks", email: "kbrooks@example.com", subject: "Website: new quote request", when: "2026-11-12 09:14", read: false,
    body: "Name: Kevin Brooks\nTown: Fairview\nMessage: Need 2 interior doors hung and trim fixed. Photos attached." },
  { id: "e4", folder: "inbox", from: "Dana Whitfield", email: "dana.w@example.com", subject: "Re: Quote is ready", when: "2026-11-11 19:42", read: true,
    body: "Looks good, thank you! Thursday morning works for me." },
  { id: "e5", folder: "inbox", from: "Insurance agent (sample)", email: "agent@example.com", subject: "General liability quote", when: "2026-11-13 08:30", read: false,
    body: "Hi Alex,\n\nThanks for reaching out. I can offer $500K / $1M general liability. Can you confirm your start date?\n" },
];
const partner = id => D.partners.find(p => p.id === id);
const refs = pid => D.customers.filter(c => c.partner === pid && !c.hidden);
window.COS.partner = partner;

/* ---------------- partners ---------------- */
const logoBox = (p, size = 120) => `<div class="plogo" style="width:${size}px;height:${Math.round(size * .6)}px;background-color:${esc(p.logoBg || "#fff")};${p.logo ? `background-image:url(${esc(p.logo)})` : ""}">${p.logo ? "" : esc(p.business[0] || "?")}</div>`;
S.partners = (arg) => {
  if (arg === "new") return form({});
  return `<div class="pagehead"><h1>${ic("link")} Partners</h1><a class="btn" href="#/partners/new">${ic("plus")} Add partner</a></div>
    <div class="list">${D.partners.map(p => `<a class="row" href="#/partner/${p.id}">${logoBox(p, 96)}<div class="grow"><b>${esc(p.business)}</b>
      <div class="sub">${esc(p.name)}${p.role ? `, ${esc(p.role)}` : ""} &middot; ${esc(p.town || "")}</div></div>
      <span class="pill ${p.status === "Confirmed" ? "green" : "gold"}">${esc(p.status)}</span><span class="pill gray">${refs(p.id).length} referral${refs(p.id).length === 1 ? "" : "s"}</span></a>`).join("") || `<div class="row sub">No partners yet.</div>`}</div>`;
};
function form(p) {
  const f = (n, l, t = "text") => `<label class="f">${l}<input name="${n}" type="${t}" value="${esc(p[n] || "")}"></label>`;
  return `<h1>${p.id ? "Edit partner" : "Add partner"}</h1><form class="card" id="pform" style="max-width:760px"><div class="grid g2">${f("business", "Business name")}${f("name", "Contact name")}
    ${f("role", "Title")}${f("town", "Town / area")}${f("email", "Email", "email")}${f("phone", "Phone", "tel")}${f("website", "Website", "url")}${f("deal", "Deal (e.g. Referral partnership)")}</div>
    <label class="f">Status<select name="status">${["Confirmed", "In talks", "Prospect", "Paused"].map(s => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label class="f">Notes<textarea name="notes" rows="3">${esc(p.notes || "")}</textarea></label>
    <label class="btn ghost" style="margin-bottom:12px">${ic("upload")} Logo picture<input type="file" id="plogo" accept="image/*" hidden></label>
    <input type="hidden" name="id" value="${esc(p.id || "")}"><br><button class="btn green">${ic("save")} Save partner</button></form>`;
}
function bindForm() {
  const f = $("#pform"); if (!f) return; let logo = null;
  $("#plogo").onchange = e => { const r = new FileReader(); r.onload = () => { logo = r.result; toast("Logo added"); }; r.readAsDataURL(e.target.files[0]); };
  f.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); let p = v.id && partner(v.id);
    if (p) Object.assign(p, v); else { p = { ...v, id: uid("pt"), since: today(), logoBg: "#FFFFFF" }; D.partners.push(p); }
    if (logo) { p.logo = logo; p.logoBg = p.logoBg || "#FFFFFF"; } save(); toast("Partner saved"); location.hash = "#/partner/" + p.id; };
}
S.partners.after = bindForm;
S.partner = (id, sub) => {
  const p = partner(id); if (!p) return `<p>Partner not found.</p>`; if (sub === "edit") return form(p);
  const cs = refs(id), total = cs.flatMap(c => jobsOf(c.id)).flatMap(j => j.docs).filter(d => d.type === "Invoice").reduce((a, d) => a + d.total, 0);
  return `<div class="pagehead"><h1>${esc(p.business)}</h1><span class="pill ${p.status === "Confirmed" ? "green" : "gold"}">${esc(p.status)}</span><a class="btn ghost" href="#/partner/${id}/edit">Edit</a></div>
    <div class="grid g2"><div class="card">${logoBox(p, 260)}<dl class="kv" style="margin-top:14px"><dt>Contact</dt><dd>${esc(p.name)}${p.role ? `, ${esc(p.role)}` : ""}</dd>
      <dt>Email</dt><dd><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></dd><dt>Phone</dt><dd><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></dd>
      <dt>Website</dt><dd><a class="needs-net" href="${esc(p.website)}" target="_blank" rel="noopener">${esc((p.website || "").replace(/^https?:\/\/(www\.)?/, ""))}</a></dd>
      <dt>Area</dt><dd>${esc(p.town || "")}</dd><dt>Deal</dt><dd>${esc(p.deal || "")}</dd><dt>Partner since</dt><dd>${esc(p.since || "")}</dd></dl>
      ${p.notes ? `<div class="note" style="margin-top:8px">${esc(p.notes)}</div>` : ""}
      <a class="btn ghost small" style="margin-top:10px" href="#/emails/business">${ic("mail")} Partner emails</a></div>
    <div class="card"><h3>Customers they referred (${cs.length})</h3><p class="sub">Invoiced so far from these referrals: <b class="money">${money(total)}</b></p>
      <div class="list">${cs.map(c => `<a class="row" href="#/customer/${c.id}"><div class="avatar">${esc(c.name[0])}</div><div class="grow"><b>${esc(c.name)}</b><div class="sub">${esc(c.address)} &middot; since ${esc(c.since)}</div></div>
        <span class="pill green">${jobsOf(c.id).length} job${jobsOf(c.id).length === 1 ? "" : "s"}</span></a>`).join("") || `<div class="row sub">None yet. Pick this partner on a customer's profile when they refer someone.</div>`}</div></div></div>`;
};
S.partner.after = bindForm;

/* ---------------- emails: tabs + inbox ---------------- */
const writeEmails = S.emails, TABS = [["", "Write"], ["inbox", "Inbox"], ["business", "Business & partners"], ["templates", "Templates"]];
const inFolder = (m, k) => k === "inbox" ? m.folder === "inbox" || m.folder === "receipts" : m.folder === k;   // receipts (real mail) show in Inbox
const tabs = on => `<div class="tabs">${TABS.map(([k, l]) => { const n = k === "inbox" || k === "business" ? D.inbox.filter(m => inFolder(m, k) && !m.read && !m.gone).length : 0;
  return `<button class="${k === on ? "on" : ""}" onclick="location.hash='#/emails${k ? "/" + k : ""}'">${l}${n ? ` <span class="badge">${n}</span>` : ""}</button>`; }).join("")}</div>`;
S.emails = (target, id) => {
  if (target !== "inbox" && target !== "business") return tabs(target === "templates" ? "templates" : "") + (target === "templates" ? "" : mailBar()) + writeEmails(target);
  const list = D.inbox.filter(m => inFolder(m, target) && !m.gone), m = D.inbox.find(x => x.id === id && !x.gone);
  return `${tabs(target)}${mailBar()}<div class="pagehead"><h1>${target === "inbox" ? "Inbox" : "Business &amp; partners"}</h1>
      <button class="btn ghost needs-net" onclick="COS.onTablet ? COS.mailCheck() : COS.withLoading('Checking your business email...', 900, () => COS.toast('Up to date (sample)'))">${ic("refresh")} ${COS.onTablet ? "Check for new mail" : "Check mail"}</button></div>
    <p class="mock">Sample messages. On the tablet this shows your real owner@example.com mail once it is connected to Gmail.</p>
    <div class="grid" style="grid-template-columns:minmax(280px,1fr) 1.6fr;margin-top:10px"><div class="list">${list.map(x => `<a class="row ${x.id === id ? "selrow" : ""}" href="#/emails/${target}/${x.id}">
        <div class="grow"><b style="font-weight:${x.read ? 600 : 800}">${x.read ? "" : "&#9679; "}${esc(x.from)}</b><div>${esc(x.subject)}</div><div class="sub">${esc(x.when)}${x.folder === "receipts" ? ` <span class="pill gold">Receipt, in the books</span>` : ""}</div></div></a>`).join("") || `<div class="row sub">Nothing here.</div>`}</div>
    <div class="card">${m ? `<h3>${esc(m.subject)}</h3><div class="sub">From ${esc(m.from)} &lt;${esc(m.email)}&gt; &middot; ${esc(m.when)}</div>
        <div style="white-space:pre-wrap;margin:12px 0">${esc(m.body)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn green small" data-act="reply">${ic("mail")} Reply</button><button class="btn ghost small" data-act="archive">Archive</button>
          <button class="btn ghost small" data-act="unread">Mark unread</button><button class="btn ghost small" data-act="move">${target === "inbox" ? "Move to Business" : "Move to Inbox"}</button>
          <button class="btn danger small" data-act="delete">${ic("trash")} Delete</button></div>
        <div id="replybox" hidden style="margin-top:12px"><textarea class="in emailbox" id="rtext" style="min-height:160px">Hi ${esc(m.from.split(" ")[0])},\n\n\n\nThank you,</textarea>
          <button class="btn green small" id="rsend" style="margin-top:8px">${ic("mail")} Send reply</button></div>` : `<p class="sub">Tap a message to read it.</p>`}</div></div>`;
};
S.emails.after = (target, id) => {
  if (target !== "inbox" && target !== "business") { if (writeEmails.after) writeEmails.after(target); if (target !== "templates") tabletWrite(target); return; }
  bindBar();
  if (live() && Date.now() - MAIL.last > 120000) COS.mailCheck(true);        // opening the Inbox checks for new mail (at most every 2 min)
  const m = D.inbox.find(x => x.id === id); if (!m) return;
  if (!m.read) { m.read = true; save(); }
  $$("[data-act]").forEach(b => b.onclick = () => { const a = b.dataset.act;
    if (a === "reply") { $("#replybox").hidden = false; $("#rtext").focus(); return; }
    if (a === "archive") { m.gone = "archived"; toast("Archived"); } if (a === "delete") { m.gone = "deleted"; toast("Deleted"); }
    if (a === "unread") { m.read = false; toast("Marked unread"); } if (a === "move") { m.folder = target === "inbox" ? "business" : "inbox"; toast("Moved"); }
    save(); location.hash = "#/emails/" + target; });
  $("#rsend").onclick = () => { if (COS.onTablet) {
      sendMail({ to: m.email, subject: /^re:/i.test(m.subject) ? m.subject : "Re: " + m.subject, body: $("#rtext").value, reply_to: m.msgid || "" }, "Reply sent")
        .then(done => { if (done !== false) $("#replybox").hidden = true; }); return; }
    if (!COS.isOnline()) { D.outbox.push({ to: m.email, subject: "Re: " + m.subject, body: $("#rtext").value, when: today() }); save(); toast("No internet: reply waits in the outbox"); }
    else toast("Reply sent (sample)"); $("#replybox").hidden = true; };
};

/* ---------------- real mailbox (tablet only): Emails > Connect email ----------------
   The tablet service (fieldd /api/mail -> field_mail.py) reads her Google Workspace inbox over IMAP and sends over SMTP with a
   Google app password typed in the field below. The password goes straight to the tablet service (saved there, owner-only file)
   and is never kept in D, the browser's storage or on screen after Connect. The laptop mock-up keeps the sample behaviour. */
const OWN = "owner@example.com";
const MAIL = { connected: null, address: "", open: false, last: 0, checking: false, flushing: false };
const NOANSWER = { ok: false, error: "The tablet service did not answer. Try again in a moment." };
const mailGet = a => fetch(`/api/mail?a=${encodeURIComponent(a)}`, { headers: { "X-Field": "1" } }).then(r => r.json()).catch(() => NOANSWER);
const mailPost = obj => fetch("/api/mail", { method: "POST", headers: { "X-Field": "1", "Content-Type": "application/json" }, body: JSON.stringify(obj) })
  .then(r => r.json()).catch(() => NOANSWER);
const live = () => !!COS.onTablet && MAIL.connected === true;
let statusP = null;
const loadStatus = () => statusP || (statusP = mailGet("status").then(st => { MAIL.connected = !!(st && st.connected); MAIL.address = (st && st.address) || ""; return MAIL; })
  .finally(() => { statusP = null; }));

function mailBar() {
  if (!COS.onTablet) return "";
  if (MAIL.connected === null) return `<div class="card" id="mailbar"><span class="sub">Checking your email connection...</span></div>`;
  if (MAIL.connected) return `<div class="card" id="mailbar" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill green">Email connected</span>
    <b>${esc(MAIL.address)}</b><span class="sub" style="flex:1">Mail comes in from Google; Send goes out from this address.</span><button class="btn ghost small" id="mdisc">Disconnect</button></div>`;
  if (!MAIL.open) return `<div class="card" id="mailbar" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill gold">Email not connected</span>
    <span class="sub" style="flex:1">Connect your business mailbox to read and send your real email here.${D.outbox.length ? ` ${D.outbox.length} email${D.outbox.length === 1 ? " waits" : "s wait"} in the outbox.` : ""}</span>
    <button class="btn green small" id="mopen">${ic("mail")} Connect email</button></div>`;
  return `<div class="card" id="mailbar" style="max-width:820px"><h3>${ic("mail")} Connect email</h3>
    <p class="sub">Field OS reads and sends your business email straight from Google with an <b>app password</b>: a separate 16-letter password just for this tablet. Your normal Google password is never typed here.</p>
    <ol style="margin:8px 0 10px 20px;line-height:1.5">
      <li>On your phone or laptop open <b>myaccount.google.com</b>, signed in as ${esc(OWN)}.</li>
      <li>Tap <b>Security</b>. Under "How you sign in to Google", <b>2-Step Verification</b> must be <b>On</b> (turn it on first if it isn't).</li>
      <li>Search <b>App passwords</b> in the search box at the top (or Security &gt; 2-Step Verification &gt; App passwords at the bottom).</li>
      <li>Type a name like <b>Field tablet</b> and tap <b>Create</b>. Google shows 16 letters in a box.</li>
      <li>Type those 16 letters below (spaces don't matter) and tap <b>Connect</b>. Google shows them only once; if you lose them, delete that app password and make a new one.</li></ol>
    <p class="sub">No "App passwords" option? In <b>admin.google.com</b> &gt; Security &gt; Authentication &gt; 2-Step Verification, tick "Allow users to turn on 2-Step Verification", then turn it on for your account.</p>
    <label class="f">Email address<input class="in" id="maddr" type="email" value="${esc(MAIL.address || OWN)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label class="f">App password<span style="display:flex;gap:8px"><input class="in" id="mpw" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="16 letters from Google" style="flex:1">
      <button class="btn ghost small" id="mshow" type="button">Show</button></span></label>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn green" id="mgo">${ic("mail")} Connect</button><button class="btn ghost" id="mcancel" type="button">Not now</button>
      <span id="mmsg" class="sub" role="status"></span></div></div>`;
}
function refreshBar() { const el = $("#mailbar"); if (el) { el.outerHTML = mailBar(); bindBar(); } }
function bindBar() {
  if (!COS.onTablet || !$("#mailbar")) return;
  if (MAIL.connected === null) { loadStatus().then(() => { refreshBar(); if (live()) { COS.mailFlush(); if (/^#\/emails\/(inbox|business)/.test(location.hash)) COS.mailCheck(true); } }); return; }
  const o = $("#mopen"); if (o) o.onclick = () => { MAIL.open = true; refreshBar(); const bar = $("#mailbar"); if (bar && bar.scrollIntoView) bar.scrollIntoView({ block: "start" }); };
  const c = $("#mcancel"); if (c) c.onclick = () => { MAIL.open = false; refreshBar(); };
  const sh = $("#mshow"); if (sh) sh.onclick = () => { const p = $("#mpw"); p.type = p.type === "password" ? "text" : "password"; sh.textContent = p.type === "password" ? "Show" : "Hide"; };
  const go = $("#mgo"); if (go) go.onclick = async () => {
    const msg = $("#mmsg"), address = $("#maddr").value.trim(), pw = $("#mpw").value;
    if (!pw.replace(/\s/g, "")) { msg.textContent = "Type the 16 letters Google gave you."; return; }
    if (!COS.isOnline()) { msg.textContent = "No internet: connect to Wi-Fi first."; return; }
    go.disabled = true; msg.style.color = ""; msg.textContent = "Checking with Google...";
    const r = await mailPost({ action: "connect", address, password: pw });
    go.disabled = false;
    if (r && r.ok) { $("#mpw").value = ""; MAIL.connected = true; MAIL.address = r.address || address; MAIL.open = false; refreshBar(); toast("Email connected");
      COS.mailFlush(); COS.mailCheck(true); return; }
    msg.style.color = "var(--red, #B3261E)"; msg.textContent = (r && r.error) || "That didn't work. Try again.";
  };
  const d = $("#mdisc"); if (d) d.onclick = async () => {
    if (!d.dataset.sure) { d.dataset.sure = "1"; d.textContent = "Tap again to disconnect"; return; }
    const r = await mailPost({ action: "disconnect" });
    if (r && r.ok) { MAIL.connected = false; MAIL.address = ""; refreshBar(); toast("Email disconnected. Your messages stay here."); } else toast((r && r.error) || "Could not disconnect");
  };
}

/* partner / business mail goes to the Business folder (same rule as fieldlib.mailsync: exact partner address, or the partner's
   own domain / website domain, never a public mail service's domain) */
const PUBLIC = new Set(["gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "aol.com", "icloud.com", "me.com", "comcast.net", "proton.me", "protonmail.com"]);
const domOf = a => { a = String(a || "").trim().toLowerCase(); return a.includes("@") ? a.split("@").pop() : ""; };
const siteOf = u => { try { return new URL(/\/\//.test(u || "") ? u : "http://" + u).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; } };
const fromPartner = x => { const a = String(x.email || "").toLowerCase(), d = domOf(a);
  return (D.partners || []).some(p => (a && a === String(p.email || "").toLowerCase()) || (d && !PUBLIC.has(d) && (d === domOf(p.email) || d === siteOf(p.website)))); };
/* a website quote-form message becomes a Prospect (same id and fields as fieldlib.mailsync, so the database never doubles it) */
function quoteRequest(x) {
  if (!/quote request/i.test(x.subject || "")) return null; const f = {}; let last = null;
  String(x.body || "").split("\n").forEach(line => { const mm = line.match(/^\s*(name|town|message|phone)\s*:\s*(.*)$/i);
    if (mm) { last = mm[1].toLowerCase(); f[last] = mm[2].trim(); } else if (last === "message" && line.trim()) f.message += " " + line.trim(); });
  return { id: "pq-" + x.id, name: f.name || x.from || "", town: f.town || "", email: x.email || "", phone: f.phone || "", message: f.message || "", source: "Website quote form",
    status: "New", received: x.when || "", message_id: x.id };
}
function mergeMail(list) {
  let added = 0;
  (Array.isArray(list) ? list : []).forEach(x => { if (!x || !x.id) return;
    const content = { from: x.from || x.email || "", email: x.email || "", subject: x.subject || "", when: x.when || "", body: x.body || "", uid: x.uid, msgid: x.msgid || "" };
    if (x.attachments) content.attachments = x.attachments;
    const old = D.inbox.find(m => m.id === x.id);
    if (old) { Object.assign(old, content); if (x.folder === "receipts" && old.folder === "inbox") old.folder = "receipts"; return; }   // her read / archived / moved stay
    D.inbox.push({ id: x.id, ...content, folder: x.folder === "receipts" ? "receipts" : fromPartner(x) ? "business" : "inbox", read: !!x.read }); added++;
    const p = quoteRequest(x); if (p && D.prospects && !D.prospects.some(q => q.id === p.id)) D.prospects.unshift(p);
  });
  if (added) D.inbox.sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
  return added;
}
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT"); };
const redrawInbox = () => { const rb = $("#replybox"); if (/^#\/emails\/(inbox|business)/.test(location.hash) && (!rb || rb.hidden) && !typing()) route(); };

COS.mailCheck = async (quiet) => {
  if (!COS.onTablet) return;
  if (MAIL.connected === null) await loadStatus();
  if (!live()) { if (!quiet) toast("Email isn't connected yet: Emails > Connect email"); return; }
  if (!COS.isOnline()) { if (!quiet) toast("No internet: mail is checked when you're back online"); return; }
  if (MAIL.checking) return; MAIL.checking = true;
  if (!quiet) COS.loading(true, "Checking your business email...");
  const r = await mailGet("fetch"); MAIL.checking = false; if (!quiet) COS.loading(false);
  if (!r || !r.ok) { if (!quiet) toast((r && r.error) || "Could not check mail"); return; }
  MAIL.last = Date.now();
  const n = mergeMail(r.messages); if (n) save();
  if (!quiet || n) toast(n ? `${n} new email${n === 1 ? "" : "s"}` : "Up to date");
  if (n) redrawInbox();
};
const toAddress = t => { t = String(t || "").trim(); if (t.includes("@")) return t; const c = cust(t); return c && c.email ? c.email : ""; };
/* send now when connected and online; otherwise it waits in the outbox (sent by mailFlush when both are true) */
async function sendMail(o, okMsg) {
  if (!o.to) { toast("No email address for this person: add one on their profile first."); return false; }
  if (MAIL.connected === null) await loadStatus();
  const queue = why => { D.outbox.push({ id: uid("ob"), to: o.to, subject: o.subject, body: o.body, reply_to: o.reply_to || "", when: today() }); save(); toast(why); return "queued"; };
  if (!COS.isOnline()) return queue("No internet: saved to the outbox, it sends when you're back online");
  if (!live()) return queue("Saved to the outbox: email isn't connected yet (Emails > Connect email)");
  COS.loading(true, "Sending...");
  const r = await mailPost({ action: "send", to: o.to, subject: o.subject || "", body: o.body || "", reply_to: o.reply_to || "" });
  COS.loading(false);
  if (r && r.ok) { toast(okMsg || "Sent"); COS.mailFlush(); return "sent"; }
  toast("Not sent: " + ((r && r.error) || "try again")); return false;
}
COS.sendMail = sendMail;
COS.mailFlush = async () => {
  if (!live() || !COS.isOnline() || MAIL.flushing || !D.outbox.length) return;
  MAIL.flushing = true; let sent = 0, err = "";
  for (const o of D.outbox.slice()) {
    const to = toAddress(o.to); if (!to) continue;                          // no address known yet: stays in the outbox
    const r = await mailPost({ action: "send", to, subject: o.subject || "", body: o.body || "", reply_to: o.reply_to || "" });
    if (r && r.ok) { const i = D.outbox.indexOf(o); if (i >= 0) D.outbox.splice(i, 1); sent++; save(); } else { err = err || (r && r.error) || "not sent"; }
  }
  MAIL.flushing = false;
  if (sent) toast(`${sent} email${sent === 1 ? "" : "s"} from the outbox sent`);
  if (err) toast("Outbox: " + err);
};
/* Write tab on the tablet: Send goes through the real mailbox (the laptop mock-up keeps its sample Send) */
function tabletWrite(target) {
  if (!COS.onTablet) return;
  bindBar();
  const b = $("#esend"); if (!b) return;
  b.onclick = () => { const v = $("#eto").value; let to = "";
    if (v === "prospect") { const p = D.prospects.find(x => x.id === String(target || "").slice(2)); to = p ? p.email : ""; } else { const c = cust(v); to = c ? c.email || "" : ""; }
    sendMail({ to, subject: $("#esub").value, body: $("#ebody").value }, "Sent from " + (MAIL.address || OWN)); };
}
/* background: while the owner is signed in, send what waits in the outbox and check for new mail every 5 minutes */
window.addEventListener("online", () => setTimeout(() => COS.mailFlush && COS.mailFlush(), 2000));
setInterval(() => {
  if (!COS.onTablet || D.session !== "owner" || location.hash.startsWith("#/login")) return;
  if (MAIL.connected === null) { loadStatus(); return; }
  if (!live()) return;
  COS.mailFlush(); if (Date.now() - MAIL.last > 300000) COS.mailCheck(true);
}, 60000);
})();
