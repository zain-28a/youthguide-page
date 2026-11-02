/* =========================================================
   How the page works
   ---------------------------------------------------------
   The page is a stack of scenes (<section class="scene">).
   - While a scene plays, it's as tall as its animation and its
     stage stays pinned to the screen; scrolling drives the timeline.
   - When its timeline reaches `end`, the scene locks on its final
     state and collapses to a normal one-screen section. The next
     scene then scrolls in and plays. When everything has played,
     the page is a plain static page.
   - One logo (.logo-fly) draws every scene. Inside a scene it moves
     between the scene's .logo-spot boxes; between two scenes it flies
     from where it ended in the first to where it starts in the next.

   Timeline unit = one screen height of scroll. Stages are [start, end].
   ========================================================= */
const TIMELINE = {
    // 1) Slogan -> logo + "دليل الشباب" -> intro (logo right, title, text)
    hero: {
        hint:         [0.00, 0.04],
        sloganOut:    [0.00, 0.12],
        dalilMove:    [0.05, 0.25],  // "دليل" slogan -> title
        shabab:       [0.20, 0.33],  // "الشباب" fades in
        logoMove:     [0.04, 0.38],  // logo start -> title
        logoSharpen:  [0.12, 0.30],  // blurred -> sharp
        introMove:    [0.38, 0.68],  // logo -> right, title -> intro title
        introText:    [0.56, 0.74],
        end: 0.85,                   // every scene ends with a short hold
    },

    // 2) Centered text over the large, faint logo
    about: {
        cardIn:       [0.00, 0.28],
        textIn:       [0.10, 0.40],
        end: 0.58,
    },

    // 3) Centered over the faint logo; title, items one by one, each opens in turn, then all open
    why: {
        titleIn:      [0.00, 0.22],
        itemsIn:      [0.08, 0.28],  // first item; the rest follow by MOTION.stagger
        steps:        [0.32, 0.84],  // split evenly across items
        allOpen:      0.90,
        end: 1.05,
    },

    // 4) Card over the faint logo
    vision: {
        cardIn:       [0.00, 0.30],
        end: 0.50,
    },

    // 5) Card over the faint logo, items one by one
    goals: {
        cardIn:       [0.00, 0.26],
        end: 0.62,
    },

    // 6) Title, then the cards burst out of the center into their row
    values: {
        titleIn:      [0.00, 0.24],
        cardsIn:      [0.10, 0.42],  // first card; the rest follow by MOTION.cardStagger
        end: 0.78,
    },
};

const MOTION = {
    sloganOutY: -24,     // px
    sloganOutBlur: 8,    // px
    shababFromX: -40,    // px, negative = from the left
    shababFromBlur: 8,   // px
    revealShift: 28,     // px, text rises this much while fading in
    stagger: 0.06,       // timeline units between list items
    cardStagger: 0.06,   // timeline units between value cards
    cardFromScale: 0.2,  // value cards start this small, at the center
    scrollLag: 0.06,     // s; how far animations trail the scroll (0 = locked to it)
    mouseLag: 0.14,      // s; same for the mouse
    lead: 0.30,          // timeline units; a scene starts playing this much before it reaches the top
    collapseIdle: 180,   // ms without scrolling before finished scenes collapse
    lightLag: 0.55,      // s; background lights glide after the scroll on a spring (no jumps, no sudden starts)
    exitShift: 0.1,      // screen fractions; a finished scene's content trails the scroll as it leaves
};

/* Background lights. at = scene index + progress through its scroll area (0-1;
   past the last scene, + screens scrolled);
   a/b = light positions [x, y] as screen fractions. */
const LIGHTS = [
    { at: 0.00, a: [0.18, 0.50], b: [0.85, 0.18] },  // opening
    { at: 0.45, a: [0.80, 0.48], b: [0.20, 0.85] },  // intro
    { at: 1.50, a: [0.50, 0.30], b: [0.50, 0.85] },  // about
    { at: 2.50, a: [0.25, 0.30], b: [0.78, 0.75] },  // why
    { at: 3.50, a: [0.50, 0.50], b: [0.50, 0.95] },  // vision
    { at: 4.50, a: [0.30, 0.15], b: [0.72, 0.85] },  // goals
    { at: 5.50, a: [0.12, 0.70], b: [0.88, 0.28] },  // values
    // After the scenes: at = 6 + screens scrolled past the values scene
    { at: 6.60, a: [0.82, 0.30], b: [0.15, 0.80] },  // events
    { at: 7.50, a: [0.30, 0.60], b: [0.75, 0.20] },  // numbers
    { at: 8.20, a: [0.50, 0.85], b: [0.20, 0.25] },  // contact
];

