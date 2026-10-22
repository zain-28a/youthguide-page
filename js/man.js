/* =========================================================
   Scroll timeline
   Unit = one viewport height of scroll. Each stage is [start, end].
   ========================================================= */
const TIMELINE = {
    // 1) Opening: slogan -> final title, logo to center
    hint:         [0.00, 0.06],
    sloganOut:    [0.00, 0.24],
    dalilMove:    [0.12, 0.48],
    shabab:       [0.40, 0.64],
    logoMove:     [0.16, 0.68],
    logoSharpen:  [0.24, 0.60],  // blurred -> sharp crossfade

    // 2) Intro: logo right, title up, intro text below
    introMove:    [0.80, 1.30],
    introText:    [1.10, 1.45],

    // 3) About: logo left, text swaps
    introOut:     [1.75, 2.00],
    aboutMove:    [1.75, 2.35],
    aboutIn:      [2.05, 2.40],

    // 4) Why: title word swap, about text -> why list
    lamSwap:      [2.75, 3.00],
    aboutTextOut: [2.75, 2.95],
    whyIn:        [2.90, 3.20],
    whySteps:     [3.20, 4.40],  // split evenly across items; one open at a time

    // 5) Vision: logo centers, becomes a lens, zooms past the viewport
    whyOut:       [4.45, 4.70],
    centerMove:   [4.50, 5.05],
    lensSwap:     [5.00, 5.12],
    lensZoom:     [5.08, 5.80],
    visionIn:     [5.55, 5.85],

    // 6) Goals inside the same lens, then zoom out to a flat 2D logo
    visionOut:    [6.25, 6.45],
    goalsIn:      [6.40, 6.75],
    goalsOut:     [7.20, 7.40],
    lensZoomOut:  [7.30, 7.95],

    // 7) Values: logo splits into shards that become cards
    split:        [8.00, 8.02],  // instant swap; shards match the logo so it's invisible
    explode:      [8.02, 8.30],
    shardsMove:   [8.25, 8.80],
    valuesTitle:  [8.50, 8.75],
    cardsIn:      [8.55, 8.85],  // last card finishes at 8.85 + stagger

    end: 9.50,                   // includes a hold after values finish
};

const MOTION = {
    sloganOutY: -24,     // px
    sloganOutBlur: 8,    // px
    shababFromX: -40,    // px, negative = from left
    shababFromBlur: 8,   // px
    panelShift: 28,      // px, text rise on reveal
    whyStagger: 0.08,    // timeline units
    goalStagger: 0.06,
    cardStagger: 0.04,
    logoArc: -40,        // px, arc on right -> left move (negative = up)
    scrollSmooth: 0.14,  // 0-1, lower = smoother/slower, 1 = none
    mouseSmooth: 0.08,   // 0-1
};

/* Background light keyframes.
   at = timeline position; a/b = [x, y] as viewport fractions (0-1).
   Interpolated between neighbouring keyframes. */
const LIGHTS = [
    { at: 0.00, a: [0.18, 0.50], b: [0.85, 0.18] },  // opening
    { at: 1.30, a: [0.80, 0.48], b: [0.20, 0.85] },  // intro
    { at: 2.40, a: [0.20, 0.45], b: [0.78, 0.85] },  // about
    { at: 3.60, a: [0.28, 0.25], b: [0.82, 0.60] },  // why
    { at: 5.10, a: [0.50, 0.50], b: [0.50, 0.95] },  // vision
    { at: 6.70, a: [0.30, 0.15], b: [0.72, 0.85] },  // goals
    { at: 8.80, a: [0.12, 0.70], b: [0.88, 0.28] },  // values
];

/* ========================================================= */

const $ = (s) => document.querySelector(s);

