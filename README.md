# AI Business Association — Website

Static multi-page site for the AI Business Association at the University of Miami.
No build step. Plain HTML + CSS + a tiny bit of JS.

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home — hero, what we do, featured event, stats |
| `events.html` | Event list with filter chips (talks / workshops / socials) |
| `learn.html` | Learning tracks, sample progress, resources |
| `community.html` | Members, mentorship, testimonial |
| `opportunities.html` | Internship / project / full-time board + employer CTA |
| `join.html` | Benefits + interest form (demo only — see below) |

## Run locally
```bash
cd "ai business club"
python3 -m http.server 4173
```
Then open http://localhost:4173

## Swap in the real logo
The logo is currently `assets/img/logo.svg` (a vector recreation of the badge).
To use the real artwork, either:
- **Replace** `assets/img/logo.svg` with your file (keep the same name), or
- Drop in `assets/img/logo.png` and change `logo.svg` → `logo.png` in the
  `<img>` tags (one in the header, one in the footer of each page).

The hero image `assets/img/hero.jpg` is an AI-generated Miami skyline at golden
hour (made with Higgsfield / nano-banana). Swap in a real photo by replacing
that file (keep the name) or pointing the `<img src>` in `index.html` elsewhere.

## Make the Join form real
`join.html` currently just shows a thank-you message (`data-demo` in the markup,
handled in `assets/js/main.js`). To collect real submissions, point the `<form>`
at a Google Form / Formspree / Airtable endpoint and remove the `data-demo`
attribute.

## Brand tokens
All colors and fonts are CSS variables at the top of `assets/css/styles.css`:
Deep Green `#0D3B2E` · Orange `#F36A21` · Cream `#F8F4EC` · Sand `#E9DFD0` ·
Charcoal `#1F2A26` · Sage `#B8C4B2`. Fonts: Sora (headings), Inter (body).

## Deploy
It's fully static — drop the folder on GitHub Pages, Netlify, Vercel, or UM
web hosting. No configuration needed.