/* =========================================================
   Elements
   ========================================================= */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const logo = $('.logo-fly .hero-logo');
const logoBlur = $('.logo-blur', logo);
const logoSharp = $('.logo-sharp', logo);

const el = {
    hint: $('.scroll-hint'),
    sloganStart: $('.slogan-start'),
    dalil: $('.word-dalil'),
    finalDalil: $('.final-dalil'),
    shabab: $('.word-shabab'),
    ghostDalil: $('.ghost-dalil'),
    ghostShabab: $('.ghost-shabab'),
    introText: $('.intro-text'),
    aboutCard: $('.about-card'),
    aboutText: $('.about-text'),
    whyTitle: $('.why-title'),
    whyItems: $$('.why-item'),
    visionCard: $('.vision-block'),
    goalsCard: $('.goals-block'),
    goalItems: $$('.goal-item'),
    valuesTitle: $('.values-title'),
    valueCards: $$('.value-card'),
    aura: $('.aura-bg'),
    spot: $('.aura-spot'),
    lightA: $('.bg-light--a'),
    lightB: $('.bg-light--b'),
    navLinks: $$('.nav-links a'),
};

// Everything JS transforms; reset before measuring
const moving = [logo, el.dalil, el.shabab, el.introText, el.aboutCard, el.aboutText,
    el.whyTitle, ...el.whyItems, el.visionCard, el.goalsCard, ...el.goalItems,
    el.valuesTitle, ...el.valueCards];

/* =========================================================
   Helpers
   ========================================================= */
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Eased 0 -> 1 progress of a [start, end] stage at timeline position p
const stage = (p, [a, b]) => ease(clamp((p - a) / (b - a)));
// Same stage shifted by i * step (for staggered lists)
const staggered = (p, [a, b], i, step) => stage(p, [a + i * step, b + i * step]);
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Writes a style only when it changed (avoids needless style recalcs)
const styleCache = new WeakMap();
function setStyle(node, prop, value) {
    let cache = styleCache.get(node);
    if (!cache) styleCache.set(node, (cache = {}));
    if (cache[prop] === value) return;
    cache[prop] = value;
    node.style[prop] = value;
}

// Fade in + slight rise, t = 0 -> 1
function reveal(node, t) {
    setStyle(node, 'opacity', r3(t));
    setStyle(node, 'transform', `translate3d(0, ${r1(MOTION.revealShift * (1 - t))}px, 0)`);
}

// Center of a box, and height
function box(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
}

// Offset (and scale) that moves `from` onto `to`
function delta(from, to) {
    const a = box(from);
    const b = box(to);
    return { x: b.x - a.x, y: b.y - a.y, s: b.h / a.h };
}

/* =========================================================
   State
   ========================================================= */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let cfg = {};     // CSS variables, read in readConfig()
const D = {};     // layout measurements, from measure()

// Smoothed values ease toward their targets each frame:
// sy = scroll position (every scene's progress derives from it), mx/my = mouse (-1..1)
// g/tg = position along LIGHTS (smoothed / target)
const state = { sy: 0, ty: 0, mx: 0, my: 0, tmx: 0, tmy: 0, g: -1, tg: 0, gv: 0 };
let running = false;

/* =========================================================
   Scenes
   Each scene: its timeline, how it draws its content (render)
   and where the logo is at progress p (logo).
   ========================================================= */
const scenes = [
    { name: 'hero', render: renderHero, logo: logoHero },
    { name: 'about', render: renderAbout, logo: logoBack },
    { name: 'why', render: renderWhy, logo: logoBack },
    { name: 'vision', render: renderVision, logo: logoBack },
    { name: 'goals', render: renderGoals, logo: logoBack },
    { name: 'values', render: renderValues, logo: logoBack },
].map((s, i) => {
    const sceneEl = $(`.scene-${s.name}`);
    return {
        ...s,
        el: sceneEl,
        stage: $('.scene-stage', sceneEl),
        t: TIMELINE[s.name],
        lead: i ? MOTION.lead : 0,  // the first scene starts at the very top
        top: 0,            // page offset
        p: 0,              // progress, 0 -> t.end
        done: false,       // played and locked on its final state
        collapsed: false,  // shrunk to one screen (done first, collapsed when scrolling pauses)
    };
});