const hero = $('.hero');
const logo = $('.hero-logo');
const logoBlur = $('.logo-blur');
const logoSharp = $('.logo-sharp');
const logoBlurSvg = logoBlur.querySelector('svg');
const logoSharpSvg = logoSharp.querySelector('svg');
const logoStart = $('.logo-start');
const logoRight = $('.logo-spot--right');
const logoLeft = $('.logo-spot--left');
const sloganStart = $('.slogan-start');
const dalil = $('.word-dalil');
const finalDalil = $('.final-dalil');
const shabab = $('.word-shabab');
const ghostDalil = $('.ghost-dalil');
const ghostShabab = $('.ghost-shabab');
const introText = $('.intro-text');
const aboutTitle = $('.about-title');
const aboutText = $('.about-text');
const wordMan = $('.word-man');
const wordLam = $('.word-lam');
const whyItems = [...document.querySelectorAll('.why-item')];
const stageEl = $('.hero-stage');
const logoCenter = $('.logo-spot--center');
const lens = $('.lens');
const lensContent = $('.lens-content');
const visionBlock = $('.vision-block');
const goalsBlock = $('.goals-block');
const goalsTitle = $('.goals-title');
const goalItems = [...document.querySelectorAll('.goal-item')];
const shardsEl = $('.shards');
const valuesTitle = $('.values-title');
const valueCards = [...document.querySelectorAll('.value-card')];

// Ring thickness at its widest, relative to logo height (from the SVG)
const LOGO_BAND = 193 / 1530;

// Logo shards, cut along the logo's natural seams.
// clip = polygon in % of the logo box; center = shard's own center (0-1); dir = explode direction.
// Order matches value cards, right to left.
const LOGO_PIECES = [
    { clip: '80.51% 0, 100% 0, 100% 13.53%, 64.96% 38.56%, 45.75% 24.84%',    center: [0.76, 0.16], dir: [1, -1] },  // right arm
    { clip: '49.86% 27.78%, 64.96% 38.56%, 100% 13.53%, 100% 100%, 49.86% 100%', center: [0.74, 0.70], dir: [1, 1] },   // right ring + hook
    { clip: '0 57.52%, 45.75% 24.84%, 49.86% 27.78%, 49.86% 100%, 0 100%',     center: [0.25, 0.72], dir: [-1, 1] },  // left ring arc
    // Slightly inset from the diagonal to avoid a hairline edge
    { clip: '0 0, 79.6% 0, 0 56.86%',                                           center: [0.24, 0.17], dir: [-1, -1] }, // left arm
];

const LOGO_PATH = logoSharpSvg.querySelector('path').getAttribute('d');
const shards = LOGO_PIECES.map((piece) => {
    const el = document.createElement('div');
    el.className = 'shard';
    el.style.clipPath = `polygon(${piece.clip})`;
    el.innerHTML = `<svg viewBox="0 0 1093 1530"><path fill="url(#yg-grad)" d="${LOGO_PATH}"/></svg>`;
    shardsEl.appendChild(el);
    return el;
});
const hint = $('.scroll-hint');
const aura = $('.aura-bg');
const spot = $('.aura-spot');
const lightA = $('.bg-light--a');
const lightB = $('.bg-light--b');
const anchors = [...document.querySelectorAll('.scene-anchor')];

// Everything transformed by JS; reset before measuring
const moving = [logo, dalil, shabab, introText, aboutTitle, aboutText, ...whyItems,
    lens, lensContent, visionBlock, goalsTitle, ...goalItems, ...shards, valuesTitle, ...valueCards];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const stage = (p, [a, b]) => ease(clamp((p - a) / (b - a)));

// Measurements, computed in measure()
const D = {};
let cfg = {};
let heroTop = 0;

// Current vs target values; current eases toward target each frame
const state = { p: 0, tp: 0, mx: 0, my: 0, tmx: 0, tmy: 0 };
let running = false;

// Skip DOM writes when the value hasn't changed
const styleCache = new WeakMap();
function setStyle(el, prop, value) {
    let cache = styleCache.get(el);
    if (!cache) styleCache.set(el, (cache = {}));
    if (cache[prop] === value) return;
    cache[prop] = value;
    el.style[prop] = value;
}

const r3 = (n) => Math.round(n * 1000) / 1000;
const r1 = (n) => Math.round(n * 10) / 10;

// Center-to-center offset and height ratio
function delta(fromEl, toEl) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    return {
        x: (b.left + b.width / 2) - (a.left + a.width / 2),
        y: (b.top + b.height / 2) - (a.top + a.height / 2),
        s: b.height / a.height,
    };
}

