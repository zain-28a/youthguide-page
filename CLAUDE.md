# Youth Guide page (دليل الشباب)

## Reference
- The site we are developing toward: https://www.youthguide.net/
  Use it as the reference for content, sections and branding in every task.
- Top bar must keep the brand like the reference: logo + the name "دليل الشباب"
  at the start of the bar (right, RTL), links and buttons at the end.

## Structure
- `index.html` — one RTL (Arabic) page made of scroll scenes (`section.scene`).
- `js/main.js` — scroll timeline (`TIMELINE`, `MOTION`), the single flying logo,
  nav state and menu. Timeline unit = one screen of scroll.
- `js/glass.js` — liquid-glass refraction + lighting for every `.glass` element.
- `css/style.css` — tokens on `:root` (dark) and `:root[data-theme="light"]`.
- Hosted on GitHub Pages from the repo root.