// Where a scene stops being pinned (and the flight to the next scene begins)
const pinEnd = (s) => s.top + (s.collapsed ? 0 : (s.t.end - s.lead) * window.innerHeight);

// Scene whose area the (smoothed) scroll position is in
function currentScene() {
    let i = 0;
    while (i < scenes.length - 1 && state.sy >= scenes[i + 1].top) i++;
    return i;
}

/* =========================================================
   Logo
   A logo state: x/y = center and h = height (screen coords while a
   stage is pinned), rx/ry = tilt (deg), op = opacity,
   mouse = mouse influence (0-1), sharp = blurred -> sharp (0-1).
   ========================================================= */

// Logo spots: [scene, selector]; measured into D.spots
const SPOTS = {
    start: ['hero', '.logo-spot--start'],
    title: ['hero', '.logo-spot--title'],
    right: ['hero', '.logo-spot--right'],
    back: ['about', '.logo-spot--back'],
};

function mixLogo(a, b, t) {
    const out = {};
    for (const k in a) out[k] = lerp(a[k], b[k], t);
    return out;
}

// Start (large, blurred) -> above the title -> right of the intro
function logoHero(p, T) {
    const l = stage(p, T.logoMove);
    const im = stage(p, T.introMove);
    return {
        ...mixLogo(mixLogo(D.spots.start, D.spots.title, l), D.spots.right, im),
        rx: lerp(lerp(cfg.tiltStartX, cfg.tiltEndX, l), cfg.tiltIntroX, im),
        ry: lerp(lerp(cfg.tiltStartY, cfg.tiltEndY, l), cfg.tiltIntroY, im),
        op: lerp(cfg.startOpacity, cfg.endOpacity, l),
        mouse: l,
        sharp: stage(p, T.logoSharpen),
    };
}

// Large and faint behind centered content
function logoBack() {
    return { ...D.spots.back, rx: cfg.tiltBackX, ry: cfg.tiltBackY, op: cfg.backOpacity, mouse: cfg.backMouse, sharp: 1 };
}

let lastLogoFrame = '';
function renderLogo() {
    const i = currentScene();
    const s = scenes[i];
    let L;
    if (!s.done || i === scenes.length - 1) {
        // Inside a playing scene
        L = s.logo(s.p, s.t);
    } else {
        // Between a finished scene and the next: fly from one to the other
        const next = scenes[i + 1];
        const from = pinEnd(s);
        const t = ease(clamp((state.sy - from) / (next.top - from)));
        L = mixLogo(s.logo(s.t.end, s.t), next.logo(0, next.t), t);
    }

    // Mouse nudges and tilts the logo
    const x = L.x + state.mx * cfg.mouseMove * L.mouse;
    const y = L.y + state.my * cfg.mouseMove * L.mouse;
    const rx = L.rx - state.my * cfg.mouseTilt * L.mouse;
    const ry = L.ry + state.mx * cfg.mouseTilt * L.mouse;

    // The logo's layout box is at the top-left corner: move its center onto (x, y)
    setStyle(logo, 'transform',
        `translate3d(${r1(x - D.logoW / 2)}px, ${r1(y - D.logoH / 2)}px, 0) scale(${r3(L.h / D.logoH)}) ` +
        `rotateX(${r1(rx)}deg) rotateY(${r1(ry)}deg)`);
    setStyle(logo, 'opacity', r3(L.op));
    // Resting (e.g. in the background while the page scrolls): no compositor layer,
    // so it's drawn crisp at its current size
    const frame = `${logo.style.transform}|${logo.style.opacity}`;
    logo.classList.toggle('is-idle', frame === lastLogoFrame);
    lastLogoFrame = frame;
    setStyle(logoBlur, 'opacity', r3(1 - L.sharp));
    setStyle(logoSharp, 'opacity', r3(L.sharp));
}

/* =========================================================
   Scene content
   ========================================================= */

