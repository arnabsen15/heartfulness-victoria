# Heartfulness Victoria

Calm, mobile-first static landing site for community Heartfulness group meditations across Melbourne and Victoria (Australia).

Pure HTML, CSS, and JavaScript. Events are loaded from `data/events.json` via `fetch` — edit that file to add or update sessions. No build step, no paid dependencies, no scraped logos.

## Project layout

```
heartfulness-victoria/
├── index.html          # Main landing page
├── css/styles.css      # Styles (navy/blue Heartfulness palette)
├── js/main.js          # Loads, sorts, and groups events
├── data/events.json    # Editable events list
├── fonts/              # Avenir Book (body)
├── images/             # Event flyer images
└── README.md           # This file
```

## Preview locally

Browsers block `fetch()` of local JSON when you open `index.html` as a `file://` URL. Use a static server from the **project root**:

```bash
cd /workspace/heartfulness-victoria
python3 -m http.server 8080
```

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/) in your browser.

Other options:

```bash
npx --yes serve -l 8080
# or
php -S 127.0.0.1:8080
```

## Editing events

Open `data/events.json`. Each event object supports:

| Field | Purpose |
| --- | --- |
| `id` | Stable unique string |
| `title` | Event name |
| `date` | `YYYY-MM-DD` or `null` if no date |
| `endDate` | Optional end date for multi-day events |
| `time` | Display time string (e.g. `2:00 PM`) or empty |
| `recurrence` | e.g. `Every Sunday`, `Every Saturday`, `Every Tuesday` |
| `venue` | Venue name / address |
| `suburb` | Suburb |
| `status` | `upcoming`, `series-ended`, or `ended` |
| `category` | `special` or `weekly` |
| `notes` | Optional note |
| `eventbriteUrl` | Real Eventbrite URL, or `""` — do **not** invent fake URLs |
| `joinUrl` | Zoom / register / library link (optional) |
| `registerBy` | Optional `YYYY-MM-DD` |
| `contactEmail` | Optional contact |
| `image` | Optional flyer path under `images/` |

Special events render as flyer cards. Weekly sessions are grouped by day (Saturdays, Sundays, Tuesdays) in a compact list. Past dates and `series-ended` / `ended` items appear under **Past & ended sessions**.

## Free deploy (no paid plan)

### GitHub Pages

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Source**: Deploy from a branch.
3. Choose `main` (or `master`) and `/ (root)`.
4. Site URL will be `https://<user>.github.io/<repo>/`.

### Netlify (drag-and-drop or Git)

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Drop the `heartfulness-victoria` folder, **or** connect a Git repo and set publish directory to the project root (no build command).

### Cloudflare Pages

1. In Cloudflare Dashboard → **Workers & Pages → Create → Pages**.
2. Connect the Git repo, or use direct upload.
3. Build command: leave empty. Output directory: `/` (project root).

All three serve static files as-is. No Node build is required.

## Accessibility & design notes

- Semantic landmarks, skip link, focus styles, and `prefers-reduced-motion` support.
- Calm navy/soft-blue palette aligned with heartfulness.org (`#173E5F`, `#EEF8FF`, gold CTA `#DEAC43`).
- Body font: Avenir Book (`fonts/Avenir-Book.ttf`); clean sans headings (no heavy uppercase display serif).
- Contact email in the footer: `melbourne@heartfulness.org`.

## Licence / content

Community informational site. Event details may change; confirm with organisers. Not an official organisational headquarters page.
