/* Field OS tools: Apps screen, Schedule (month calendar), calculator, notepad, room sketch (magicplan-style),
   camera, sound recorder, cloud drive backup and offline .zip backup. Registers screens into COS.S. */
(() => {
"use strict";
const { S, D, $, $$, esc, money, ic, toast, save, today, uid, route, cust, job } = window.COS;
D.schedule = D.schedule || [
  { id: "a1", job: "j1", date: "2026-11-14", start: "09:00", hours: 2, note: "Paint after patch dries" },
  { id: "a2", job: "j2", date: "2026-11-14", start: "10:30", hours: 1, note: "Look at deck boards" },
  { id: "a3", job: "j3", date: "2026-11-18", start: "08:00", hours: 6, note: "Unit 2 turnover" },
];
const SIZE = { small: 0, medium: 1, large: 2 };
const jobSize = j => { const r = (j && j.repairs || []).map(id => D.repairs.find(x => x.id === id)).filter(Boolean);
  return r.length ? r.reduce((m, x) => SIZE[x.size] > SIZE[m] ? x.size : m, "small") : "small"; };
const mins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtT = t => { const [h, m] = t.split(":").map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const overlaps = (a, b) => a.date === b.date && mins(a.start) < mins(b.start) + b.hours * 60 && mins(b.start) < mins(a.start) + a.hours * 60;
const smallBooking = a => jobSize(job(a.job)) === "small" && a.hours <= 2;

/* ---------------- Schedule ---------------- */
let shown = null;   // "YYYY-MM" month on screen
S.schedule = (ym, day) => {
  const base = ym ? new Date(ym + "-01T12:00") : new Date(); shown = base.toISOString().slice(0, 7);
  const y = base.getFullYear(), m = base.getMonth(), firstDow = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m - 1, 1).toISOString().slice(0, 7), next = new Date(y, m + 1, 1).toISOString().slice(0, 7);
  const sel = day || (today().startsWith(shown) ? today() : `${shown}-01`);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="cal-cell empty"></div>`);
  for (let d = 1; d <= days; d++) { const iso = `${shown}-${String(d).padStart(2, "0")}`, appts = D.schedule.filter(a => a.date === iso).sort((a, b) => mins(a.start) - mins(b.start));
    const clash = appts.some((a, i) => appts.some((b, k) => k !== i && overlaps(a, b)));
    cells.push(`<a class="cal-cell ${iso === today() ? "today" : ""} ${iso === sel ? "sel" : ""}" href="#/schedule/${shown}/${iso}"><span class="dn">${d}</span>
      ${appts.slice(0, 3).map(a => `<span class="ev ${jobSize(job(a.job))}">${fmtT(a.start)} ${esc((job(a.job) || {}).title || "Job")}</span>`).join("")}${appts.length > 3 ? `<span class="more">+${appts.length - 3} more</span>` : ""}
      ${clash ? `<span class="clash" title="Overlapping bookings">!</span>` : ""}</a>`); }
  const list = D.schedule.filter(a => a.date === sel).sort((a, b) => mins(a.start) - mins(b.start));
  const jobs = D.jobs.filter(j => cust(j.customer) && !cust(j.customer).hidden && j.stage < 7);
  return `<div class="pagehead"><h1>Schedule</h1><a class="btn ghost small" href="#/schedule/${prev}">&lsaquo; ${new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" })}</a>
    <h2 style="margin:0">${base.toLocaleString("en-US", { month: "long", year: "numeric" })}</h2><a class="btn ghost small" href="#/schedule/${next}">${new Date(y, m + 1, 1).toLocaleString("en-US", { month: "short" })} &rsaquo;</a></div>
  <div class="cal"><div class="cal-head">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<span>${d}</span>`).join("")}</div><div class="cal-grid">${cells.join("")}</div></div>
  <div class="grid g2" style="margin-top:16px"><div class="card"><h3>${new Date(sel + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h3>
    <div class="list">${list.map(a => { const j = job(a.job) || {}, c = cust(j.customer) || {}, clash = list.some(b => b !== a && overlaps(a, b));
      return `<div class="row"><div class="grow"><b>${fmtT(a.start)} - ${esc(j.title || "Job")}</b><div class="sub">${esc(c.name || "")} &middot; ${a.hours} h &middot; ${esc(jobSize(j))} job${a.note ? ` &middot; ${esc(a.note)}` : ""}</div>
        ${clash ? `<span class="pill ${smallBooking(a) ? "gold" : "red"}">${smallBooking(a) ? "Overlaps (small job, OK)" : "Overlaps"}</span>` : ""}</div>
        <a class="btn small ghost" href="#/job/${a.job}">Open job</a><button class="btn small ghost" data-del="${a.id}">Remove</button></div>`; }).join("") || `<div class="row sub">Nothing booked.</div>`}</div></div>
  <div class="card"><h3>Book a job</h3><label class="f">Job<select class="in" id="aj">${jobs.map(j => `<option value="${j.id}">${esc(cust(j.customer).name)}: ${esc(j.title)} (${jobSize(j)})</option>`).join("")}</select></label>
    <div class="grid g3"><label class="f">Date<input class="in" type="date" id="ad" value="${sel}"></label><label class="f">Start<input class="in" type="time" id="at" value="09:00" step="900"></label>
    <label class="f">Hours<input class="in" type="number" id="ah" value="2" min="0.25" step="0.25"></label></div>
    <label class="f">Note<input class="in" id="an" placeholder="Optional"></label><div id="awarn"></div><button class="btn green" id="ago">${ic("plus")} Book it</button>
    <p class="sub" style="margin-top:8px">Small jobs may overlap or be double-booked. Bigger jobs ask you first.</p></div></div>`;
};
S.schedule.after = (ym, day) => {
  $$("[data-del]").forEach(b => b.onclick = () => { D.schedule = D.schedule.filter(a => a.id !== b.dataset.del); save(); toast("Removed from schedule"); route(); });
  const book = force => { const a = { id: uid("a"), job: $("#aj").value, date: $("#ad").value, start: $("#at").value, hours: parseFloat($("#ah").value) || 1, note: $("#an").value };
    if (!a.job || !a.date || !a.start) return;
    const clash = D.schedule.filter(b => overlaps(a, b)), ok = clash.every(b => smallBooking(a) || smallBooking(b));
    if (clash.length && !ok && !force) { $("#awarn").innerHTML = `<div class="note" style="margin-bottom:10px">This overlaps ${clash.map(b => esc((job(b.job) || {}).title)).join(", ")}, and it isn't a small job.
      <button class="btn small" id="aforce" style="margin-left:8px">Book anyway</button></div>`; $("#aforce").onclick = () => book(true); return; }
    D.schedule.push(a); const j = job(a.job); if (j && j.stage < 4) j.stage = 4; save();
    toast(clash.length ? "Booked (double-booked)" : "Booked"); location.hash = `#/schedule/${a.date.slice(0, 7)}/${a.date}`; };
  $("#ago").onclick = () => book(false);
};

/* ---------------- Apps ---------------- */
const APPS = [["assistant", "Assistant", "assistant", "Desktop assistant app", "net"], ["terminal", "Terminal", "term", "Command line (owner only)"], ["docs", "Documents", "doc", "Write and edit documents", "net"], ["camera", "Camera", "camera", "Front / back camera"],
  ["recorder", "Sound recorder", "mic", "Voice notes"], ["maps", "Maps & mileage", "map", "Directions + trip miles"], ["calc", "Calculator", "calc", "Basic calculator"], ["notes", "Notepad", "note", "Notes and lists"],
  ["sketch", "Room sketch", "sketch", "Floor plans + measurements"], ["gallery", "Gallery", "camera", "Photos, videos, recordings"], ["files", "Files", "folder", "Job folders and documents"], ["tablet", "Tablet hardware", "tool", "Batteries, flashlight, fingerprint, GPS"],
  ["drive", "Back up to cloud drive", "cloud", "Copies everything to your cloud drive", "net"], ["offline", "Offline backup", "zip", "Save everything as a .zip"]];
S.apps = () => `<h1>Apps &amp; tools</h1><div class="tiles">${APPS.map(([k, b, i, s, net]) => `<a class="tile ${net ? "needs-net" : ""}" href="#/app/${k}">${ic(i)}<b>${b}</b><span>${s}</span></a>`).join("")}</div>`;

S.app = (tool, arg) => {
  const head = (t, i) => `<div class="pagehead"><h1>${ic(i)} ${t}</h1></div>`;
  if (tool === "gallery") { location.replace("#/gallery"); return ""; }
  if (tool === "tablet") { location.replace("#/hardware"); return ""; }
  if (tool === "assistant") return `${head("Assistant", "assistant")}<div class="card"><p>Opens the desktop assistant app (installed on the tablet from its vendor's package repository). Sign in once; it stays signed in.</p>
    <button class="btn needs-net" id="openassistant">${ic("assistant")} Open Assistant</button></div>`;
  if (tool === "browser" || tool === "terminal" || tool === "files" || tool === "docs") {
    const info = { browser: ["Browser", "browser", "Opens the web browser in its own tab. Tap the Field OS tab at the top to come back. It closes when you lock the tablet."],
      terminal: ["Terminal", "term", "Opens the command line on the top half of the screen (owner only, from this Apps screen only). Type exit to close it. It also closes when you lock the tablet or hand it to a customer."],
      docs: ["Documents", "doc", "Opens your online documents in their own window, signed in with your account (there is no desktop app for Linux, so this is the app version of the website: no address bar or tabs). Tap the Field OS tab at the top, or swipe in from the left edge, to come back."],
      files: ["Files", "folder", "Coming with the real database: one folder per customer and per job, with photos, documents and recordings."] }[tool];
    return `${head(info[0], info[1])}<div class="card"><p>${info[2]}</p>${tool === "browser" ? `<button class="btn needs-net" id="opench">${ic("browser")} Open the browser now</button>` : ""}${tool === "docs" ? `<a class="btn needs-net" target="_blank" rel="noopener" href="https://example.com/documents">${ic("doc")} Open Documents</a>` : ""}</div>`; }
  if (tool === "calc") return `${head("Calculator", "calc")}<div class="calcbox card"><input class="in calcdisp" id="cd" value="0" readonly>
    <div class="calckeys">${["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "back", "="].map(k => `<button class="btn ${k === "=" ? "green" : /[0-9.]/.test(k) ? "ghost" : ""}" data-k="${k}">${k === "back" ? "&#9003;" : k === "*" ? "&times;" : k === "/" ? "&divide;" : k}</button>`).join("")}</div></div>`;
  if (tool === "notes") { const n = D.notes.find(x => x.id === arg);
    return `${head("Notepad", "note")}<div class="grid" style="grid-template-columns:minmax(220px,1fr) 2.5fr"><div class="card"><button class="btn green wide" id="nnew">${ic("plus")} New note</button>
      <div class="list" style="margin-top:10px">${D.notes.slice().reverse().map(x => `<a class="row ${x.id === arg ? "selrow" : ""}" href="#/app/notes/${x.id}"><div class="grow"><b>${esc(x.title || "Untitled")}</b><div class="sub">${esc(x.when)}</div></div></a>`).join("") || `<div class="row sub">No notes yet.</div>`}</div></div>
      <div class="card">${n ? `<input class="in" id="ntitle" value="${esc(n.title)}" placeholder="Title"><textarea class="in notepad" id="nbody" placeholder="Write here...">${esc(n.body)}</textarea>
        <div style="display:flex;gap:10px;margin-top:10px"><button class="btn green" id="nsave">${ic("save")} Save</button><span class="sub" id="nstat">Saves as you type</span></div>` : `<p class="sub">Pick a note or start a new one.</p>`}</div></div>`; }
  if (tool === "sketch") return `${head("Room sketch", "sketch")}<p class="sub">Add rooms by length and width; the sketch, floor area, wall area and trim length work out by themselves. Saved to the job.</p>
    <div class="grid g2"><div class="card"><label class="f">Job<select class="in" id="skjob"><option value="">No job</option>${D.jobs.map(j => `<option value="${j.id}" ${j.id === arg ? "selected" : ""}>${esc(j.title)}</option>`).join("")}</select></label>
      <div class="grid g4" style="gap:8px"><label class="f">Room<input class="in" id="skn" placeholder="Kitchen"></label><label class="f">Length ft<input class="in" id="skl" type="number" step="0.1"></label>
      <label class="f">Width ft<input class="in" id="skw" type="number" step="0.1"></label><label class="f">Ceiling ft<input class="in" id="skh" type="number" step="0.1" value="8"></label></div>
      <button class="btn green" id="skadd">${ic("plus")} Add room</button>
      <table class="t" style="margin-top:12px"><thead><tr><th>Room</th><th class="num">Size</th><th class="num">Floor sq ft</th><th class="num">Wall sq ft</th><th class="num">Trim ft</th></tr></thead><tbody id="skrows"></tbody><tfoot><tr id="sktot"></tr></tfoot></table>
      <p class="mock" style="margin-top:10px">Linux has no magicplan app (it is phone/AR only). On the tablet: this sketch tool plus Sweet Home 3D (free, Linux) for full floor plans and 3D.</p></div>
    <div class="card"><canvas id="skc" class="sketchc" width="900" height="620"></canvas></div></div>`;
  if (tool === "camera") return `${head("Camera", "camera")}<div class="grid g2"><div class="card"><video id="cv" autoplay playsinline class="camv"></video>
    <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap"><button class="btn green" id="snap">${ic("camera")} Take photo</button><button class="btn" id="vrec">&#9679; Record video</button><button class="btn ghost" id="flip">Switch camera</button>
    <label class="f" style="margin:0">Save to job<select class="in" id="cjob"><option value="">No job</option>${D.jobs.map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join("")}</select></label></div>
    <p class="sub" id="cmsg"></p></div><div class="card"><h3>Taken</h3><div class="photos" id="shots"></div></div></div>`;
  if (tool === "recorder") return `${head("Sound recorder", "mic")}<div class="card" style="max-width:720px"><label class="f">Save to job<select class="in" id="rjob"><option value="">No job</option>${D.jobs.map(j => `<option value="${j.id}" ${j.id === arg ? "selected" : ""}>${esc(j.title)}</option>`).join("")}</select></label>
    <div style="display:flex;gap:10px;align-items:center"><button class="btn green" id="rec">${ic("mic")} Record</button><span class="recdot" id="rdot" hidden></span><span id="rtime" class="sub"></span></div>
    <div class="list" style="margin-top:12px" id="rlist"></div><p class="mock" style="margin-top:10px">Mock-up keeps recordings until you close the window; the tablet saves them in the job folder.</p></div>`;
  if (tool === "maps") { const trips = D.books.entries.filter(e => e.type === "Mileage"), month = today().slice(0, 7), mm = trips.filter(e => e.date.startsWith(month)).reduce((s2, e) => s2 + +e.amount, 0);
    return `${head("Maps & mileage", "map")}<div class="grid g2"><div class="card"><h3>Directions</h3>
      <label class="f">Start from<input class="in" id="mfrom" value="${esc(D.owner.base || "Riverton, ST 00010")}"></label>
      <label class="f">Going to (job)<select class="in" id="mjob">${D.jobs.filter(j => cust(j.customer) && !cust(j.customer).hidden && j.stage < 7).map(j => `<option value="${j.id}">${esc(cust(j.customer).name)}: ${esc(j.address)}</option>`).join("")}</select></label>
      <button class="btn green needs-net" id="mopen">${ic("map")} Open in Google Maps</button>
      <p class="sub" style="margin-top:8px">Google Maps shows the miles for the route; type them below, or use trip tracking.</p></div>
    <div class="card"><h3>Log this trip</h3><div class="grid g2"><label class="f">Miles one way<input class="in" id="mmi" type="number" step="0.1" min="0" inputmode="decimal"></label>
      <label class="f">Or odometer start / end<div style="display:flex;gap:6px"><input class="in" id="mo1" type="number" placeholder="start"><input class="in" id="mo2" type="number" placeholder="end"></div></label></div>
      <label class="check"><input type="checkbox" id="mrt" checked> Round trip (doubles the miles)</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="mlog">${ic("save")} Log miles to Books</button><button class="btn ghost" id="mtrack">Track trip with GPS</button></div>
      <p class="sub" id="mgps"></p></div></div>
    <div class="grid g3" style="margin-top:14px"><div class="card stat"><b>${mm.toFixed(1)} mi</b><span>This month</span></div><div class="card stat"><b class="money">${money(mm * mileRate())}</b><span>Deduction at $${String(mileRate())}/mi</span></div>
      <div class="card stat"><b>${trips.length}</b><span>Trips logged</span></div></div>
    <h3 style="margin-top:16px">Recent trips</h3><div class="list">${trips.slice().reverse().slice(0, 8).map(e => `<div class="row"><div class="grow"><b>${esc(e.desc)}</b><div class="sub">${esc(e.date)}${e.job && job(e.job) ? ` &middot; ${esc(job(e.job).title)}` : ""}</div></div><b>${e.amount} mi</b></div>`).join("") || `<div class="row sub">No trips yet.</div>`}</div>
    <p class="mock" style="margin-top:10px">Google Maps has no Linux app; on the tablet this button opens Google Maps in its own browser window. GPS tracking needs the tablet's location (Wi-Fi or the optional GPS module).</p>`; }
  if (tool === "drive") return `${head("Back up to cloud drive", "cloud")}<div class="card" style="max-width:720px"><p>Copies all customers, jobs, photos, documents, books and settings to your cloud drive.</p>
    <button class="btn green needs-net" id="drv">${ic("cloud")} Back up now</button><div id="dmsg" style="margin-top:10px"></div></div>`;
  if (tool === "offline") return `${head("Offline backup", "zip")}<div class="card" style="max-width:720px"><p>Saves everything in one <b>.zip</b> file you can keep on a USB stick or upload later. Use it when there is no internet.</p>
    <button class="btn green" id="zipgo">${ic("zip")} Save offline backup (.zip)</button><p class="sub" id="zmsg"></p></div>`;
  return `<p>Unknown app.</p>`;
};
S.app.after = (tool, arg) => {
  if (tool === "assistant") $("#openassistant").onclick = () => window.open("https://example.com/assistant", "_blank");
  if (tool === "browser") $("#opench").onclick = () => window.open("https://example.com", "_blank");
  if (tool === "calc") { const d = $("#cd"); let expr = "";
    $$("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k;
      if (k === "C") expr = ""; else if (k === "back") expr = expr.slice(0, -1);
      else if (k === "=") { try { if (!/^[0-9+\-*/().\s]+$/.test(expr)) throw 0; const v = Function(`"use strict";return (${expr})`)(); expr = String(Math.round(v * 1e10) / 1e10); } catch (e) { expr = ""; d.value = "Error"; return; } }
      else expr += k; d.value = expr || "0"; }); }
  if (tool === "notes") { $("#nnew").onclick = () => { const n = { id: uid("n"), title: "", body: "", when: today() }; D.notes.push(n); save(); location.hash = "#/app/notes/" + n.id; };
    const n = D.notes.find(x => x.id === arg); if (n) { const sv = () => { n.title = $("#ntitle").value; n.body = $("#nbody").value; n.when = today(); save(); $("#nstat").textContent = "Saved"; };
      $("#nbody").oninput = $("#ntitle").oninput = sv; $("#nsave").onclick = () => { sv(); toast("Note saved"); route(); }; } }
  if (tool === "sketch") sketch(arg);
  if (tool === "camera") camera();
  if (tool === "recorder") recorder();
  if (tool === "maps") {
    $("#mopen").onclick = () => { const j = job($("#mjob").value); if (!j) return; D.owner.base = $("#mfrom").value; save();
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent($("#mfrom").value)}&destination=${encodeURIComponent(j.address + ", ST")}&travelmode=driving`, "_blank"); };
    $("#mlog").onclick = () => { let mi = parseFloat($("#mmi").value); const o1 = parseFloat($("#mo1").value), o2 = parseFloat($("#mo2").value);
      if (!(mi > 0) && o2 > o1) mi = o2 - o1; if (!(mi > 0)) { toast("Enter miles or odometer readings"); return; }
      if ($("#mrt").checked && !(o2 > o1)) mi *= 2; const j = job($("#mjob").value);
      D.books.entries.push({ date: today(), type: "Mileage", cat: "Mileage", desc: `${$("#mfrom").value} -> ${j ? j.address : "trip"}${$("#mrt").checked ? " (round trip)" : ""}`, amount: Math.round(mi * 10) / 10, job: j ? j.id : "" });
      save(); toast(`${Math.round(mi * 10) / 10} miles logged`); route(); };
    let watch = null, last = null, dist = 0; const hav = (a, b) => { const R = 3958.8, r = x => x * Math.PI / 180, dLa = r(b.latitude - a.latitude), dLo = r(b.longitude - a.longitude);
      const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    $("#mtrack").onclick = () => { if (watch !== null) { navigator.geolocation.clearWatch(watch); watch = null; $("#mmi").value = dist.toFixed(1); $("#mrt").checked = false; $("#mtrack").textContent = "Track trip with GPS"; $("#mgps").textContent = `Trip done: ${dist.toFixed(1)} mi. Tap Log miles.`; return; }
      if (!navigator.geolocation) { $("#mgps").textContent = "No location on this device."; return; } dist = 0; last = null;
      watch = navigator.geolocation.watchPosition(p => { if (last && p.coords.accuracy < 60) dist += hav(last, p.coords); last = p.coords; $("#mgps").textContent = `Tracking: ${dist.toFixed(2)} mi`; },
        () => { $("#mgps").textContent = "Location not available here. On the tablet allow location for Field OS."; }, { enableHighAccuracy: true });
      $("#mtrack").textContent = "Stop tracking"; };
  }
  if (tool === "drive") $("#drv").onclick = () => COS.withLoading("Backing up to the cloud drive...", 1200, () => { const m = $("#dmsg");
    if (!navigator.onLine) { m.innerHTML = `<div class="note">No internet right now. Use <a href="#/app/offline">Offline backup</a> to save a .zip instead.</div>`; return; }
    m.innerHTML = COS.onTablet ? `<div class="note">Cloud drive backup isn't connected on the tablet yet. Use <a href="#/app/offline">Offline backup</a> to save a .zip for now.</div>`
      : `<div class="note">Backed up (mock). On the tablet this runs <b>field-drive-sync</b>; if the cloud drive can't be reached it automatically saves the offline .zip instead.</div>`; });
  if (tool === "offline") $("#zipgo").onclick = () => { const files = backupFiles(), blob = makeZip(files), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `field-os-backup-${today()}.zip`; a.click(); $("#zmsg").textContent = `Saved ${files.length} files (${Math.round(blob.size / 1024)} KB).`; };
};

/* ---------------- gallery: photos, videos, recordings only ---------------- */
const MEDIA_URLS = {};   // this session's playable copies (the tablet keeps the real files in the job folder)
const KINDS = { photo: "Photos", video: "Videos", audio: "Recordings" };
function addMedia(kind, name, j, thumb = "") {
  const id = uid("u"); D.uploads.push({ id, customer: j ? j.customer : "", job: j ? j.id : "", name, kind, when: today(), from: "owner", hidden: false, shared: false, thumb }); save(); return id; }
S.gallery = (kind = "all") => {
  const items = D.uploads.filter(u => KINDS[u.kind] && !u.hidden && (kind === "all" || u.kind === kind) && (!u.customer || (cust(u.customer) && !cust(u.customer).hidden))).slice().reverse();
  const cell = u => { const j = job(u.job), c = cust(u.customer), src = MEDIA_URLS[u.id];
    const view = u.kind === "photo" ? `<div class="gthumb" ${u.thumb ? `style="background-image:url(${u.thumb})"` : ""}>${u.thumb ? "" : ic("camera")}</div>`
      : u.kind === "video" ? (src ? `<video class="gthumb" src="${src}" controls></video>` : `<div class="gthumb">${ic("camera")}<span>Video</span></div>`)
      : (src ? `<div class="gthumb">${ic("mic")}<audio src="${src}" controls></audio></div>` : `<div class="gthumb">${ic("mic")}<span>Recording</span></div>`);
    return `<div class="gcard">${view}<b>${esc(u.name)}</b><div class="sub">${esc(KINDS[u.kind].slice(0, -1))} &middot; ${esc(u.when)} &middot; ${u.from === "customer" ? "from customer" : "yours"}</div>
      <div class="sub">${c ? esc(c.name) : "No customer"}${j ? ` &middot; ${esc(j.title)}` : ""}</div>
      <label class="check small"><input type="checkbox" data-share="${u.id}" ${u.shared ? "checked" : ""} ${c ? "" : "disabled"}> Customer can see</label>
      <button class="btn small danger" data-gdel="${u.id}">${ic("trash")} Delete</button></div>`; };
  return `<div class="pagehead"><h1>${ic("camera")} Gallery</h1><a class="btn" href="#/app/camera">${ic("camera")} Camera</a><a class="btn ghost" href="#/app/recorder">${ic("mic")} Recorder</a></div>
    <div class="tabs">${[["all", "All"], ["photo", "Photos"], ["video", "Videos"], ["audio", "Recordings"]].map(([k, l]) => `<button class="${k === kind ? "on" : ""}" onclick="location.hash='#/gallery/${k}'">${l}</button>`).join("")}</div>
    <p class="sub">Only photos, videos and recordings. Tick <b>Customer can see</b> to show one on that customer's side; everything else stays private.</p>
    <div class="gallery">${items.map(cell).join("") || `<div class="card sub">Nothing here yet.</div>`}</div>`;
};
S.gallery.after = () => {
  $$("[data-share]").forEach(b => b.onchange = () => { const u = D.uploads.find(x => x.id === b.dataset.share); u.shared = b.checked; save(); toast(b.checked ? "Customer can now see it" : "Hidden from customer"); });
  $$("[data-gdel]").forEach(b => b.onclick = () => { const u = D.uploads.find(x => x.id === b.dataset.gdel); u.hidden = true; u.shared = false;
    D.vault.push({ kind: "upload", id: u.id, label: `${u.name}${cust(u.customer) ? ` (${cust(u.customer).name})` : ""}`, when: today() }); save(); location.hash = "#/deleted/upload"; });
};
window.COS.MEDIA_URLS = MEDIA_URLS;

/* ---------------- update OS ---------------- */
S.update = () => `<div class="pagehead"><h1>${ic("refresh")} Update OS</h1></div>
  <div class="card" style="max-width:720px"><p>Gets the newest Field OS fixes from your laptop over your home Wi-Fi. Your customers, jobs and files are not touched.</p>
    <div id="unet" class="row" style="border:1px solid var(--line);border-radius:10px;margin-bottom:10px">${ic("wifi")}<span class="grow" id="unettext">Checking Wi-Fi...</span><button class="btn small ghost" id="uwifi">Wi-Fi settings</button></div>
    <div id="uinfo" class="note">Tap <b>Check for updates</b>.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn" id="ucheck">${ic("search")} Check for updates</button>
    <button class="btn green" id="uapply" hidden>${ic("download")} Install update</button></div>
    <details id="uboot" style="margin-top:12px"><summary><b>Start-up time</b></summary><div id="ubootbody" class="sub">Reading...</div></details>
    <p class="sub" style="margin-top:10px">The laptop and tablet need to be on the same Wi-Fi (home Wi-Fi or your phone's hotspot), and the laptop needs to be on and awake. After installing, Field OS restarts by itself.</p></div>`;
S.update.after = () => {
  const info = $("#uinfo"), get = a => fetch(`/api/update?a=${a}`, { headers: { "X-Field": "1" } }).then(r => r.json());
  $("#uwifi").onclick = () => COS.wifiPanel && COS.wifiPanel();
  $("#uboot").ontoggle = async () => { const box = $("#ubootbody"); if (!COS.onTablet) { box.textContent = "Shown on the tablet."; return; }
    let b = {}; try { b = await (await fetch("/api/boot")).json(); } catch (e) { box.textContent = "Couldn't read it."; return; }
    const f = v => v == null ? "?" : `${v} s`;
    box.innerHTML = `<p>Power button to Field OS screen: about <b>${f(Math.round(((b.firmware_s || 0) + (b.loader_s || 0) + (b.screen_s || 0)) * 10) / 10)}</b></p>
      <p>Dell start-up (before Linux): ${f(b.firmware_s)} &middot; boot loader: ${f(b.loader_s)} &middot; Linux until the screen asked: ${f(b.screen_s)}</p>
      <p>Linux: kernel ${f(b.kernel_s)} &middot; start-up disk (initrd) ${f(b.initrd_s)} &middot; services ${f(b.userspace_s)}</p>
      ${Object.keys(b.marks || {}).length ? `<p>Timeline (seconds after Linux started): ${["login", "session", "sway", "fieldd", "app", "browser", "ready"].filter(k => b.marks[k] != null).map(k => `${({ login: "signed in", session: "session", sway: "screen program", fieldd: "Field OS service", app: "app starter", browser: "browser", ready: "shown" })[k]} ${b.marks[k]}`).join(" &middot; ")} &middot; Field OS page ${f(b.screen_s)}</p>` : ""}
      ${(b.chain || []).length ? `<p>What sign-in waited for:</p><pre style="white-space:pre-wrap;font-size:.8rem">${esc(b.chain.join("\n"))}</pre>` : ""}
      ${(b.slowest || []).length ? `<p>Slowest parts of Linux start-up:</p><pre style="white-space:pre-wrap;font-size:.8rem">${esc(b.slowest.join("\n"))}</pre>` : ""}`; };
  const net = async () => { const t = $("#unettext"); if (!t) return null;
    if (!COS.onTablet) { t.textContent = "Wi-Fi: (laptop mock-up)"; return null; }
    let st = {}; try { st = await (await fetch("/api/wifi?a=status", { headers: { "X-Field": "1" } })).json(); } catch (e) { st = {}; }
    t.innerHTML = st.connected ? `Wi-Fi: connected to <b>${esc(st.connected)}</b>` : st.radio === false ? "Wi-Fi is <b>off</b>. Tap Wi-Fi settings to turn it on." : "Wi-Fi: <b>not connected</b>. Tap Wi-Fi settings to pick your network.";
    return st; };
  net(); const timer = setInterval(() => { if (!$("#unettext")) clearInterval(timer); else net(); }, 5000);
  $("#ucheck").onclick = async () => { if (!COS.onTablet) { info.textContent = "This works on the tablet. (This is the laptop mock-up.)"; return; }
    COS.loading(true, "Checking for updates..."); let r; try { r = await get("check"); } catch (e) { r = { ok: false, error: "Could not check." }; } COS.loading(false);
    if (!r.ok) { const st = await net(); info.innerHTML = `${esc(r.error || "Could not check.")}${st && !st.connected ? "<br><b>The tablet isn't on Wi-Fi yet.</b> Tap Wi-Fi settings above." : "<br>Check that the laptop is on, awake and on the same Wi-Fi, then try again."}`; return; }
    info.innerHTML = r.update ? `<b>Update ready:</b> ${esc(r.latest)}<br>${esc(r.notes || "")}<br><span class="sub">You have ${esc(r.current)}</span>` : `You're up to date (${esc(r.current)}).`;
    $("#uapply").hidden = !r.update; };
  $("#uapply").onclick = async () => { COS.loading(true, "Installing update..."); let r; try { r = await get("apply"); } catch (e) { r = { ok: true }; }
    if (r.ok) COS.loading(true, "Updated. Restarting Field OS..."); else { COS.loading(false); info.textContent = r.error || "Update failed."; } };
};

/* ---------------- downloads ---------------- */
const SAMPLE_DL = [["Acme-Home-Services-W9.pdf", "document", "2026-11-12", "120 KB"], ["deck-stain-spec-sheet.pdf", "document", "2026-11-11", "860 KB"],
  ["floor-plan-unit2.png", "photo", "2026-11-11", "1.2 MB"], ["app-installer.tar.gz", "archive", "2026-11-12", "181 MB"]];
S.downloads = () => `<div class="pagehead"><h1>${ic("download")} Downloads</h1><button class="btn ghost" id="dlopen">${ic("folder")} Open folder</button></div>
  <p class="sub">Everything the browser downloads lands here.</p>
  <div class="list">${SAMPLE_DL.map(([n, k, d, s]) => `<div class="row"><div class="mini">${ic(k === "photo" ? "camera" : k === "archive" ? "zip" : "file")}</div><div class="grow"><b>${esc(n)}</b><div class="sub">${esc(d)} &middot; ${esc(s)}</div></div>
    <button class="btn small ghost" data-dl="${esc(n)}">Open</button></div>`).join("")}</div>
  <p class="mock" style="margin-top:10px">Sample list. On the tablet this shows the owner's real Downloads folder (customers never see it).</p>`;
S.downloads.after = () => { $("#dlopen").onclick = () => toast("Opens the Downloads folder on the tablet");
  $$("[data-dl]").forEach(b => b.onclick = () => toast(`Opens ${b.dataset.dl} on the tablet`)); };

/* ---------------- room sketch ---------------- */
function sketch(jobId) {
  const key = () => $("#skjob").value || "none"; let s = D.sketches.find(x => x.job === key()); if (!s) { s = { job: key(), rooms: [] }; D.sketches.push(s); }
  const draw = () => { const g = $("#skc").getContext("2d"), W = 900, H = 620; g.clearRect(0, 0, W, H); g.fillStyle = "#FAF6EE"; g.fillRect(0, 0, W, H);
    const rows = s.rooms.map(r => { const fl = r.l * r.w, wall = 2 * (r.l + r.w) * r.h, trim = 2 * (r.l + r.w);
      return `<tr><td>${esc(r.n)}</td><td class="num">${r.l} x ${r.w} ft</td><td class="num">${fl.toFixed(1)}</td><td class="num">${wall.toFixed(1)}</td><td class="num">${trim.toFixed(1)}</td></tr>`; });
    $("#skrows").innerHTML = rows.join("") || `<tr><td colspan="5" class="sub">No rooms yet.</td></tr>`;
    const T = s.rooms.reduce((a, r) => [a[0] + r.l * r.w, a[1] + 2 * (r.l + r.w) * r.h, a[2] + 2 * (r.l + r.w)], [0, 0, 0]);
    $("#sktot").innerHTML = `<td>Total</td><td></td><td class="num">${T[0].toFixed(1)}</td><td class="num">${T[1].toFixed(1)}</td><td class="num">${T[2].toFixed(1)}</td>`;
    if (!s.rooms.length) return; const totalW = s.rooms.reduce((a, r) => a + r.l, 0) + (s.rooms.length - 1) * 2, maxH = Math.max(...s.rooms.map(r => r.w));
    const k = Math.min((W - 60) / totalW, (H - 80) / maxH); let x = 30;
    s.rooms.forEach(r => { g.strokeStyle = "#09350C"; g.lineWidth = 4; g.fillStyle = "#E6EEE4"; g.fillRect(x, 40, r.l * k, r.w * k); g.strokeRect(x, 40, r.l * k, r.w * k);
      g.fillStyle = "#09350C"; g.font = "bold 20px sans-serif"; g.fillText(r.n, x + 10, 70); g.font = "16px sans-serif"; g.fillStyle = "#8F7023";
      g.fillText(`${r.l} ft`, x + r.l * k / 2 - 18, 32); g.save(); g.translate(x + r.l * k + 18, 40 + r.w * k / 2 + 12); g.rotate(-Math.PI / 2); g.fillText(`${r.w} ft`, 0, 0); g.restore(); x += (r.l + 2) * k; }); };
  $("#skjob").onchange = () => { s = D.sketches.find(x => x.job === key()); if (!s) { s = { job: key(), rooms: [] }; D.sketches.push(s); } draw(); };
  $("#skadd").onclick = () => { const r = { n: $("#skn").value || "Room", l: parseFloat($("#skl").value), w: parseFloat($("#skw").value), h: parseFloat($("#skh").value) || 8 };
    if (!(r.l > 0 && r.w > 0)) { toast("Enter length and width"); return; } s.rooms.push(r);
    const j = job($("#skjob").value); if (j) j.measurements.push({ what: r.n, value: `${r.l} ft x ${r.w} ft, ${r.h} ft ceiling` }); save(); draw(); };
  draw();
}

/* ---------------- camera ---------------- */
function camera() {
  let cams = [], camIx = 0, stream = null; const v = $("#cv");
  const start = async () => { if (stream) stream.getTracks().forEach(t => t.stop());
    try { const want = cams.length ? { deviceId: { exact: cams[camIx % cams.length].deviceId } } : true;
      stream = await navigator.mediaDevices.getUserMedia({ video: want, audio: true }).catch(() => navigator.mediaDevices.getUserMedia({ video: want }));
      if (!cams.length) { cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");   // every camera the tablet has (front + rear)
        const cur = stream.getVideoTracks()[0].getSettings().deviceId; camIx = Math.max(0, cams.findIndex(c => c.deviceId === cur)); }
      $("#flip").textContent = cams.length > 1 ? `Switch camera (${(camIx % cams.length) + 1} of ${cams.length})` : "Only one camera found";
      v.srcObject = stream; v.muted = true; $("#cmsg").textContent = ""; }
    catch (e) { $("#cmsg").textContent = "Camera not available here. On the tablet this uses the built-in cameras."; } };
  $("#flip").onclick = () => { if (cams.length > 1) { camIx++; start(); } };
  $("#snap").onclick = () => { if (!v.videoWidth) { toast("No camera picture yet"); return; } const c = document.createElement("canvas"), k = 220 / Math.max(v.videoWidth, v.videoHeight);
    c.width = v.videoWidth * k; c.height = v.videoHeight * k; c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); const url = c.toDataURL("image/jpeg", .7);
    const d = document.createElement("div"); d.className = "ph"; d.style.backgroundImage = `url(${url})`; $("#shots").append(d);
    const j = job($("#cjob").value); addMedia("photo", `photo-${Date.now()}.jpg`, j, url); toast(j ? "Saved to job" : "Saved to Gallery"); };
  let vr = null, vchunks = [];
  $("#vrec").onclick = () => { if (!stream) { toast("No camera here"); return; }
    if (vr && vr.state === "recording") { vr.stop(); return; }
    vr = new MediaRecorder(stream); vchunks = []; vr.ondataavailable = e => vchunks.push(e.data);
    vr.onstop = () => { $("#vrec").innerHTML = "&#9679; Record video"; const url = URL.createObjectURL(new Blob(vchunks, { type: vr.mimeType })), j = job($("#cjob").value);
      MEDIA_URLS[addMedia("video", `video-${Date.now()}.webm`, j)] = url; const d = document.createElement("video"); d.src = url; d.controls = true; d.className = "ph"; $("#shots").append(d); toast(j ? "Video saved to job" : "Video saved"); };
    vr.start(); $("#vrec").textContent = "Stop video"; };
  window.addEventListener("hashchange", () => { if (vr && vr.state === "recording") vr.stop(); stream && stream.getTracks().forEach(t => t.stop()); }, { once: true });
  start();
}

