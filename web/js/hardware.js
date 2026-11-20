/* Field OS "Tablet hardware" screen (Apps > Tablet hardware): batteries, flashlight, fingerprint reader, card reader,
   dock + external screens, GPS and a hardware summary of the Dell Latitude 7212. On the tablet it talks to fieldd
   (/api/hw, owner only), which runs the hardware scripts in /opt/field/hw. In the laptop mock-up it shows sample values. */
(() => {
"use strict";
const { S, D, $, $$, esc, ic, toast } = window.COS;
const COS = window.COS;
const SAMPLE = {
  battery: { batteries: [{ name: "BAT0", percent: 82, status: "Discharging" }, { name: "BAT1", percent: 64, status: "Discharging" }], ac: false, total_percent: 73 },
  light: { light: "off", led: "white:flash" }, fingerprint: { reader: "Fingerprint reader (sample)", user: "field", enrolled: [] },
  smartcard: { readers: [{ name: "Smart card reader (sample)", card: false, type: "contact" }, { name: "Contactless reader (sample)", card: false, type: "contactless" }] },
  dock: { docked: false, external: 0, outputs: [{ name: "eDP-1", active: true, make: "Built-in", model: "panel" }] },
  gps: { fix: false, device: null }, hw: { model: "Latitude 7212 Rugged Extreme Tablet (sample)", bios: "-", cameras: ["front", "rear"], sensors: ["accel_3d", "als"], batteries: 2, touch: true, pen: true },
};
const FINGERS = ["right-index-finger", "left-index-finger", "right-thumb", "left-thumb", "right-middle-finger", "left-middle-finger"];
const hw = (part, cmd, arg) => COS.onTablet && COS.tablet ? COS.tablet("hw", part, arg ? cmd + " " + arg : cmd)
  : Promise.resolve(cmd === "status" ? { ok: true, out: SAMPLE[part] } : { ok: true, out: {}, sample: true });
const yes = b => b ? `<span class="pill green">yes</span>` : `<span class="pill gray">no</span>`;
const card = (id, title, icon) => `<div class="card" id="hw-${id}"><h3>${ic(icon)} ${title}</h3><div class="hwbody sub">Checking...</div></div>`;

const PARTS = { battery: ["Batteries", "battery"], light: ["Flashlight", "flash"], fingerprint: ["Fingerprint reader", "finger"], smartcard: ["Card reader", "card"],
  dock: ["Dock and screens", "monitor"], gps: ["GPS location", "pin"], hw: ["This tablet", "shield"] };
if (COS.onPhone) Object.assign(PARTS, { battery: ["Battery", "battery"], smartcard: ["NFC / tap to pay", "card"], dock: ["Screens", "monitor"], hw: ["This phone", "shield"] });
S.hardware = (part) => { if (!PARTS[part]) { location.replace("#/utilities"); return ""; }
  return `<div class="pagehead"><h1>${ic(PARTS[part][1])} ${PARTS[part][0]}</h1><button class="btn ghost" id="hwre">${ic("refresh")} Check again</button></div>
  ${COS.onTablet ? "" : `<p class="mock">Sample values. The real readings show on the tablet.</p>`}
  <div style="max-width:720px">${card(part, PARTS[part][0], PARTS[part][1])}</div>`; };

const draw = {
  battery: o => `${(o.batteries || []).map(b => `<div><b>${esc(b.name)}</b>: ${b.percent ?? "?"}% (${esc(b.status || "")})</div>`).join("") || "No battery found"}
    <div style="margin-top:6px">Plugged in: ${yes(o.ac)} ${o.total_percent != null ? `· Total <b>${o.total_percent}%</b>` : ""}</div>
    ${COS.onPhone ? "" : `<div class="sub" style="margin-top:6px">The 7212 takes two batteries; you can swap one while the other keeps it running.</div>`}`,
  light: o => o.light === "none" ? `<div>The rear camera has a flash LED, but Linux on this tablet doesn't reach it yet.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn green" id="screenlight">Use the screen as a light</button>
    <button class="btn ghost" data-hw="light" data-cmd="probe">Check the camera flash</button></div><div id="lightprobe" class="sub" style="margin-top:8px"></div>` :
    `<div>The light is <b>${o.light === "on" ? "ON" : "off"}</b></div><div style="margin-top:8px"><button class="btn" data-hw="light" data-cmd="${o.light === "on" ? "off" : "on"}">${o.light === "on" ? "Turn off" : "Turn on"}</button></div>`,
  fingerprint: o => COS.onPhone ? `<div>${esc(o.reader || "Fingerprint")}: ${o.enrolled && o.enrolled.length ? "<b>set up</b>" : "<b>no fingerprint saved yet</b>"}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" data-hw="fingerprint" data-cmd="enroll">Fingerprint settings</button>
    ${o.enrolled && o.enrolled.length ? `<button class="btn ghost" data-hw="fingerprint" data-cmd="verify">Test my finger</button>` : ""}</div>
    <div class="sub" style="margin-top:6px">Android keeps your fingerprints. Field OS asks Android to check one, to unlock the owner side.</div>` :
    !o.reader ? "No fingerprint reader found (or its program isn't installed yet)." :
    `<div>${esc(o.reader)}</div><div style="margin-top:6px">Saved fingers: <b>${(o.enrolled || []).length ? o.enrolled.map(esc).join(", ") : "none yet"}</b></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><select class="in" id="hwfinger" style="max-width:220px;margin:0">${FINGERS.map(f => `<option value="${f}">${f.replace(/-/g, " ")}</option>`).join("")}</select>
    <button class="btn" data-hw="fingerprint" data-cmd="enroll">Save a finger</button>${(o.enrolled || []).length ? `<button class="btn ghost" data-hw="fingerprint" data-cmd="verify">Test my finger</button>` : ""}</div>
    <div class="sub" style="margin-top:6px">Saving a finger: press the same finger on the reader several times when asked.</div>`,
  smartcard: o => COS.onPhone ? `<div>NFC (contactless): ${o.nfc === "on" ? `<span class="pill green">on</span>` : o.nfc === "off" ? `<span class="pill gray">off</span>` : "not found"}</div>
    <div class="sub" style="margin-top:6px">Tap to Pay apps (card reader apps) use it to take card taps. Field OS doesn't read cards itself.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><a class="btn" href="#/tool/cardpay">Card payment</a><button class="btn ghost" data-hw="smartcard" data-cmd="settings">NFC settings</button></div>` :
    (o.readers || []).length ? o.readers.map(r => `<div><b>${esc(r.name)}</b> (${esc(r.type)}) · card in: ${yes(r.card)}</div>`).join("") : "No card reader found (or its program isn't installed yet).",
  dock: o => COS.onPhone ? `${(o.outputs || []).map(x => `<div><b>${esc(x.name)}</b>: ${esc(x.size || "")} ${x.active ? "(showing Field OS)" : ""}</div>`).join("")}
    <div class="sub" style="margin-top:6px">Field OS fits whichever screen is in use: folded (cover screen) or opened (inner screen). To show it on a TV, use Android's Cast / screen share.</div>
    <div style="margin-top:8px"><button class="btn ghost" data-hw="dock" data-cmd="extend">Cast / screen share settings</button></div>` :
    `<div>Docked: ${yes(o.docked)} · Extra screens: <b>${o.external || 0}</b></div>${(o.outputs || []).map(x => `<div class="sub">${esc(x.name)}: ${esc([x.make, x.model].filter(Boolean).join(" "))} ${x.active ? "(on)" : "(off)"}</div>`).join("")}
    ${o.external ? `<div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-hw="dock" data-cmd="extend">Use all screens</button><button class="btn ghost" data-hw="dock" data-cmd="internal">Tablet screen only</button></div>` : ""}`,
  gps: o => o.fix ? `<div><b>${(+o.lat).toFixed(5)}, ${(+o.lon).toFixed(5)}</b> · ${o.sats ?? "?"} satellites</div>
    <div style="margin-top:8px"><a class="btn needs-net" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(o.lat + "," + o.lon)}">Show on the map</a></div>`
    : o.device ? `GPS found, no position yet. Go near a window or outside and tap Check again.` : `No GPS receiver found. (Only some 7212s have the GPS option.)`,
  hw: o => `<div><b>${esc(o.model || "?")}</b></div><div class="sub">BIOS ${esc(o.bios || "?")}</div>
    <div style="margin-top:6px">Cameras: ${esc((o.cameras || []).join(", ") || "none found")}</div><div>Touch: ${yes(o.touch)} · Pen: ${yes(o.pen)} · Batteries: ${o.batteries ?? "?"}</div>
    <div class="sub">Sensors: ${esc((o.sensors || []).join(", ") || "none found")}</div>`,
};
const load = part => hw(part, "status").then(r => { const el = $(`#hw-${part} .hwbody`); if (!el) return;
  const o = r && r.out; el.classList.toggle("sub", !o);
  el.innerHTML = o ? draw[part](o) : `Couldn't read this part${r && r.err ? ": " + esc(r.err) : ""}.`; bind(el); });
// screen light: a white full screen at full brightness; tap anywhere to put it away (brightness goes back)
const screenLight = () => { const d = document.createElement("div"); d.className = "screenlight"; d.innerHTML = "<span>Tap to turn off</span>"; document.body.append(d);
  const KEY = "field-os-quick"; let before = 70; try { before = (JSON.parse(localStorage.getItem(KEY)) || {}).brightness || 70; } catch (e) { /* default */ }
  if (COS.onTablet && COS.tablet) COS.tablet("do", "brightness", "100");
  d.onclick = () => { d.remove(); if (COS.onTablet && COS.tablet) COS.tablet("do", "brightness", String(Math.max(5, before))); }; };
const bind = el => { const sl = $("#screenlight", el); if (sl) sl.onclick = screenLight; $$("[data-hw]", el).forEach(b => b.onclick = () => { const part = b.dataset.hw, cmd = b.dataset.cmd;
  const arg = cmd === "enroll" ? $("#hwfinger").value : "";
  if (cmd === "enroll" || cmd === "verify") toast("Put your finger on the reader...");
  if (cmd === "probe") { b.disabled = true; hw(part, cmd).then(r => { b.disabled = false; const o = r && r.out, el2 = $("#lightprobe"); if (!el2) return;
    el2.innerHTML = !o ? "Works on the tablet only." : `Lights found: ${esc((o.leds || []).join(", ") || "none")}<br>` + (o.cameras || []).map(c => `${esc(c.dev)} ${esc(c.name || "")}: ${esc((c.controls || []).join("; ") || "no flash control")}`).join("<br>"); }); return; }
  b.disabled = true; hw(part, cmd, arg).then(r => { b.disabled = false;
    toast(r && r.sample ? "Works on the tablet only" : r && r.ok ? "Done" : "That didn't work" + (r && r.err ? ": " + r.err : "")); load(part); }); }); };
S.hardware.after = (part) => { if (!draw[part]) return; load(part); $("#hwre").onclick = () => load(part); };
})();
