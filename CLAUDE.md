# Youth Guide page (دليل الشباب)

## Reference
- The site we are developing toward: https://www.youthguide.net/
  Use it as the reference for content, sections and branding in every task.
- Top bar must keep the brand like the reference: logo + the name "دليل الشباب"
  at the start of the bar (right, RTL), links and buttons at the end.

## Structure
- `index.html` — one RTL (Arabic) page: scroll scenes (`section.scene`: hero, about,
  why, vision + goals side by side, values), then flowing sections (`section.section`: events,
  stats, contact) whose `[data-reveal]` elements fade in on view. Contact shows
  details only (no form).
- `js/main.js` — scroll timeline (`TIMELINE`, `MOTION`), the single flying logo,
  nav state and menu. Timeline unit = one screen of scroll.
- `js/glass.js` — liquid-glass refraction + lighting for every `.glass` element.
  Real glass is heavy to scroll: keep it to a few key surfaces (nav, about, vision,
  goals); other cards use `.card` (same look, no backdrop filter).
- `css/style.css` — tokens on `:root` (dark) and `:root[data-theme="light"]`.
- Hosted on GitHub Pages from the repo root.