function readConfig() {
    const css = getComputedStyle(document.documentElement);
    const num = (name, fallback = 0) => {
        const v = parseFloat(css.getPropertyValue(name));
        return Number.isNaN(v) ? fallback : v;
    };

    cfg = {
        blur: num('--logo-start-blur'),
        opacity: num('--logo-start-opacity'),
        endOpacity: num('--logo-end-opacity', 1),
        tiltStartX: num('--logo-tilt-start-x'),
        tiltStartY: num('--logo-tilt-start-y'),
        tiltEndX: num('--logo-tilt-end-x'),
        tiltEndY: num('--logo-tilt-end-y'),
        tiltIntroX: num('--logo-intro-tilt-x'),
        tiltIntroY: num('--logo-intro-tilt-y'),
        tiltAboutX: num('--logo-about-tilt-x'),
        tiltAboutY: num('--logo-about-tilt-y'),
        aboutMouse: num('--logo-about-mouse', 0.25),
        lensBand: num('--lens-band', 1.15),
        lensFx: num('--lens-focus-x', 0.4986),
        lensFy: num('--lens-focus-y', 0.9203),
        shardScale: num('--shard-scale', 0.42),
        shardExplode: num('--shard-explode', 46),
        mouseTilt: reduceMotion ? 0 : num('--logo-mouse-tilt'),
        mouseMove: reduceMotion ? 0 : num('--logo-mouse-move'),
        bgMove: reduceMotion ? 0 : num('--bg-mouse-move'),
        depth: Math.round(num('--logo-depth', 0)),
        depthColor: css.getPropertyValue('--logo-depth-color').trim(),
        shadowColor: css.getPropertyValue('--logo-shadow').trim(),
    };
}

function measure() {
    readConfig();

    hero.style.setProperty('--hero-scroll-length', `${(TIMELINE.end + 1) * 100}vh`);

    // Nav anchors sit at the end of their stage
    anchors.forEach((a) => {
        const at = TIMELINE[a.dataset.at];
        if (at) a.style.top = `${at[1] * 100}vh`;
    });

    moving.forEach((el) => {
        el.style.transform = 'none';
        styleCache.delete(el);
    });

    // Logo's DOM position is the center; all other spots are offsets from it
    D.logoStart = delta(logo, logoStart);
    D.logoRight = delta(logo, logoRight);
    D.logoLeft = delta(logo, logoLeft);
    D.logoCenter = delta(logo, logoCenter);

    // Lens: S = scale at which the ring band exceeds viewport height
    const st = stageEl.getBoundingClientRect();
    const lr = lens.getBoundingClientRect();
    D.lens = {
        x: lr.left - st.left,
        y: lr.top - st.top,
        w: lr.width,
        h: lr.height,
        W: st.width,
        H: st.height,
        S: (cfg.lensBand * st.height) / (lr.height * LOGO_BAND),
    };
    lensContent.style.width = `${st.width}px`;
    lensContent.style.height = `${st.height}px`;

    // Shard center -> card center
    const sr = shardsEl.getBoundingClientRect();
    D.shards = valueCards.map((card, i) => {
        const c = card.getBoundingClientRect();
        const [cx, cy] = LOGO_PIECES[i].center;
        return {
            x: c.left + c.width / 2 - (sr.left + sr.width * cx),
            y: c.top + c.height / 2 - (sr.top + sr.height * cy),
        };
    });

    // .word-dalil: slogan -> final title -> intro title
    D.dalil1 = delta(dalil, finalDalil);
    D.dalil2 = delta(finalDalil, ghostDalil);
    D.shabab = delta(shabab, ghostShabab);

    heroTop = hero.getBoundingClientRect().top + window.scrollY;

    // Filters set once here, not per frame
    logoBlurSvg.style.filter = `blur(${cfg.blur / D.logoStart.s}px)`;
    let depthFilter = '';
    for (let i = 0; i < cfg.depth; i++) depthFilter += `drop-shadow(1px 1px 0 ${cfg.depthColor}) `;
    depthFilter += `drop-shadow(0 ${cfg.depth * 2}px ${cfg.depth * 3}px ${cfg.shadowColor})`;
    logoSharpSvg.style.filter = depthFilter;

    state.tp = state.p = scrollProgress();
    render();
    if (!running) { logo.classList.add('is-idle'); lens.classList.add('is-idle'); }
}

// Scene progress in viewport units (reads scrollY only, no layout)
function scrollProgress() {
    return clamp((window.scrollY - heroTop) / window.innerHeight, 0, TIMELINE.end);
}

