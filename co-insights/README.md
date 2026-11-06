# Central Ohio School District Insights

A static website (no backend) built for Netlify. Pages are generated from the data files, so most updates mean editing a list rather than a page.

## Deploy to Netlify
1. Put this folder in a GitHub repository (or drag the folder into Netlify's "Deploy manually" area after running the build yourself).
2. In Netlify, choose **Add new site → Import an existing project** and pick the repository. The settings come from `netlify.toml` (build command `node build.mjs`, publish folder `dist`).
3. In **Site configuration → Forms**, turn on form detection. Two forms will appear after the first deploy: `district-guide` and `property-review`.
4. In **Forms → Form notifications**, add an email notification so each request reaches your inbox.

## Before launch (checklist)
- [ ] **Automatic emails (Resend).** Follow "Automatic emails" below so every guide request gets the delivery email within seconds.
- [ ] **District lists** in `data/districts.json`: verify against the Ohio Department of Education and Workforce directory, including which districts cross county lines.
- [ ] **County links** in `data/counties.json`: Marion and Morrow boards of elections, and Delaware and Morrow auditors, currently fall back to statewide directories. Add the direct URLs.
- [ ] **Levy results** in `data/districts.json`: replace "Unofficial" with certified results once counties certify.
- [ ] **Privacy policy** (`/privacy/`): have your broker or an attorney approve it.
- [ ] **Site address**: `schools.saritalawrence.com` (set in `data/site.json`). Connect it in Netlify under Domain management.
- [ ] **Microsoft Clarity**: paste your project ID into `analytics.clarityProjectId` in `data/site.json`.
- [ ] **Brokerage compliance**: confirm required disclosures and logo use with Coldwell Banker Realty.

## Editing content
| To change… | Edit |
|---|---|
| Name, phone, email, bio, official links | `data/site.json` |
| Counties on the map and their election/auditor links | `data/counties.json` |
| School districts, which counties they serve, levy results | `data/districts.json` |
| Colors and type | `src/site.css` (the `:root` section) |
| Page wording | `build.mjs` (each page is a function) |

**Adding a county:** add it to `data/counties.json` with its 5-digit FIPS code (e.g. Licking is `39089`) and label position. Its shape is already in `data/map-paths.json` for the surrounding counties. Then list its districts in `data/districts.json`.

**Adding a levy result:** give the district a `levy` block like the ones on Bexley City or Pickerington Local. Districts without one show a "check the board of elections" note.

## Automatic emails (Resend)
`netlify/functions/submission-created.mjs` runs on every verified form submission and emails the visitor through Resend:
- **Guide request:** the delivery email with the download link and a paragraph for buying, selling, staying or researching.
- **Property review request:** a confirmation that Sarita will personally review the home.

Setup:
1. In Resend, add and verify the domain you'll send from (Resend shows the DNS records to add at your domain provider).
2. In Resend, create an API key with sending access.
3. In Netlify, open **Site configuration → Environment variables** and add:
   - `RESEND_API_KEY`: the key from step 2 (keep it secret; never put it in the code)
   - `EMAIL_FROM`: `Sarita Lawrence <guide@saritalawrence.com>` (saritalawrence.com must be verified in Resend)
   - `EMAIL_REPLY_TO` (optional): defaults to `sarita.lawrence@cbrealty.com`
   - `SITE_URL`: `https://schools.saritalawrence.com`
4. Redeploy, submit a test request with your own email, and check **Logs → Functions** in Netlify if nothing arrives.

If the key or sender is missing, submissions are still saved and you still get your Netlify notification; only the visitor email is skipped. Resend's free plan allows 3,000 emails a month and 100 per day. The email text also lives in `emails/01-guide-delivery.md` for reference.

## The research guide (PDF)
- Source: `guide-src/guide.html` (letter size, 11 pages, uses the fonts in `guide-src/fonts/`).
- Output: `static/central-ohio-school-district-research-guide.pdf`, published at `/downloads/central-ohio-school-district-research-guide.pdf`.
- To edit: change `guide-src/guide.html`, then run `python3 guide-src/render.py` (needs Playwright and Chrome) and commit the new PDF. Netlify doesn't rebuild the PDF on its own.
- Brand rule used throughout: Coldwell Banker Realty appears at the same size as The Agency Real Estate Group and slightly larger than Sarita's name.

## Analytics events
Sent to Clarity and `window.dataLayer`, never with names, emails or addresses:
`county_selected`, `district_selected`, `official_resource_clicked`, `guide_request_started`, `guide_request_submitted`, `guide_downloaded`, `home_valuation_requested`.

## Local preview
`node build.mjs` then open `dist/index.html` through any local web server (for example `npx serve dist`). `DEMO=1 node build.mjs` builds a preview where forms don't send.

Map boundaries: U.S. Census Bureau cartographic boundary files (1:10M, via the us-atlas package).