// 1) Slogan -> title -> intro
function renderHero(p, T) {
    setStyle(el.hint, 'opacity', r3(1 - stage(p, T.hint)));

    const out = stage(p, T.sloganOut);
    const outBlur = r1(MOTION.sloganOutBlur * out);
    setStyle(el.sloganStart, 'opacity', r3(1 - out));
    setStyle(el.sloganStart, 'transform', `translate3d(0, ${r1(MOTION.sloganOutY * out)}px, 0)`);
    setStyle(el.sloganStart, 'filter', outBlur > 0 ? `blur(${outBlur}px)` : 'none');

    const d = stage(p, T.dalilMove);
    const s = stage(p, T.shabab);
    const im = stage(p, T.introMove);

    // "دليل": slogan -> title -> intro title
    const dx = D.dalil1.x * d + D.dalil2.x * im;
    const dy = D.dalil1.y * d + D.dalil2.y * im;
    const ds = lerp(1, D.dalil1.s, d) * lerp(1, D.dalil2.s, im);
    setStyle(el.dalil, 'transform', `translate3d(${r1(dx)}px, ${r1(dy)}px, 0) scale(${r3(ds)})`);

    // "الشباب": slides in, then -> intro title
    const inBlur = r1(MOTION.shababFromBlur * (1 - s));
    const sx = MOTION.shababFromX * (1 - s) + D.shabab.x * im;
    const sy = D.shabab.y * im;
    setStyle(el.shabab, 'opacity', r3(s));
    setStyle(el.shabab, 'transform',
        `translate3d(${r1(sx)}px, ${r1(sy)}px, 0) scale(${r3(lerp(1, D.shabab.s, im))})`);
    setStyle(el.shabab, 'filter', inBlur > 0 ? `blur(${inBlur}px)` : 'none');

    reveal(el.introText, stage(p, T.introText));
}

// 2) About
function renderAbout(p, T) {
    reveal(el.aboutCard, stage(p, T.cardIn));
    reveal(el.aboutText, stage(p, T.textIn));
}

// 3) Why
function renderWhy(p, T) {
    reveal(el.whyTitle, stage(p, T.titleIn));
    el.whyItems.forEach((item, i) => reveal(item, staggered(p, T.itemsIn, i, MOTION.stagger)));

    // Open one item at a time across `steps`, then all of them from `allOpen`
    const [s0, s1] = T.steps;
    const n = el.whyItems.length;
    const active = p < s0 ? -1 : Math.min(n - 1, Math.floor((p - s0) / ((s1 - s0) / n)));
    el.whyItems.forEach((item, i) => {
        item.classList.toggle('is-active', p >= T.allOpen || i === active);
    });
}

// 4) Vision
function renderVision(p, T) {
    reveal(el.visionCard, stage(p, T.cardIn));
}

// 5) Goals
function renderGoals(p, T) {
    reveal(el.goalsCard, stage(p, T.cardIn));
    el.goalItems.forEach((item, i) => reveal(item, staggered(p, T.cardIn, i + 1, MOTION.stagger)));
}

// 6) Values: each card grows out of the screen center to its place
function renderValues(p, T) {
    reveal(el.valuesTitle, stage(p, T.titleIn));
    el.valueCards.forEach((card, i) => {
        const t = staggered(p, T.cardsIn, i, MOTION.cardStagger);
        const from = D.cardsFromCenter[i];
        setStyle(card, 'opacity', r3(clamp(t * 2)));
        setStyle(card, 'transform',
            `translate3d(${r1(from.x * (1 - t))}px, ${r1(from.y * (1 - t))}px, 0) ` +
            `scale(${r3(lerp(MOTION.cardFromScale, 1, t))})`);
    });
}

// Where the lights should be: scene index + progress through the scene's whole
// scroll area. Follows the scroll continuously, whether a scene is playing or done.
function lightTarget() {
    const i = currentScene();
    const s = scenes[i];
    const vh = window.innerHeight;
    const isLast = i === scenes.length - 1;
    const end = isLast ? pinEnd(s) + vh : scenes[i + 1].top;
    let g = i + clamp((state.sy - s.top) / Math.max(1, end - s.top));
    if (isLast) g += Math.max(0, state.sy - end) / vh;  // flowing sections
    return g;
}