/* ---------------- sound recorder ---------------- */
const clips = [];
function recorder() {
  let rec = null, chunks = [], t0 = 0, timer = null;
  const list = () => { $("#rlist").innerHTML = clips.map(c => `<div class="row"><div class="grow"><b>${esc(c.name)}</b><div class="sub">${esc(c.job)}</div></div><audio controls src="${c.url}"></audio></div>`).join("") || `<div class="row sub">No recordings yet.</div>`; };
  $("#rec").onclick = async () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); rec = new MediaRecorder(st); chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => { st.getTracks().forEach(t => t.stop()); clearInterval(timer); $("#rdot").hidden = true; $("#rec").innerHTML = `${ic("mic")} Record`;
        const j = job($("#rjob").value); const name = `Voice note ${new Date().toLocaleTimeString()}`;
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })); clips.push({ name, job: j ? j.title : "No job", url });
        MEDIA_URLS[addMedia("audio", `${name}.webm`, j)] = url;
        if (j) { j.notes.push({ when: today(), text: `[${name}] voice note recorded` }); save(); } list(); toast("Recording saved"); };
      rec.start(); t0 = Date.now(); $("#rdot").hidden = false; $("#rec").innerHTML = "Stop";
      timer = setInterval(() => { $("#rtime").textContent = Math.round((Date.now() - t0) / 1000) + " s"; }, 500);
    } catch (e) { toast("Microphone not available here. On the tablet this uses the built-in mic."); } };
  list();
}

