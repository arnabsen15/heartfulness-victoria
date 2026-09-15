# Heartfulness Victoria

Calm, mobile-first static landing site for community Heartfulness group meditations across Melbourne and Victoria (Australia).

Pure HTML, CSS, and JavaScript. Events are loaded from `data/events.json` via `fetch` — edit that file to add or update sessions. No build step, no paid dependencies, no scraped logos.

## Project layout

```
heartfulness-victoria/
├── index.html          # Main landing page
├── css/styles.css      # Styles
├── js/main.js          # Loads & sorts events
├── data/events.json    # Editable events list
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
| `time` | Display time string (e.g. `2:00 PM AEST`) or `null` |
| `venue` | Venue name / address |
| `suburb` | Suburb |
| `status` | `upcoming`, `series-ended`, or `ended` |
| `notes` | Optional note (e.g. series historically ran) |
| `eventbriteUrl` | Real Eventbrite URL, or `""` / omit — do **not** invent fake URLs |

Upcoming events are sorted by date. Past dates and `series-ended` / `ended` items appear under **Past & ended sessions**.

When you have a real Eventbrite link, set `eventbriteUrl` to that URL. Leave it empty until then; the card CTA stays a placeholder (`href="#"` with `data-eventbrite`).

## Free deploy (no paid plan)

### GitHub Pages

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Source**: Deploy from a branch.
3. Choose `main` (or `master`) and `/ (root)`.
4. Site URL will be `https://<user>.github.io/<repo>/`.

If the site lives in a subfolder of the repo, set the Pages source folder accordingly, or keep this project at the repo root.

### Netlify (drag-and-drop or Git)

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop) (anonymous drag-and-drop works for a quick demo).
2. Drop the `heartfulness-victoria` folder, **or** connect a Git repo and set publish directory to the project root (no build command).
3. Optional: add a `netlify.toml` later; not required for a static root publish.

### Cloudflare Pages

1. In Cloudflare Dashboard → **Workers & Pages → Create → Pages**.
2. Connect the Git repo, or use direct upload.
3. Build command: leave empty. Output directory: `/` (project root).
4. Deploy.

All three serve static files as-is. No Node build is required.

## Accessibility & design notes

- Semantic landmarks, skip link, focus styles, and `prefers-reduced-motion` support.
- Soft greens/blues, original geometric “calm orb” hero graphic (no Heartfulness logos scraped).
- Contact email in the footer: `melbourne@heartfulness.org`.

## Licence / content

Community informational site. Event details may change; confirm with organisers. Not an official organisational headquarters page.