// Background: lights follow the scenes; aura and spot follow the mouse
function renderBackground() {
    const g = clamp(state.g, LIGHTS[0].at, LIGHTS[LIGHTS.length - 1].at);

    // A smooth curve through the keyframes (Catmull-Rom): the lights flow past
    // each keyframe instead of stopping on it
    let k = 0;
    while (k < LIGHTS.length - 2 && g >= LIGHTS[k + 1].at) k++;
    const u = clamp((g - LIGHTS[k].at) / (LIGHTS[k + 1].at - LIGHTS[k].at));
    const P = (j) => LIGHTS[clamp(j, 0, LIGHTS.length - 1)];
    const curve = (key, axis) => {
        const p0 = P(k - 1)[key][axis];
        const p1 = P(k)[key][axis];
        const p2 = P(k + 1)[key][axis];
        const p3 = P(k + 2)[key][axis];
        return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
    };
    const W = window.innerWidth;
    const H = window.innerHeight;
    const at = (key) => `translate3d(${r1(curve(key, 0) * W)}px, ${r1(curve(key, 1) * H)}px, 0)`;
    setStyle(el.lightA, 'transform', at('a'));
    setStyle(el.lightB, 'transform', at('b'));

    setStyle(el.aura, 'transform',
        `translate3d(${r1(-state.mx * cfg.bgMove)}px, ${r1(-state.my * cfg.bgMove)}px, 0)`);
    setStyle(el.spot, 'transform',
        `translate3d(${Math.round((state.mx + 1) / 2 * W)}px, ${Math.round((state.my + 1) / 2 * H)}px, 0)`);
}

// Nav: marks the link of the section filling most of the screen
// (a section without its own link, like goals, keeps the previous one)
let activeLink = null;
function renderNav() {
    const vh = window.innerHeight;
    const atBottom = state.sy >= document.documentElement.scrollHeight - vh - 2;
    const mid = state.sy + vh / 2;
    let link = null;
    sectionTops.forEach(({ id, top }, k) => {
        if (top > mid && !(atBottom && k === sectionTops.length - 1)) return;
        link = el.navLinks.find((a) => a.hash === `#${id}`) || link;
    });
    if (link === activeLink) return;
    if (activeLink) activeLink.removeAttribute('aria-current');
    if (link) link.setAttribute('aria-current', 'true');
    activeLink = link;
}

// A finished scene leaving the screen: its content trails the scroll a little,
// so it eases out under the next scene instead of sliding off rigidly.
// Transform only (no opacity), so the glass inside keeps refracting.
function renderExits() {
    const vh = window.innerHeight;
    scenes.forEach((s, i) => {
        let y = 0;
        if (s.done && i < scenes.length - 1) {
            const from = pinEnd(s);
            const t = clamp((state.sy - from) / Math.max(1, scenes[i + 1].top - from));
            y = MOTION.exitShift * vh * t * t;
        }
        setStyle(s.stage, 'transform', y ? `translate3d(0, ${r1(y)}px, 0)` : 'none');
    });
}

function render() {
    scenes.forEach((s) => s.render(s.p, s.t));
    renderExits();
    renderLogo();
    renderBackground();
    renderNav();
}

/* =========================================================
   Layout + scroll
   ========================================================= */
function readConfig() {
    const css = getComputedStyle(document.documentElement);
    const num = (name, fallback = 0) => {
        const v = parseFloat(css.getPropertyValue(name));
        return Number.isNaN(v) ? fallback : v;
    };

    cfg = {
        blur: num('--logo-start-blur'),
        startOpacity: num('--logo-start-opacity'),
        endOpacity: num('--logo-end-opacity', 1),
        backOpacity: num('--logo-back-opacity', 0.2),
        tiltStartX: num('--logo-tilt-start-x'),
        tiltStartY: num('--logo-tilt-start-y'),
        tiltEndX: num('--logo-tilt-end-x'),
        tiltEndY: num('--logo-tilt-end-y'),
        tiltIntroX: num('--logo-intro-tilt-x'),
        tiltIntroY: num('--logo-intro-tilt-y'),
        tiltBackX: num('--logo-back-tilt-x'),
        tiltBackY: num('--logo-back-tilt-y'),
        backMouse: num('--logo-back-mouse', 0.4),
        mouseTilt: reduceMotion ? 0 : num('--logo-mouse-tilt'),
        mouseMove: reduceMotion ? 0 : num('--logo-mouse-move'),
        bgMove: reduceMotion ? 0 : num('--bg-mouse-move'),
        depth: Math.round(num('--logo-depth')),
        depthColor: css.getPropertyValue('--logo-depth-color').trim(),
        shadowColor: css.getPropertyValue('--logo-shadow').trim(),
    };
}

