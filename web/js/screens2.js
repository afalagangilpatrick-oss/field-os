/* Field OS round 76 screens: Utilities, Apps (web apps in their own windows), Local Files (Dolphin-style), password reset,
   keyboard size, card payment. Registers into COS.S; loaded after tools.js and hardware.js so it can replace the old Apps screen.
   Programs behind these screens (file listing, keyboard sizing, Private unlock) plug in through fieldd. */
(() => {
"use strict";
const { S, D, $, $$, esc, ic, toast, save, sha } = window.COS;
const COS = window.COS;
const head = (t, i, extra = "") => `<div class="pagehead"><h1>${ic(i)} ${t}</h1>${extra}</div>`;
const tile = ([href, b, i, s, cls]) => `<a class="tile ${cls || ""}" href="#/${href}">${ic(i)}<b>${b}</b><span>${s}</span></a>`;

/* ---------------- Utilities ---------------- */
const UTIL = [["tool/password", "Password reset", "key", "Change your PIN or password"], ["app/camera", "Camera", "camera", "Front / back camera"],
  ["gallery", "Gallery", "camera", "Photos, videos, recordings"], ["app/calc", "Calculator", "calc", "Basic calculator"], ["app/notes", "Notepad", "note", "Notes and lists"],
  ["app/sketch", "Room sketch", "sketch", "Floor plans + measurements"], ["app/recorder", "Sound recorder", "mic", "Voice notes"],
  ["hardware/light", "Flashlight", "flash", "Rear light on / off"], ["tool/cardpay", "Card payment", "card", "Take a card payment"],
  ["app/maps", "Maps & mileage", "map", "Directions + trip miles"], ["app/offline", "Offline backup", "zip", "Save everything as a .zip"],
  ["app/drive", "Back up to cloud", "cloud", "Copies everything to your cloud drive", "needs-net"], ["hardware/fingerprint", "Fingerprint reader", "finger", "Save or test a finger"],
  ["tool/keyboard", "Keyboard", "keyboard", "Key size and board size"], ["hardware/battery", "Batteries", "battery", "Both batteries + charging"],
  ["hardware/smartcard", "Card reader", "card", "Smart card + contactless"], ["hardware/dock", "Dock & screens", "monitor", "Extra screens"],
  ["hardware/gps", "GPS location", "pin", "Where the tablet is"], ["update", "Update OS", "refresh", "Get the latest version"],
  ["sync", "Phone sync", "phone", "Tablet, phone + cloud drive"]];
// phone app: Android's own keyboard replaces Keyboard; the phone's parts get their phone names
const PHONE_UTIL = { "tool/keyboard": null, "hardware/smartcard": ["NFC / tap to pay", "card", "Phone's contactless (NFC)"], "hardware/dock": ["Screens", "monitor", "Cover + inner screen, casting"],
  "hardware/battery": ["Battery", "battery", "Charge + charging"], "hardware/gps": ["GPS location", "pin", "Where the phone is"], "update": ["Update app", "refresh", "Get the latest app"] };
const utilList = () => !COS.onPhone ? UTIL : UTIL.filter(u => PHONE_UTIL[u[0]] !== null).map(u => PHONE_UTIL[u[0]] ? [u[0], ...PHONE_UTIL[u[0]], u[4]] : u);
S.utilities = () => `<h1>Utilities</h1><div class="tiles">${utilList().map(tile).join("")}</div>`;

/* ---------------- Apps ---------------- */
// id, name, icon letter/colour, what it is, web address (opened as its own app window on the tablet)
const WEB = [["assistant", "Assistant", "A", "Desktop assistant app", ""], ["chat", "Chat assistant", "C", "Web assistant", "https://example.com/chat"],
  ["search", "Search assistant", "S", "Web assistant", "https://example.com/search"], ["browser", "Browser", "B", "Web browser", ""],
  ["docs", "Documents", "D", "Write and edit documents", "https://example.com/documents"], ["drive", "Cloud drive", "F", "Your cloud files", "https://example.com/drive"],
  ["payapp", "Pay app", "$", "Payments", "https://example.com/pay-app"], ["wallet", "Wallet", "W", "Payments", "https://example.com/wallet"],
  ["payments", "Payments", "P", "Payments", "https://example.com/payments"], ["bank", "Bank", "B", "Business banking", "https://example.com/bank"],
  ["social", "Social", "S", "Business page", "https://example.com/social"], ["neighbors", "Neighborhood", "N", "Neighborhood", "https://example.com/neighbors"],
  ["photos", "Photo social", "P", "Photos + reels", "https://example.com/photos"], ["leads", "Leads", "L", "Pro leads", "https://example.com/leads"],
  ["video", "Short video", "V", "Short videos", "https://example.com/video"], ["terminal", "Terminal", "", "Command line (owner only)", ""]];
const BUILTIN = { assistant: "assistant", browser: "browser", docs: "doc", terminal: "term" };
COS.WEBAPPS = Object.fromEntries(WEB.filter(w => w[4]).map(w => [w[0], w]));
// each app shows a generic letter tile (inline SVG, no image files); Terminal keeps the line icon
const appIcon = l => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><rect width="52" height="52" rx="12" fill="#09350C"/><text x="26" y="35" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#E2C45C">${l}</text></svg>`);
const badge = w => w[0] === "terminal" ? ic("term") : `<img class="appicon" src="${appIcon(esc(w[2] || w[1][0]))}" alt="" aria-hidden="true">`;
S.apps = () => `<h1>Apps</h1><p class="sub">${COS.onPhone ? "Each opens its Android app on this phone (or its website when the app isn't installed). Use Android's back gesture or the app switcher to come back to Field OS."
  : "Assistant and Browser are the real desktop programs. The others have no Linux app, so each opens its own website in its own window and stays signed in once you log in. Tap the Field OS tab at the top, or swipe in from the left edge, to come back."}</p>
  <div class="tiles">${WEB.map(w => `<a class="tile ${w[4] || w[0] === "assistant" || w[0] === "browser" ? "needs-net" : ""}" href="#/app/${w[0]}">${badge(w)}<b>${w[1]}</b><span>${w[3]}</span></a>`).join("")}</div>`;
const oldApp = S.app, oldAfter = S.app.after;
S.app = (tool, arg) => {
  const w = COS.WEBAPPS[tool];
  if (w && tool !== "docs") return `${head(w[1], "grid")}<div class="card"><p>${esc(w[1])} opens in its own app window on the tablet (no address bar). Sign in once and it stays signed in.</p>
    <a class="btn needs-net" target="_blank" rel="noopener" href="${esc(w[4])}">${ic("link")} Open ${esc(w[1])}</a></div>`;
  return oldApp(tool, arg);
};
S.app.after = (tool, arg) => { if (!(COS.WEBAPPS[tool] && tool !== "docs") && oldAfter) oldAfter(tool, arg); };

/* ---------------- Local Files (works like Dolphin: places on the left, folders and files on the right) ---------------- */
const PLACES = [["Documents", "file"], ["Downloads", "download"], ["Notepad", "note"], ["Pictures", "camera"], ["Videos", "camera"], ["Sounds", "mic"], ["Programs", "grid"]];
function sampleTree() {      // the mock-up builds the folders from what Field OS already holds; the tablet asks fieldd for the real folders
  const jobs = (D.jobs || []).filter(j => !j.hidden);
  const docs = {}; jobs.forEach(j => { const c = (D.customers.find(x => x.id === j.customer) || {}).name || "Customer";
    docs[`${c} - ${j.title}`] = (j.docs || []).map(d => ({ name: `${d.type} ${d.num || ""}.pdf`.replace(" .pdf", ".pdf"), kind: "document", when: d.date || "", size: "" })); });
  const ups = (D.uploads || []).filter(u => !u.hidden);
  return { Documents: docs, Downloads: [["Acme-Home-Services-W9.pdf", "document", "2026-11-12", "120 KB"], ["deck-stain-spec-sheet.pdf", "document", "2026-11-11", "860 KB"],
      ["floor-plan-unit2.png", "photo", "2026-11-11", "1.2 MB"]].map(([name, kind, when, size]) => ({ name, kind, when, size })),
    Notepad: (D.notes || []).map(n => ({ name: (n.title || String(n.text || "Note").split("\n")[0] || "Note").slice(0, 40) + ".txt", kind: "note", when: n.when || "", size: "" })),
    Pictures: ups.filter(u => u.kind === "photo").map(u => ({ name: u.name, kind: "photo", when: u.when, size: "" })),
    Videos: ups.filter(u => u.kind === "video").map(u => ({ name: u.name, kind: "video", when: u.when, size: "" })),
    Sounds: (D.recordings || []).map(r => ({ name: r.name || "Recording", kind: "sound", when: r.when || "", size: "" })),
    Programs: WEB.map(w => ({ name: w[1], kind: "program", when: "", size: "" })) };
}
// Dolphin-style file manager in Field colours: Places on the left, a path bar, then a striped list (or big icons)
const FILL = { folder: ["#C9A54A", "#A6822A"], document: ["#FFFFFF", "#1E5A24"], photo: ["#FFFFFF", "#2E7D9A"], video: ["#FFFFFF", "#7A4E9A"],
  sound: ["#FFFFFF", "#B8562E"], note: ["#FFF6D8", "#A6822A"], program: ["#FFFFFF", "#09350C"], archive: ["#FFFFFF", "#6B6B6B"] };
const GLYPH = { document: "M9 13h8M9 16.5h8M9 20h5", photo: "M8.5 21l3.5-4.5 2.5 3 2-2.5 3 4z", video: "M11 14.5v6l5-3z",
  sound: "M12 21v-6.5l5-1.5v6.5M12 21a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM17 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  note: "M9 13h8M9 16.5h8M9 20h8", program: "M9 13h3.5v3.5H9zM14 13h3.5v3.5H14zM9 18h3.5v3.5H9zM14 18h3.5v3.5H14z", archive: "M13 11v2M13 14v2M13 17v2M12 20h2v2h-2z" };
const fmIcon = kind => { const [body, ink] = FILL[kind] || FILL.document;
  if (kind === "folder") return `<svg class="fmi" viewBox="0 0 32 28" aria-hidden="true"><path d="M2 5a2 2 0 0 1 2-2h8l3 3h13a2 2 0 0 1 2 2v2H2z" fill="${ink}"/>
    <path d="M2 9h28v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="${body}"/><path d="M2 9h28v2H2z" fill="#E2C45C" opacity=".55"/></svg>`;
  return `<svg class="fmi" viewBox="0 0 26 28" aria-hidden="true"><path d="M5.5 2h10.5l6 6v17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 4 25V3.5A1.5 1.5 0 0 1 5.5 2z" fill="${body}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M16 2v6h6" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><path d="${GLYPH[kind] || GLYPH.document}" fill="${kind === "photo" || kind === "video" ? ink : "none"}" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const KIND_NAME = { folder: "Folder", document: "Document", photo: "Picture", video: "Video", sound: "Sound", note: "Note", program: "Program", archive: "Archive" };
let fileView = "details";
S.files = (...parts) => {
  const path = parts.filter(Boolean).map(decodeURIComponent), place = path[0] || "Documents";
  const crumbs = ["Home", ...(path.length ? path : [place])];
  return `${head("Local Files", "folder", `<div class="seg" id="fview"><button data-v="details" class="${fileView === "details" ? "on" : ""}">List</button><button data-v="icons" class="${fileView === "icons" ? "on" : ""}">Icons</button></div>`)}
  <div class="fm"><nav class="fm-places"><div class="fm-h">Places</div>${PLACES.map(([p]) => `<a href="#/files/${encodeURIComponent(p)}" class="${p === place ? "on" : ""}">${fmIcon("folder")}<span>${p}</span></a>`).join("")}</nav>
    <section class="fm-main"><div class="fm-path">${crumbs.map((p, i, a) => `<span class="chev">&rsaquo;</span>` + (i === a.length - 1 ? `<b>${esc(p)}</b>` :
      `<a href="#/files${i ? "/" + a.slice(1, i + 1).map(encodeURIComponent).join("/") : ""}">${esc(p)}</a>`)).join("")}</div>
    <div id="fmlist" class="fm-${fileView}"><p class="sub" style="padding:12px">Loading...</p></div></section></div>`;
};
S.files.after = (...parts) => {
  const path = parts.filter(Boolean).map(decodeURIComponent); if (!path.length) path.push("Documents");
  $$("#fview button").forEach(b => b.onclick = () => { fileView = b.dataset.v; COS.route(); });
  const href = f => f.kind === "folder" ? `href="#/files/${[...path, f.name].map(encodeURIComponent).join("/")}"` : "";
  const draw = items => { const el = $("#fmlist");
    if (!items.length) { el.innerHTML = `<p class="sub" style="padding:14px">This folder is empty.</p>`; return; }
    items = [...items].sort((x, y) => (y.kind === "folder") - (x.kind === "folder") || String(x.name).localeCompare(String(y.name)));
    el.innerHTML = fileView === "icons" ? items.map(f => `<a class="fm-item" ${href(f)}>${fmIcon(f.kind)}<span>${esc(f.name)}</span></a>`).join("")
      : `<div class="fm-colh"><span></span><span>Name</span><span>Kind</span><span>Date</span><span class="num">Size</span></div>` +
        items.map(f => `<a class="fm-row" ${href(f)}>${fmIcon(f.kind)}<span class="nm">${esc(f.name)}</span><span class="kd">${KIND_NAME[f.kind] || esc(f.kind)}</span><span class="dt">${esc(f.when || "")}</span><span class="num">${esc(f.size || "")}</span></a>`).join(""); };
  const mock = () => { let node = sampleTree()[path[0]] || [];
    for (const p of path.slice(1)) node = (node && !Array.isArray(node) ? node[p] : null) || [];
    draw(Array.isArray(node) ? node : Object.keys(node).map(name => ({ name, kind: "folder", when: "", size: "" }))); };
  if (COS.onTablet && COS.tablet) COS.tablet("files", "list", path.join("/")).then(r => r && r.ok && Array.isArray(r.items) ? draw(r.items) : mock()); else mock();
};

/* ---------------- Password reset (owner PIN + password) ---------------- */
S.tool = (what) => {
  if (what === "password") return `${head("Password reset", "key")}<div class="card" style="max-width:560px">
    <p class="sub">Set the PIN and password that unlock the owner side. ${D.ownerPinHash || D.ownerPassHash ? "Both are set; enter new ones to change them." : "None set yet: right now any PIN opens the owner side."}</p>
    <label class="f">New PIN (4 to 8 numbers)<input class="in" id="np1" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off"></label>
    <label class="f">PIN again<input class="in" id="np2" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off"></label>
    <label class="f">New password (optional)<input class="in" id="nw1" type="password" autocomplete="new-password"></label>
    <label class="f">Password again<input class="in" id="nw2" type="password" autocomplete="new-password"></label>
    <button class="btn green wide" id="npgo">Save</button><div id="npmsg" class="sub" style="margin-top:8px"></div></div>`;
  if (what === "keyboard") { const k = D.kbd || { size: "medium", height: 35 };
    return `${head("Keyboard", "keyboard")}<div class="card" style="max-width:640px"><p class="sub">The on-screen keyboard comes up when you tap a text box.</p>
    <b>Key size</b><div class="seg" id="kbsize" style="margin:8px 0 14px">${["small", "medium", "large", "xlarge"].map(s => `<button data-v="${s}" class="${k.size === s ? "on" : ""}">${s === "xlarge" ? "Extra large" : s[0].toUpperCase() + s.slice(1)}</button>`).join("")}</div>
    <label class="f">Keyboard height: <b id="kbhv">${k.height}%</b> of the screen<input type="range" min="20" max="60" step="5" value="${k.height}" id="kbh" style="width:100%"></label>
    <div class="kbdpreview" id="kbprev" style="height:${k.height * 2}px">${"QWERTYUIOP".split("").map(c => `<span class="${k.size}">${c}</span>`).join("")}</div>
    <button class="btn green" id="kbgo" style="margin-top:12px">Save keyboard size</button></div>`; }
  if (what === "cardpay" && COS.onPhone) return `${head("Card payment", "card")}<div class="card" style="max-width:720px">
    <p><b>Tap to Pay</b> turns this phone into a card reader: the customer taps their card or phone on the back of yours. It runs in the
    card reader app (free; the payment company takes its fee per payment). Field OS opens it for you.</p>
    <div class="tiles" style="margin-top:10px">${[["cardreader", "Card reader: Tap to Pay", "Open the card reader app (charge, tap, receipts)"], ["payapp", "Pay app", "Customer pays you by tag or QR"],
      ["payments", "Payments", "Send an invoice or QR code"], ["wallet", "Wallet", "Business profile QR code"]].map(([k, n, d]) => `<a class="tile" href="#/app/${k}">${ic("card")}<b>${n}</b><span>${d}</span></a>`).join("")}</div>
    <p class="sub" style="margin-top:12px">Note: some card reader apps check the phone's integrity before allowing Tap to Pay, and phones with a custom Android
    may not pass. If the app refuses Tap to Pay, use its <b>Bluetooth card reader</b> (about $59) with the same app, or type the card into
    the provider's virtual terminal, or take Pay app / Payments / Wallet QR payments. Field OS never sees card numbers either way.</p></div>`;
  if (what === "cardpay") return `${head("Card payment", "card")}<div class="card" style="max-width:720px">
    <p>The card slot on the back of this tablet is a <b>smart card (ID card) reader</b>. It can read the chip, but it isn't a certified payment reader, so it can't safely or legally take customers' card payments.</p>
    <p>To take a card on the job, use one of these:</p>
    <div class="tiles" style="margin-top:10px">${[["https://example.com/card-reader", "Card reader", "Type the card in (virtual terminal) or tap to pay with a card reader"], ["https://example.com/pay-app", "Pay app", "Customer pays you by tag or QR"],
      ["https://example.com/payments", "Payments", "Send an invoice or QR code"], ["https://example.com/wallet", "Wallet", "Business profile QR code"]].map(([u, n, s]) => `<a class="tile needs-net" target="_blank" rel="noopener" href="${u}">${ic("card")}<b>${n}</b><span>${s}</span></a>`).join("")}</div></div>`;
  location.replace("#/utilities"); return "";
};
S.tool.after = (what) => {
  if (what === "password") $("#npgo").onclick = async () => { const p1 = $("#np1").value, p2 = $("#np2").value, w1 = $("#nw1").value, w2 = $("#nw2").value, m = $("#npmsg");
    if (!/^\d{4,8}$/.test(p1)) return (m.textContent = "The PIN must be 4 to 8 numbers.");
    if (p1 !== p2) return (m.textContent = "The two PINs don't match.");
    if (w1 !== w2) return (m.textContent = "The two passwords don't match.");
    D.ownerPinHash = await sha("field-owner-pin:" + p1); if (w1) D.ownerPassHash = await sha("field-owner-pass:" + w1); save();
    m.textContent = ""; toast("Saved. Use the new PIN next time you unlock."); $$("#np1,#np2,#nw1,#nw2").forEach(i => { i.value = ""; }); };
  if (what === "keyboard") { const k = D.kbd = D.kbd || { size: "medium", height: 35 };
    $$("#kbsize button").forEach(b => b.onclick = () => { k.size = b.dataset.v; $$("#kbsize button").forEach(x => x.classList.toggle("on", x === b)); $$("#kbprev span").forEach(s => { s.className = k.size; }); });
    $("#kbh").oninput = e => { k.height = +e.target.value; $("#kbhv").textContent = k.height + "%"; $("#kbprev").style.height = k.height * 2 + "px"; };
    $("#kbgo").onclick = () => { save(); if (COS.onTablet && COS.tablet) COS.tablet("keyboard", "size", `${k.size}-${k.height}`).then(r => toast(r && r.ok ? "Keyboard size saved" : "Saved. The tablet applies it once the keyboard program arrives in an update"));
      else toast("Keyboard size saved"); }; }
};
})();