// Fade + slight rise
function reveal(el, t) {
    setStyle(el, 'opacity', r3(t));
    setStyle(el, 'transform', `translate3d(0, ${r1(MOTION.panelShift * (1 - t))}px, 0)`);
}

function render() {
    const p = state.p;

    /* ---------- 1) Opening ---------- */

    setStyle(hint, 'opacity', r3(1 - stage(p, TIMELINE.hint)));

    const out = stage(p, TIMELINE.sloganOut);
    const outBlur = r1(MOTION.sloganOutBlur * out);
    setStyle(sloganStart, 'opacity', r3(1 - out));
    setStyle(sloganStart, 'transform', `translate3d(0, ${r1(MOTION.sloganOutY * out)}px, 0)`);
    setStyle(sloganStart, 'filter', outBlur > 0 ? `blur(${outBlur}px)` : 'none');

    const d = stage(p, TIMELINE.dalilMove);
    const s = stage(p, TIMELINE.shabab);
    const l = stage(p, TIMELINE.logoMove);

    /* ---------- 2) Intro ---------- */

    const im = stage(p, TIMELINE.introMove);
    const io = stage(p, TIMELINE.introOut);

    const dx = D.dalil1.x * d + D.dalil2.x * im;
    const dy = D.dalil1.y * d + D.dalil2.y * im;
    const ds = lerp(1, D.dalil1.s, d) * lerp(1, D.dalil2.s, im);
    setStyle(dalil, 'transform', `translate3d(${r1(dx)}px, ${r1(dy)}px, 0) scale(${r3(ds)})`);
    setStyle(dalil, 'opacity', r3(1 - io));

    const inBlur = r1(MOTION.shababFromBlur * (1 - s));
    const sx = MOTION.shababFromX * (1 - s) + D.shabab.x * im;
    const sy = D.shabab.y * im;
    setStyle(shabab, 'opacity', r3(s * (1 - io)));
    setStyle(shabab, 'transform',
        `translate3d(${r1(sx)}px, ${r1(sy)}px, 0) scale(${r3(lerp(1, D.shabab.s, im))})`);
    setStyle(shabab, 'filter', inBlur > 0 ? `blur(${inBlur}px)` : 'none');

    reveal(introText, stage(p, TIMELINE.introText) * (1 - io));

    /* ---------- 3) About ---------- */

    const am = stage(p, TIMELINE.aboutMove);
    const wo = stage(p, TIMELINE.whyOut);
    reveal(aboutTitle, stage(p, TIMELINE.aboutIn) * (1 - wo));

    /* ---------- 4) Why ---------- */

    const lam = stage(p, TIMELINE.lamSwap);
    setStyle(wordMan, 'opacity', r3(1 - lam));
    setStyle(wordLam, 'opacity', r3(lam));

    reveal(aboutText, stage(p, TIMELINE.aboutIn) * (1 - stage(p, TIMELINE.aboutTextOut)));

    whyItems.forEach((item, i) => {
        const shift = MOTION.whyStagger * i;
        reveal(item, stage(p, [TIMELINE.whyIn[0] + shift, TIMELINE.whyIn[1] + shift]) * (1 - wo));
    });

    // Active item: whySteps split evenly across items
    const [ws0, ws1] = TIMELINE.whySteps;
    const active = p < ws0 ? -1
        : Math.min(whyItems.length - 1, Math.floor((p - ws0) / ((ws1 - ws0) / whyItems.length)));
    whyItems.forEach((item, i) => {
        const on = i === active;
        if (item.classList.contains('is-active') !== on) item.classList.toggle('is-active', on);
    });

    /* ---------- Logo ---------- */
    // start -> center -> right -> left -> center; each stage continues from the previous

    const cm = stage(p, TIMELINE.centerMove);

    const lx = lerp(lerp(lerp(lerp(D.logoStart.x, 0, l), D.logoRight.x, im), D.logoLeft.x, am), D.logoCenter.x, cm);
    const ly = lerp(lerp(lerp(lerp(D.logoStart.y, 0, l), D.logoRight.y, im), D.logoLeft.y, am), D.logoCenter.y, cm)
        + Math.sin(Math.PI * am) * MOTION.logoArc;
    const ls = lerp(lerp(lerp(lerp(D.logoStart.s, 1, l), D.logoRight.s, im), D.logoLeft.s, am), D.logoCenter.s, cm);

    // Zero tilt at center before the lens
    const rxBase = lerp(lerp(lerp(lerp(cfg.tiltStartX, cfg.tiltEndX, l), cfg.tiltIntroX, im), cfg.tiltAboutX, am), 0, cm);
    const ryBase = lerp(lerp(lerp(lerp(cfg.tiltStartY, cfg.tiltEndY, l), cfg.tiltIntroY, im), cfg.tiltAboutY, am), 0, cm);

    // Mouse influence: off at start, reduced on the left, off before the lens
    const mouseK = l * lerp(1, cfg.aboutMouse, am) * (1 - cm);
    const rx = rxBase - state.my * cfg.mouseTilt * mouseK;
    const ry = ryBase + state.mx * cfg.mouseTilt * mouseK;
    const mx = lx + state.mx * cfg.mouseMove * mouseK;
    const my = ly + state.my * cfg.mouseMove * mouseK;

    setStyle(logo, 'transform',
        `translate3d(${r1(mx)}px, ${r1(my)}px, 0) scale(${r3(ls)}) ` +
        `rotateX(${r1(rx)}deg) rotateY(${r1(ry)}deg)`);
    const sharp = stage(p, TIMELINE.logoSharpen);
    setStyle(logoBlur, 'opacity', r3(1 - sharp));
    setStyle(logoSharp, 'opacity', r3(sharp));

    /* ---------- Lens (vision + goals) ---------- */

    // The 3D logo doesn't return; the lens zooms out as a flat logo and splits into shards
    const lensIn = stage(p, TIMELINE.lensSwap);
    const split = stage(p, TIMELINE.split);
    const lensOn = lensIn * (1 - split);
    setStyle(logo, 'opacity', r3(lerp(cfg.opacity, cfg.endOpacity, l) * (1 - lensIn)));
    setStyle(lens, 'opacity', r3(lensOn));
    setStyle(lens, 'visibility', lensOn > 0 ? 'visible' : 'hidden');

    if (lensOn > 0) {
        const L = D.lens;
        const z = stage(p, TIMELINE.lensZoom) * (1 - stage(p, TIMELINE.lensZoomOut));
        // Exponential scale for perceptually even zoom
        const k = Math.pow(L.S, z);

        // Focus point (bottom of ring) travels to viewport center
        const fx = L.x + cfg.lensFx * L.w;
        const fy = L.y + cfg.lensFy * L.h;
        const px = lerp(fx, L.W / 2, z);
        const py = lerp(fy, L.H / 2, z);
        const tx = px - L.x - k * cfg.lensFx * L.w;
        const ty = py - L.y - k * cfg.lensFy * L.h;
        setStyle(lens, 'transform', `translate3d(${r1(tx)}px, ${r1(ty)}px, 0) scale(${r3(k)})`);

        // Counter-transform so content stays fixed on screen
        const ax = -(L.x + tx) / k;
        const ay = -(L.y + ty) / k;
        setStyle(lensContent, 'transform', `scale(${1 / k}) translate3d(${r1(ax * k)}px, ${r1(ay * k)}px, 0)`);

        const vIn = stage(p, TIMELINE.visionIn) * (1 - stage(p, TIMELINE.visionOut));
        reveal(visionBlock, vIn);

        const gOut = 1 - stage(p, TIMELINE.goalsOut);
        const gIn = stage(p, TIMELINE.goalsIn);
        setStyle(goalsBlock, 'opacity', gIn > 0 && gOut > 0 ? '1' : '0');
        reveal(goalsTitle, gIn * gOut);
        goalItems.forEach((item, i) => {
            const shift = MOTION.goalStagger * (i + 1);
            reveal(item, stage(p, [TIMELINE.goalsIn[0] + shift, TIMELINE.goalsIn[1] + shift]) * gOut);
        });
    }

    /* ---------- Values ---------- */

    const sm = stage(p, TIMELINE.shardsMove);
    reveal(valuesTitle, stage(p, TIMELINE.valuesTitle));

    // Explode offset collapses as shards reach the row
    const ex = stage(p, TIMELINE.explode) * (1 - sm);

    shards.forEach((shard, i) => {
        const shift = MOTION.cardStagger * i;
        const card = stage(p, [TIMELINE.cardsIn[0] + shift, TIMELINE.cardsIn[1] + shift]);
        const d = D.shards[i];
        const [dx, dy] = LOGO_PIECES[i].dir;
        const op = split * (1 - card);
        const sx = d.x * sm + dx * cfg.shardExplode * ex;
        const sy = d.y * sm + dy * cfg.shardExplode * ex;
        // Scale around the shard's own center
        const [cx, cy] = LOGO_PIECES[i].center;
        setStyle(shard, 'transformOrigin', `${cx * 100}% ${cy * 100}%`);
        setStyle(shard, 'opacity', r3(op));
        setStyle(shard, 'visibility', op > 0 ? 'visible' : 'hidden');
        setStyle(shard, 'transform',
            `translate3d(${r1(sx)}px, ${r1(sy)}px, 0) scale(${r3(lerp(1, cfg.shardScale, sm) * (1 - card * 0.3))})`);

        const vc = valueCards[i];
        setStyle(vc, 'opacity', r3(card));
        setStyle(vc, 'transform', `scale(${r3(lerp(0.85, 1, card))})`);
    });

    /* ---------- Background ---------- */

    let li = 0;
    while (li < LIGHTS.length - 2 && p >= LIGHTS[li + 1].at) li++;
    const k0 = LIGHTS[li];
    const k1 = LIGHTS[li + 1];
    const lt = ease(clamp((p - k0.at) / (k1.at - k0.at)));
    const W = window.innerWidth;
    const H = window.innerHeight;
    setStyle(lightA, 'transform', `translate3d(${Math.round(lerp(k0.a[0], k1.a[0], lt) * W)}px, ${Math.round(lerp(k0.a[1], k1.a[1], lt) * H)}px, 0)`);
    setStyle(lightB, 'transform', `translate3d(${Math.round(lerp(k0.b[0], k1.b[0], lt) * W)}px, ${Math.round(lerp(k0.b[1], k1.b[1], lt) * H)}px, 0)`);

    // Parallax opposite to mouse (single composited layer, no repaint)
    setStyle(aura, 'transform',
        `translate3d(${r1(-state.mx * cfg.bgMove)}px, ${r1(-state.my * cfg.bgMove)}px, 0)`);

    const spx = (state.mx + 1) / 2 * window.innerWidth;
    const spy = (state.my + 1) / 2 * window.innerHeight;
    setStyle(spot, 'transform', `translate3d(${Math.round(spx)}px, ${Math.round(spy)}px, 0)`);
}