// Playing: tall enough to scroll through the timeline (minus the lead). Collapsed: one screen.
function layoutScene(s) {
    s.el.style.height = s.collapsed ? '' : `${(s.t.end - s.lead + 1) * 100}vh`;
}

// Scenes + the flowing sections after them (for the nav)
const flowSections = $$('main > .section');
let sectionTops = [];

function measureTops() {
    scenes.forEach((s) => { s.top = s.el.getBoundingClientRect().top + window.scrollY; });
    sectionTops = [...scenes.map((s) => s.el), ...flowSections].map((node) => ({
        id: node.id,
        top: node.getBoundingClientRect().top + window.scrollY,
    }));
}

function measure() {
    readConfig();
    scenes.forEach(layoutScene);

    [...moving, ...scenes.map((s) => s.stage)].forEach((node) => {
        node.style.transform = 'none';
        styleCache.delete(node);
    });

    // Logo spots relative to their stage (= screen coords while it's pinned)
    D.spots = {};
    for (const [name, [scene, sel]] of Object.entries(SPOTS)) {
        const stageEl = $(`.scene-${scene} .scene-stage`);
        const b = box($(sel, stageEl));
        const st = stageEl.getBoundingClientRect();
        D.spots[name] = { x: b.x - st.left, y: b.y - st.top, h: b.h };
    }
    D.logoW = logo.offsetWidth;
    D.logoH = logo.offsetHeight;

    // Hero words
    D.dalil1 = delta(el.dalil, el.finalDalil);
    D.dalil2 = delta(el.finalDalil, el.ghostDalil);
    D.shabab = delta(el.shabab, el.ghostShabab);

    // Values: offset from each card to the stage center
    const valuesStage = box($('.scene-values .scene-stage'));
    D.cardsFromCenter = el.valueCards.map((card) => {
        const c = box(card);
        return { x: valuesStage.x - c.x, y: valuesStage.y - c.y };
    });

    // Logo filters: set once here, not per frame
    $('svg', logoBlur).style.filter = `blur(${cfg.blur * D.logoH / D.spots.start.h}px)`;
    // Depth is designed for the title-sized logo; the layout box is larger, so scale it up to match
    const u = r3(D.logoH / D.spots.title.h);
    let depth = '';
    for (let i = 0; i < cfg.depth; i++) depth += `drop-shadow(${u}px ${u}px 0 ${cfg.depthColor}) `;
    $('svg', logoSharp).style.filter = `${depth}drop-shadow(0 ${r1(cfg.depth * 2 * u)}px ${r1(cfg.depth * 3 * u)}px ${cfg.shadowColor})`;

    measureTops();
    state.sy = state.ty = window.scrollY;
    updateProgress();
    collapseFinished();
    state.tg = lightTarget();
    if (state.g < 0) state.g = state.tg;  // first measure: no glide in
    render();
    if (!running) logo.classList.add('is-idle');
    start();  // glides the lights if the layout moved them
}

// Progress follows the smoothed scroll. A scene locks (done) once its timeline
// has fully played, so it never jumps to its end state.
function updateProgress() {
    const vh = window.innerHeight;
    scenes.forEach((s) => {
        if (s.done) return;
        s.p = clamp((state.sy - s.top) / vh + s.lead, 0, s.t.end);
        if (s.p >= s.t.end) {
            s.done = true;
            s.el.classList.add('is-done');  // draws the divider under it
        }
    });
}

// Shrinks locked scenes to one screen. Runs only while scrolling is paused:
// correcting the scroll position mid-scroll would cut off the browser's smooth
// scrolling. The correction keeps everything visually in place.
function collapseFinished() {
    scenes.forEach((s) => {
        if (!s.done || s.collapsed) return;
        const y = window.scrollY;  // read first: the browser clamps it once the page gets shorter
        const before = s.el.offsetHeight;
        s.collapsed = true;
        layoutScene(s);
        // Only the part that was above the screen top needs compensating
        const shift = clamp(y - s.top, 0, before - s.el.offsetHeight);
        if (shift) {
            window.scrollTo(0, y - shift);
            state.sy -= shift;
            state.ty = window.scrollY;
        }
        measureTops();
        start();  // lights glide to the new layout instead of jumping
    });
}

let collapseTimer = 0;

/* =========================================================
   Loop + events
   ========================================================= */