/* ---------------- backups ---------------- */
function backupFiles() {
  const enc = new TextEncoder(), files = [];
  const data = {}; ["customers", "jobs", "prospects", "signing", "uploads", "vault", "schedule", "materials", "priceDate", "books", "emailTemplates", "notes", "sketches", "rates"].forEach(k => data[k] = D[k]);
  files.push(["field-data.json", enc.encode(JSON.stringify(data, null, 2))]);
  files.push(["README.txt", enc.encode(`Field OS offline backup made ${new Date().toLocaleString()}.\nfield-data.json holds every customer, job, document record, schedule, book entry and setting.\nphotos/ holds the photo copies. Restore with Apps > Offline backup on the tablet.\n`)]);
  D.uploads.forEach(u => { if (u.thumb && u.thumb.startsWith("data:image/jpeg;base64,")) files.push([`photos/${u.customer}/${u.id}-${u.name.replace(/[^\w.-]/g, "_")}`, Uint8Array.from(atob(u.thumb.split(",")[1]), ch => ch.charCodeAt(0))]); });
  return files;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) {   // plain "stored" zip (no compression): opens in any zip tool, on Ubuntu, Windows, Android
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, data] of files) { const nb = enc.encode(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    parts.push(h, nb, data); const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nb.length, true); c.setUint32(42, off, true); central.push(c, nb); off += 30 + nb.length + data.length; }
  const csize = central.reduce((a, p) => a + p.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e], { type: "application/zip" });
}
window.COS.makeZip = makeZip; window.COS.backupFiles = backupFiles;
})();

