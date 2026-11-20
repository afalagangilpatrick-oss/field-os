/* Field OS mock-up data. Everything here is SAMPLE data (fake customers, sample prices) so the screens
   can be designed. The real app will read the same shapes from a local database (see docs/PLAN.md). */
const yt = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
const guide = q => "https://duckduckgo.com/?q=" + encodeURIComponent(q + " step by step guide");

window.FIELD = {
  owner: { name: "Alex", business: "Acme Home Services LLC", zip: "00010", email: "owner@example.com" },

  customers: [
    { id: "c1", name: "Dana Whitfield", phone: "(555) 555-0142", email: "dana.w@example.com", address: "12 Maple St, Riverton, ST 00010",
      referral: true, referredBy: "Tidy Spaces Co.", preferred: "Text", since: "2026-11-10", notes: "Two dogs, side door. Prefers mornings.",
      license: { number: "Sample 123456", state: "ST", expires: "2029-04-30" } },
    { id: "c2", name: "Marcus Lee", phone: "(555) 555-0177", email: "mlee@example.com", address: "88 Fairview Rd, Millbrook, ST 00020",
      referral: false, referredBy: "", preferred: "Email", since: "2026-11-11", notes: "Rental property owner (3 units)." },
    { id: "c3", name: "Patricia Gomez", phone: "(555) 555-0190", email: "pgomez@example.com", address: "4 Pine Hill Ln, Oak Hill, ST 00030",
      referral: true, referredBy: "Neighbor (Dana Whitfield)", preferred: "Call", since: "2026-11-12", notes: "Senior 65+ (reduced rate)." },
  ],

  stages: ["New inquiry", "Assessing", "Quote sent", "Agreement pending", "Scheduled", "In progress", "Ready to invoice", "Paid"],

  jobs: [
    { id: "j1", customer: "c1", title: "Bathroom drywall + door repair", stage: 5, created: "2026-11-10", address: "12 Maple St, Riverton",
      details: "Patch doorknob hole behind bathroom door, rehang sticking door, add door stop. Customer supplies paint.",
      repairs: ["r-drywall-small", "r-door-adjust", "r-doorstop"],
      measurements: [{ what: "Hole behind door", value: "4 in x 3 in" }, { what: "Door width", value: "30 in" }],
      photos: ["Before: hole behind door", "Door gap at top", "After: patched + primed"],
      notes: [{ when: "2026-11-10", text: "Came in from website quote form." }, { when: "2026-11-12", text: "Patched and primed. Paint after 24 h." }],
      docs: [{ type: "Quote", no: "Q-1001", status: "Signed", total: 285 }, { type: "Work order", no: "WO-1001", status: "Signed", total: 285 }],
      time: [{ day: "2026-11-12", hours: 1.5 }] },
    { id: "j2", customer: "c1", title: "Deck board replacement", stage: 1, created: "2026-11-12", address: "12 Maple St, Riverton",
      details: "Three soft boards near the steps.", repairs: ["r-deck-board"], measurements: [], photos: ["Soft boards by steps"], notes: [], docs: [], time: [] },
    { id: "j3", customer: "c2", title: "Unit 2 tenant move-out repairs", stage: 2, created: "2026-11-11", address: "88 Fairview Rd Unit 2, Millbrook",
      details: "Patch nail holes, touch-up paint, replace 2 outlet covers, re-caulk tub, fix running toilet.",
      repairs: ["r-nail-holes", "r-caulk-tub", "r-toilet-running", "r-paint-touchup"],
      measurements: [{ what: "Living room walls", value: "14 ft x 12 ft, 8 ft ceiling" }], photos: ["Living room walls", "Tub caulk"],
      notes: [{ when: "2026-11-11", text: "Landlord rate applies." }], docs: [{ type: "Quote", no: "Q-1002", status: "Sent", total: 640 }], time: [] },
    { id: "j4", customer: "c3", title: "Grab bars + faucet swap", stage: 7, created: "2026-11-01", address: "4 Pine Hill Ln, Oak Hill",
      details: "Install 2 grab bars in shower, swap kitchen faucet (customer supplied).", repairs: ["r-grab-bar", "r-faucet"],
      measurements: [], photos: ["Grab bars installed"], notes: [{ when: "2026-11-05", text: "Paid in full, cash." }],
      docs: [{ type: "Invoice", no: "INV-1000", status: "Paid", total: 210 }, { type: "Thank-you letter", no: "TY-1000", status: "Sent", total: 0 }], completed: "2026-11-05",
      time: [{ day: "2026-11-04", hours: 2 }] },
    { id: "j5", customer: "c2", title: "Unit 1 smoke detector batteries + door stops", stage: 7, created: "2026-10-28", address: "88 Fairview Rd Unit 1, Millbrook",
      details: "Swap batteries in 4 detectors, add 3 door stops.", repairs: ["r-doorstop"], measurements: [], photos: [], notes: [], docs: [{ type: "Invoice", no: "INV-0999", status: "Paid", total: 150 }],
      time: [{ day: "2026-10-30", hours: 1 }], completed: "2026-10-30" },
  ],

  prospects: [
    { id: "p1", name: "Kevin Brooks", source: "Website quote form", received: "2026-11-12 09:14", town: "Fairview", phone: "(555) 555-0111",
      email: "kbrooks@example.com", message: "Need 2 interior doors hung and trim fixed. Photos attached.", photos: 2, status: "New" },
    { id: "p2", name: "Sam Ortiz", source: "Website contact form", received: "2026-11-11 18:40", town: "Riverton", phone: "(555) 555-0123",
      email: "sortiz@example.com", message: "Do you do small concrete step repairs?", photos: 0, status: "Replied" },
    { id: "p3", name: "Lisa Chen", source: "Phone call", received: "2026-11-11 13:02", town: "Lakeside", phone: "(555) 555-0166",
      email: "", message: "Kitchen backsplash, about 30 sq ft. Wants a quote next week.", photos: 0, status: "New" },
  ],

  docTypes: ["Quote", "Work order", "Change order", "Invoice", "Final payment notice", "Late payment reminder", "Thank-you letter", "Small job agreement", "Large job contract"],

  /* Documents sent to a customer to sign. They show up on that customer's side of the tablet. */
  signing: [
    { id: "s1", customer: "c2", job: "j3", doc: "Quote Q-1002", total: 640, sent: "2026-11-11", status: "Waiting for signature" },
    { id: "s2", customer: "c1", job: "j1", doc: "Work order WO-1001", total: 285, sent: "2026-11-10", status: "Signed 2026-11-10" },
    { id: "s3", customer: "c1", job: "j2", doc: "Quote Q-1003", total: 420, sent: "2026-11-12", status: "Waiting for signature" },
  ],

  /* Everything a customer uploads is kept, even mistakes. "Delete" on the owner side only hides it (moves it to Private). */
  uploads: [
    { id: "u1", customer: "c1", job: "j2", name: "deck-steps.jpg", kind: "photo", when: "2026-11-12", from: "customer", hidden: false },
    { id: "u2", customer: "c1", job: "j2", name: "blurry-photo.jpg", kind: "photo", when: "2026-11-12", from: "customer", hidden: false },
    { id: "u3", customer: "c3", job: "j4", name: "warranty-card.pdf", kind: "document", when: "2026-11-02", from: "customer", hidden: false },
  ],
  vault: [],

  /* Repair guide sample. size: small | medium | large. cost = rough MATERIALS only (no labor), USD.
     Full list (hundreds of repairs, verified article + video links) comes from js/library.js. */
  repairs: [
    { id: "r-nail-holes", size: "small", cat: "Walls", name: "Fill nail holes", cost: [5, 15], desc: "Fill small holes with spackle, sand smooth, touch up paint.",
      materials: ["Lightweight spackle", "Putty knife", "Sanding sponge", "Touch-up paint"] },
    { id: "r-drywall-small", size: "small", cat: "Walls", name: "Drywall patch (under 6 in)", cost: [10, 25], desc: "Self-adhesive mesh patch or California patch, two coats of compound, sand, prime.",
      materials: ["Drywall patch kit", "Joint compound", "Taping knife", "Sanding sponge", "Primer"] },
    { id: "r-drywall-large", size: "medium", cat: "Walls", name: "Drywall repair (large hole / water damage)", cost: [40, 120], desc: "Cut back to studs, add backing, screw in new drywall, tape, three coats, sand, prime.",
      materials: ["1/2 in drywall sheet", "Drywall screws", "Paper or mesh tape", "Joint compound", "Furring strips", "Primer"] },
    { id: "r-paint-touchup", size: "small", cat: "Paint", name: "Paint touch-up (per room)", cost: [25, 60], desc: "Clean, spot-prime repairs, cut in and roll affected walls.",
      materials: ["Interior paint", "Primer", "Roller + covers", "Angled brush", "Painter's tape", "Drop cloth"] },
    { id: "r-door-adjust", size: "small", cat: "Doors", name: "Fix sticking / sagging door", cost: [5, 20], desc: "Tighten or replace hinge screws (3 in into stud), shim hinges, plane edge if needed.",
      materials: ["3 in hinge screws", "Cardboard or hinge shims", "Wood glue + toothpicks"] },
    { id: "r-doorstop", size: "small", cat: "Doors", name: "Install door stop", cost: [3, 12], desc: "Spring or hinge-pin door stop to protect the wall.", materials: ["Door stop"] },
    { id: "r-door-hang", size: "medium", cat: "Doors", name: "Hang pre-hung interior door", cost: [120, 350], desc: "Remove old unit, set, level and shim new pre-hung door, nail, reinstall casing.",
      materials: ["Pre-hung interior door", "Shims", "Finish nails", "Casing / trim", "Wood filler", "Caulk"] },
    { id: "r-caulk-tub", size: "small", cat: "Bathroom", name: "Re-caulk tub or shower", cost: [10, 25], desc: "Remove old caulk, clean, dry, apply 100% silicone kitchen & bath caulk.",
      materials: ["Silicone kitchen & bath caulk", "Caulk remover", "Utility blade", "Rubbing alcohol"] },
    { id: "r-toilet-running", size: "small", cat: "Plumbing", name: "Fix running toilet", cost: [10, 35], desc: "Replace flapper and/or fill valve; adjust chain and float.",
      materials: ["Toilet flapper", "Fill valve", "Supply line"] },
    { id: "r-faucet", size: "small", cat: "Plumbing", name: "Replace faucet (fixture swap)", cost: [15, 40], desc: "Shut off, disconnect, install new faucet, new supply lines, test for leaks.",
      materials: ["Faucet (customer or supplied)", "Braided supply lines", "Plumber's putty", "Teflon tape"] },
    { id: "r-grab-bar", size: "small", cat: "Bathroom", name: "Install grab bar", cost: [25, 70], desc: "Locate studs or use rated anchors, mount at code height, seal screw holes in tile.",
      materials: ["Grab bar", "Wing-it / rated anchors", "Silicone", "Tile bit"] },
    { id: "r-deck-board", size: "medium", cat: "Exterior", name: "Replace deck boards", cost: [40, 150], desc: "Remove rotted boards, check joists, cut and fasten new boards with deck screws.",
      materials: ["Pressure-treated deck boards", "Deck screws", "Joist tape", "Wood sealer"] },
    { id: "r-backsplash", size: "medium", cat: "Kitchen", name: "Tile backsplash (about 30 sq ft)", cost: [200, 500], desc: "Prep wall, layout, set tile with mastic or thinset, grout, seal, caulk edges.",
      materials: ["Tile", "Thinset or mastic", "Grout", "Spacers", "Grout sealer", "Caulk"] },
    { id: "r-floor-lvp", size: "large", cat: "Flooring", name: "Install LVP flooring (one room)", cost: [400, 1200], desc: "Remove old floor, level subfloor, underlayment, click-lock LVP, transitions, base trim.",
      materials: ["Luxury vinyl plank", "Underlayment", "Transition strips", "Quarter round", "Finish nails"] },
    { id: "r-bath-refresh", size: "large", cat: "Bathroom", name: "Bathroom refresh (vanity, fixtures, paint)", cost: [600, 2000], desc: "Swap vanity and top, faucet, toilet, lighting by licensed electrician, paint, caulk.",
      materials: ["Vanity + top", "Faucet", "Toilet", "Wax ring", "Supply lines", "Paint", "Caulk"] },
    { id: "r-concrete-patch", size: "small", cat: "Exterior", name: "Patch concrete step / crack", cost: [15, 45], desc: "Clean and chisel, bonding adhesive, vinyl concrete patcher, trowel smooth, cure.",
      materials: ["Vinyl concrete patcher", "Concrete bonding adhesive", "Wire brush", "Trowel"] },
  ].map(r => ({ ...r, links: [
      { label: "Video how-to", url: yt("how to " + r.name) },
      { label: "Step-by-step guide", url: guide("how to " + r.name) } ] })),

  /* Materials catalog sample. prices = today's price per ONE unit at Supplier A and Supplier B (SAMPLE numbers).
     "Update prices" fetches new ones only when you tap it; it never updates by itself. */
  stores: ["Supplier A", "Supplier B"],
  manualStores: [],
  priceDate: "2026-11-12 (sample)",
  materials: [
    { id: "m1", cat: "Drywall", name: "Drywall sheet 1/2 in x 4 x 8 ft", unit: "sheet", prices: [15.98, 15.48] },
    { id: "m2", cat: "Drywall", name: "Joint compound, all-purpose, 4.5 gal", unit: "pail", prices: [21.98, 22.48] },
    { id: "m3", cat: "Drywall", name: "Mesh drywall tape, 300 ft", unit: "roll", prices: [7.98, 8.28] },
    { id: "m4", cat: "Drywall", name: "Lightweight spackle, 32 oz", unit: "tub", prices: [9.47, 9.98] },
    { id: "m5", cat: "Paint", name: "Interior paint, eggshell, 1 gal", unit: "gal", prices: [38.98, 39.98] },
    { id: "m6", cat: "Paint", name: "Primer, 1 gal", unit: "gal", prices: [24.98, 23.98] },
    { id: "m7", cat: "Paint", name: "Painter's tape, 1.41 in x 60 yd", unit: "roll", prices: [6.98, 7.28] },
    { id: "m8", cat: "Fasteners", name: "Drywall screws 1-5/8 in, 1 lb", unit: "box", prices: [8.97, 9.48] },
    { id: "m9", cat: "Fasteners", name: "Deck screws 3 in, 5 lb", unit: "box", prices: [39.97, 41.98] },
    { id: "m10", cat: "Lumber", name: "Pressure-treated deck board 5/4 x 6 x 8 ft", unit: "board", prices: [11.48, 11.98] },
    { id: "m11", cat: "Lumber", name: "2 x 4 x 8 ft stud", unit: "each", prices: [3.98, 4.15] },
    { id: "m12", cat: "Caulk", name: "Silicone kitchen & bath caulk, 10 oz", unit: "tube", prices: [8.98, 8.48] },
    { id: "m13", cat: "Plumbing", name: "Toilet flapper, universal", unit: "each", prices: [6.98, 7.48] },
    { id: "m14", cat: "Plumbing", name: "Toilet fill valve", unit: "each", prices: [11.97, 12.98] },
    { id: "m15", cat: "Plumbing", name: "Braided faucet supply line, 20 in", unit: "each", prices: [7.47, 7.98] },
    { id: "m16", cat: "Tile", name: "Ceramic subway tile 3 x 6 in", unit: "sq ft", prices: [2.18, 2.29] },
    { id: "m17", cat: "Tile", name: "Thinset mortar, 50 lb", unit: "bag", prices: [18.98, 19.48] },
    { id: "m18", cat: "Tile", name: "Sanded grout, 25 lb", unit: "bag", prices: [21.98, 22.98] },
    { id: "m19", cat: "Flooring", name: "Luxury vinyl plank", unit: "sq ft", prices: [2.49, 2.59] },
    { id: "m20", cat: "Concrete", name: "Vinyl concrete patcher, 40 lb", unit: "bag", prices: [24.98, 25.98] },
  ],

  books: {
    entries: [
      { date: "2026-11-05", type: "Income", cat: "Job payment", desc: "INV-1000 Patricia Gomez (cash)", amount: 210, job: "j4" },
      { date: "2026-11-10", type: "Income", cat: "Deposit", desc: "Q-1001 deposit, Dana Whitfield", amount: 75, job: "j1" },
      { date: "2026-11-09", type: "Expense", cat: "Materials", desc: "Supplier A: patch kit, compound, door stop", amount: 34.71, job: "j1" },
      { date: "2026-11-07", type: "Expense", cat: "Business setup", desc: "State LLC filing fee", amount: 100, job: "" },
      { date: "2026-11-11", type: "Expense", cat: "Tools", desc: "Oscillating multi-tool", amount: 129, job: "" },
      { date: "2026-11-12", type: "Mileage", cat: "Mileage", desc: "Riverton -> Oak Hill -> Riverton (14 mi)", amount: 14, job: "j4" },
    ],
    categories: ["Job payment", "Deposit", "Materials", "Tools", "Fuel", "Mileage", "Insurance", "Advertising", "Phone & internet", "Business setup", "Other"],
    mileageRate: 0.725,                 // fallback only; the books use mileRate(date) below
  },

  emailTemplates: {
    "Auto-reply to a new request": "Hi {first},\n\nThanks for reaching out to Acme Home Services! I got your request about \"{topic}\" and will get back to you within one business day.\n\nIf you have photos of the area, just reply to this email with them attached; it helps me give you a more accurate quote.\n\nThank you,",
    "Quote is ready": "Hi {first},\n\nYour quote for \"{job}\" is ready: {total}. You can review and sign it here: {link}\n\nLet me know if you have any questions.\n\nThank you,",
    "Appointment reminder": "Hi {first},\n\nJust a reminder that I'll be at {address} on {date}. Reply here if anything changes.\n\nSee you then,",
    "Invoice / final payment": "Hi {first},\n\nThank you for choosing Acme Home Services! Your invoice for \"{job}\" is {total}. You can view and pay it here: {link}\n\nThank you,",
    "Thank you + review request": "Hi {first},\n\nThank you for having me out for \"{job}\". If you were happy with the work, a quick Google review would mean a lot to a small local business.\n\nThank you,",
  },

  /* Rates + discounts come from the owner's private guides. On the tablet they are stored locally only. */
  rates: {
    hourly: "$65 - $95 / hr (suggested)", minimum: "$125 service minimum (suggested)", urgent: "1.5x - 2.5x your normal rate",
    small: [["Small job, up to about 1 hour", "$150 flat"], ["Quick fix, about 30 minutes", "$100 flat"], ["Reduced rate (seniors 65+, students, qualifying households)", "$75"]],
    flat: [["TV mount (customer's bracket)", "$75 - $250"], ["Faucet replacement (customer supplies faucet)", "$120 - $300"], ["Drywall patch, small (under 4 in)", "$75 - $150"],
      ["Drywall patch + prime + paint, larger", "$150 - $400"], ["Interior door install (hang)", "$150 - $350"], ["Caulk tub / shower", "$75 - $150"], ["Running toilet repair", "$75 - $175"]],
    reduced: [["Seniors (65+)", "$50 - $75", "Driver's license or ID with birth date"], ["Students", "$50 - $100", "Current student ID or enrollment letter"],
      ["SNAP or Medicaid households", "$60 - $100", "EBT or Medicaid card (just look, don't copy)"], ["Large families", "$50 - $100", "Your judgment; no proof needed"]],
    discounts: [["Veterans / active military", "10% off, or $75 small-job rate", "Already on website (10% larger jobs). VA card, DD-214, or 'Veteran' license"],
      ["First responders (fire, police, EMS)", "10% off", "Badge or work ID"], ["Teachers & school staff", "10% off", "School ID"], ["Healthcare workers / nurses", "10% off", "Work badge"],
      ["People with disabilities", "$75 rate or 10-15% off", "Usually spoken, not advertised"], ["Single parents", "$75 rate or 10% off", "Spoken, your judgment"],
      ["Fuel assistance / LIHEAP, WIC, SSI, housing assistance", "$60 - $100 (same as SNAP)", "Count as 'qualifying household'"],
      ["First-time customer", "10% off or $25 off", "Good for winning new clients"], ["Repeat / loyal customer", "10% off or free 15-min add-on", "After their 2nd or 3rd job"],
      ["Referral (customer refers a friend)", "$25 off next job, or 15% (partner deals)", "Your 15% thank-you coupon matches this"],
      ["Bundle / honey-do list", "5-15% off when booking 3+ tasks or a half/full day", "Saves you drive time"], ["Neighbor / same-street", "10% off for each home booked the same day", "Two jobs, one trip"],
      ["Slow-week / off-season", "10-20% off", "Use to fill gaps in the schedule"], ["Landlords & property managers (volume)", "Set rate, e.g. $125/hr", "For steady repeat work"],
      ["Nonprofits, churches, community groups", "10-20% off or donated hours", "Can be a tax write-off; ask your accountant"]],
  },

  portal: { customer: "c1" },
};

// IRS standard mileage rate by trip date (2026 = 72.5 cents Jan-Jun, 76 cents Jul-Dec); same table as fieldlib/books.py
window.mileRate = d => { d = String(d || new Date().toISOString().slice(0, 10)); return d >= "2026-07-01" ? 0.76 : d >= "2026-01-01" ? 0.725 : d >= "2025-01-01" ? 0.70 : 0.67; };