// One rAF loop for scroll + mouse smoothing; stops itself once settled.
// Time-based easing, so it feels the same at 60 Hz and 120 Hz.
let lastFrame = 0;
function tick(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 1 / 60);
    lastFrame = now;
    const follow = (lag) => (lag > 0 ? 1 - Math.exp(-dt / lag) : 1);
    state.sy += (state.ty - state.sy) * follow(MOTION.scrollLag);
    state.mx += (state.tmx - state.mx) * follow(MOTION.mouseLag);
    state.my += (state.tmy - state.my) * follow(MOTION.mouseLag);

    updateProgress();
    state.tg = lightTarget();
    if (reduceMotion) {
        state.g = state.tg;
    } else {
        // Critically damped spring: speeds up and slows down gently, never snaps
        const w = 2 / MOTION.lightLag;
        const x = w * dt;
        const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = state.g - state.tg;
        const temp = (state.gv + w * change) * dt;
        state.gv = (state.gv - w * temp) * decay;
        state.g = state.tg + (change + temp) * decay;
    }

    const settled =
        Math.abs(state.ty - state.sy) < 0.5 &&
        Math.abs(state.tmx - state.mx) < 0.001 &&
        Math.abs(state.tmy - state.my) < 0.001 &&
        Math.abs(state.tg - state.g) < 0.002 &&
        Math.abs(state.gv) < 0.01;

    if (settled) {
        state.sy = state.ty;
        state.mx = state.tmx;
        state.my = state.tmy;
        updateProgress();
        state.g = state.tg = lightTarget();
        state.gv = 0;
    }

    render();

    if (settled) {
        running = false;
        logo.classList.add('is-idle');
    } else {
        requestAnimationFrame(tick);
    }
}

function start() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(tick);
}

window.addEventListener('scroll', () => {
    state.ty = window.scrollY;
    start();
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(collapseFinished, MOTION.collapseIdle);
}, { passive: true });

window.addEventListener('mousemove', (e) => {
    if (reduceMotion) return;
    state.tmx = (e.clientX / window.innerWidth) * 2 - 1;
    state.tmy = (e.clientY / window.innerHeight) * 2 - 1;
    el.spot.classList.add('is-active');
    start();
});

// Mouse left the page: hide the spot, ease back to rest
document.documentElement.addEventListener('mouseleave', () => {
    el.spot.classList.remove('is-active');
    state.tmx = 0;
    state.tmy = 0;
    start();
});

// Dark / light mode. The initial theme is set in index.html <head> (saved choice,
// else the browser's). The button saves a choice; without one, follow the browser live.
const themeQuery = window.matchMedia('(prefers-color-scheme: light)');
const setTheme = (theme) => { document.documentElement.dataset.theme = theme; };

$('.theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(theme);
    try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked: choice lasts this visit */ }
});

themeQuery.addEventListener('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) { /* storage blocked */ }
    if (!saved) setTheme(e.matches ? 'light' : 'dark');
});

// In-page links glide to their section instead of jumping (a jump makes every
// scene in between flash through its animation in a few frames)
$$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
        const target = a.hash && document.getElementById(a.hash.slice(1));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', a.hash);
    });
});

// Narrow screens: the menu button opens the links as a dropdown
const menu = $('.nav-links');
const menuBtn = $('.menu-toggle');
function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('click', (e) => { if (!e.target.closest('header nav')) setMenu(false); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
    }
});

// Re-measure on resize, at most once per frame
let resizeQueued = false;
window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
        resizeQueued = false;
        measure();
    });
});

measure();
// Web fonts change text metrics
if (document.fonts) document.fonts.ready.then(measure);

/* =========================================================
   Flowing sections: reveal on view + counters
   ========================================================= */
const counterFormat = new Intl.NumberFormat('en-US');

// Counts a number up from 0 with an ease-out
function runCounter(node) {
    const target = Number(node.dataset.target);
    if (reduceMotion || !target) return;
    const duration = 1600;
    const t0 = performance.now();
    const step = (now) => {
        const t = clamp((now - t0) / duration);
        node.textContent = counterFormat.format(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
    };
    node.textContent = '0';
    requestAnimationFrame(step);
}

const revealed = $$('[data-reveal]');
if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            $$('.counter', entry.target).forEach(runCounter);
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    revealed.forEach((node) => io.observe(node));
} else {
    revealed.forEach((node) => node.classList.add('is-visible'));
}

// Footer year
$('.footer-year').textContent = new Date().getFullYear();