/* ---------------- More info: plain-English guides (web/info/index.json lists them; each is a Markdown file) ---------------- */
(() => {
const { S, $, esc, ic } = window.COS;
const md = text => {                       // small, safe Markdown: headings, lists, tables, links, bold, italics, paragraphs
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\W)\*(\S.*?)\*(?=\W|$)/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g, "<code>$1</code>");
  const out = []; let list = null, table = null;
  const flush = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${i}</li>`).join("")}</${list.t}>`); list = null; }
    if (table) { out.push(`<div class="tablewrap"><table class="tbl">${table.map((r, i) => `<tr>${r.map(c => i ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join("")}</tr>`).join("")}</table></div>`); table = null; } };
  for (const raw of text.split("\n")) {
    const l = raw.trimEnd(), h = l.match(/^(#{1,4})\s+(.*)/), li = l.match(/^\s*([-*]|\d+\.)\s+(.*)/);
    if (/^\|.*\|$/.test(l.trim())) { if (/^\|[\s:|-]+\|$/.test(l.trim())) continue; (table = table || []).push(l.trim().slice(1, -1).split("|").map(c => c.trim())); continue; }
    if (h) { flush(); out.push(`<h${Math.min(4, h[1].length + 1)}>${inline(h[2])}</h${Math.min(4, h[1].length + 1)}>`); }
    else if (li) { const t = /\d/.test(li[1]) ? "ol" : "ul"; if (!list || list.t !== t) { flush(); list = { t, items: [] }; } list.items.push(inline(li[2])); }
    else if (!l.trim()) flush();
    else { if (list || table) flush(); out.push(`<p>${inline(l)}</p>`); }
  }
  flush(); return out.join("\n");
};
S.info = (id) => `<div class="pagehead"><h1>${ic("info")} More info</h1></div><div id="infobox"><div class="card"><p class="sub">Loading...</p></div></div>`;
S.info.after = async (id) => {
  const box = $("#infobox"); let idx = [];
  try { idx = await (await fetch("info/index.json")).json(); } catch (e) { idx = []; }
  if (!id) { box.innerHTML = idx.length ? `<div class="list">${idx.map(g => `<a class="row" href="#/info/${esc(g.id)}"><div class="grow"><b>${esc(g.title)}</b><div class="sub">${esc(g.summary || "")}</div></div>${g.status ? `<span class="pill gold">${esc(g.status)}</span>` : ""}</a>`).join("")}</div>`
      : `<div class="card"><p>No guides yet.</p></div>`; return; }
  const g = idx.find(x => x.id === id);
  if (!g) { box.innerHTML = `<div class="card"><p>Guide not found.</p></div>`; return; }
  try { const t = await (await fetch("info/" + g.file)).text(); box.innerHTML = `<article class="card guide">${md(t)}</article>`; }
  catch (e) { box.innerHTML = `<div class="card"><p>Could not open this guide.</p></div>`; }
};
window.COS.markdown = md;
})();
