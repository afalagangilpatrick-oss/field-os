# Field OS

Field OS is a touch-first tablet shell and business app for a small field-service business, such as a
home-repair or handy-person company. It is what the owner carries to every job: customers, quotes,
signatures, scheduling, bookkeeping and materials pricing in one full-screen app built for big fingers
and work gloves.

This repository holds the **web front end as a self-contained mock-up**: plain HTML, CSS and vanilla
JavaScript, with sample data, no build step and no server.

## What is in it

- **Login with two modes.** *Owner* (PIN or password) reaches everything. *Customer* hands the tablet
  to the client, who can only see their own side: sign documents, upload photos, view invoices.
- **Customers and job pages.** Each customer has a profile and jobs; each job page has tabs for
  overview, repairs, measurements, photos, documents, notes and time.
- **Prospects.** Website quote requests and calls, converted to customers in one tap.
- **Schedule.** A month calendar of booked work.
- **Sign & Send.** Quotes, work orders, invoices and agreements sent to the customer side for signature.
- **Emails.** Write, inbox, business and partner mail, and reusable templates with an email signature.
- **Partners.** Referral partners and which customers each one sent.
- **Rates & Discounts.** The owner's private rate sheet: hourly, flat-rate jobs, reduced rates, discounts.
- **Bookkeeping.** Income, expenses and mileage with CSV export.
- **Repair Guide.** Several hundred common repairs with size, rough material cost, materials and links.
- **Materials.** A price comparison between two suppliers' price sheets, quantities and job totals,
  plus a searchable store price book.
- **Utilities.** Camera, gallery, calculator, notepad, room sketch, sound recorder, flashlight, card
  payment, maps and mileage, offline and cloud backup, fingerprint reader, keyboard size, batteries,
  card reader, dock and screens, GPS, phone sync and OS updates.
- **Quick settings.** A drop-down for volume, brightness, Wi-Fi, auto-lock, screen sleep, Bluetooth,
  rotation lock, keyboard, night light, airplane mode and power.
- **On-screen keyboard settings.** Key size and keyboard height for touch use.
- **Local Files, More info and Private.** A file browser, plain-language guides, and a separate
  password-protected area for anything a customer "deleted".

## Design

- **Tokens first.** Every colour, radius, tap size, rail width and font is a CSS custom property in
  `:root` at the top of `web/css/field.css`; changing the look means changing tokens.
- **Palette.** Deep green (`#09350C`, `#1E5A24`), gold (`#A6822A`, `#E2C45C`) and warm cream
  (`#FAF6EE`), with a muted red for warnings.
- **Type.** Serif headings in Alegreya, body text in Source Sans 3. Both fonts are bundled so the
  tablet works offline.
- **Touch-first sizing.** A 56 px minimum tap target, a 17 px base font, large tiles, a fixed side
  rail and top bar, and layouts that adapt to landscape, portrait and small screens.

## Running it

Open `web/index.html` in a browser, straight from disk (`file://`). There is nothing to install or
build. Sign in as **Owner** with any 4-digit PIN (no PIN is set in the demo), or as **Customer**.

A few parts call a local tablet service (`/api/...`) that is not part of this repository. In the
mock-up those calls fail quietly and the screens show sample values instead. The More info guides are
loaded with `fetch()`, which browsers block for `file://` pages; serve the folder over HTTP (for
example `python3 -m http.server` inside `web/`) to see them.

## Data

All people, businesses, addresses, phone numbers, prices and suppliers in this repository are
fictional sample data (phone numbers use the 555 range, email addresses use `example.com`). Changes
you make in the demo are saved only in your own browser's local storage.

## Not in this repository

The full system also includes an Ubuntu autoinstall image that turns a rugged tablet into a
dedicated Field OS device, the local service behind the `/api` calls, and a phone build of the same
app. Those are not part of this public copy.

## License

Code: MIT, see `LICENSE`. Fonts: SIL Open Font License 1.1, see `web/assets/fonts/OFL.txt`.