// Single rAF loop for scroll + mouse; stops itself once settled
function tick() {
    state.p += (state.tp - state.p) * MOTION.scrollSmooth;
    state.mx += (state.tmx - state.mx) * MOTION.mouseSmooth;
    state.my += (state.tmy - state.my) * MOTION.mouseSmooth;

    const settled =
        Math.abs(state.tp - state.p) < 0.0005 &&
        Math.abs(state.tmx - state.mx) < 0.001 &&
        Math.abs(state.tmy - state.my) < 0.001;

    if (settled) {
        state.p = state.tp;
        state.mx = state.tmx;
        state.my = state.tmy;
    }

    render();

    if (settled) {
        running = false;
        // Drop will-change so the logo re-rasterizes at its current size
        logo.classList.add('is-idle'); lens.classList.add('is-idle');
    } else {
        requestAnimationFrame(tick);
    }
}

function start() {
    if (running) return;
    running = true;
    logo.classList.remove('is-idle'); lens.classList.remove('is-idle');
    requestAnimationFrame(tick);
}

window.addEventListener('scroll', () => {
    state.tp = scrollProgress();
    start();
}, { passive: true });

window.addEventListener('mousemove', (e) => {
    if (reduceMotion) return;
    state.tmx = (e.clientX / window.innerWidth) * 2 - 1;
    state.tmy = (e.clientY / window.innerHeight) * 2 - 1;
    spot.classList.add('is-active');
    start();
});

// Mouse left the page: hide spot, ease everything back to rest
document.documentElement.addEventListener('mouseleave', () => {
    spot.classList.remove('is-active');
    state.tmx = 0;
    state.tmy = 0;
    start();
});

// Re-measure on resize, throttled to one per frame
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
