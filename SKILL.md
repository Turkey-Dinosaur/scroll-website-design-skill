---
name: scroll-website-design-skill
description: Build a single-viewport modal-deck website. The page never visually scrolls past one viewport — instead a fixed hero canvas stays as a backdrop while a vertical strip of solid-colour modal cards translates upward in a continuous conveyor belt, driven 1:1 by body scroll. Includes scroll-driven canvas frame sequences, scale-through-viewer hero text overlays, mouse-tracked parallax, hidden scrollbar, and a hamburger-menu mobile mode. Use when the user asks for a "single-viewport / one-screen / no-scroll" website, a modal-deck or conveyor-belt scroll experience, or anything inspired by the urban-jungle / liquid-scroll design pattern.
---

# Scroll Website Design Skill

## When to invoke

Trigger this skill when a user asks for any of:

- "Single-viewport" / "one-screen" / "no-scroll" website
- Modals that pop up over a hero backdrop as the user scrolls
- Conveyor-belt / vertical-strip scroll mechanism
- VR-style mouse parallax on a website
- Hidden scrollbar with custom scroll-driven animations
- A site inspired by the urban-jungle / Liquid-glass / Apple-product-page scroll style

## Required dependencies

| Dep | Purpose | Install |
|-----|---------|---------|
| **GSAP 3.x** | Tweens + scroll mapping | CDN: `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js` |
| **GSAP ScrollTrigger** | scroll-position triggers, scrub | CDN: `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js` |

Source: <https://github.com/greensock/GSAP.git>

## Recommended companion skills

- **taste-skill** — Senior UI/UX engineering rules. Strongly recommended to enforce premium-quality design while building with this skill. <https://github.com/Leonxlnx/taste-skill.git>

## Architecture (three layers)

```
<body>                                    ← scroll container
  <header class="nav">                    ← fixed pill, hides during hero
  <main>
    <div class="stage">                   ← position: fixed; inset: 0
      <div class="stage__bg">             ← hero canvas + 4 text overlays
      <div class="deck">                  ← clips the strip to viewport
        <div class="deck__strip">         ← THE conveyor belt
          <article class="card">          ← each card = one slot
            <div class="card__panel">     ← visible olive-green modal
    <div class="scroll-track">            ← only thing generating body height
  <button class="back-to-top">            ← appears after hero
```

The trick: the body actually scrolls (because `.scroll-track` makes it tall), but visually the `.stage` is `position: fixed`, so the user only ever sees one viewport. As the body scrolls, JS translates the `.deck__strip` upward 1:1, marching one card after another past the viewport.

## How the conveyor maths work

- `.deck__strip` starts at `top: 100vh` of the deck, so card 0 sits one viewport below visible area.
- A single `gsap.to(strip, { y: -stripHeight, ease: 'none', scrollTrigger: ... })` translates the entire strip upward by exactly `strip.offsetHeight` pixels over `stripHeight` of body scroll. **No per-card math.** Cards always maintain their original spacing relative to each other → overlap is impossible.
- `.scroll-track` height is set in JS to `heroPx + stripHeight + viewport` so the body scroll budget exactly matches the conveyor travel.

```js
const heroPx = () => window.innerHeight;
const stripPx = () => document.getElementById('deck-strip').offsetHeight;

function sizeTrack() {
  const track = document.getElementById('scroll-track');
  track.style.height = `${heroPx() + stripPx() + window.innerHeight}px`;
}

gsap.to(strip, {
  y: () => -stripPx(),
  ease: 'none',
  scrollTrigger: {
    trigger: scrollTrack,
    start: () => `top+=${heroPx()}px top`,
    end:   () => `top+=${heroPx() + stripPx()}px top`,
    scrub: 0.25,
    invalidateOnRefresh: true
  }
});
```

## Hero canvas + text overlays

A 61-frame PNG sequence (or any N-frame sequence) is preloaded then drawn to a canvas as the user scrolls. Frame index = `Math.round(scrollProgress * (FRAME_COUNT - 1))`.

The hero owns exactly the **first viewport** of body scroll. Within that viewport, four text overlays each take a quarter-slice and play a "scale through viewer" animation — scale 0.5 → 1 → 1.7 paired with opacity 0 → 1 → 0 — so the words feel like they pass through the camera as you scroll.

```js
gsap.to(obj, {
  frame: FRAME_COUNT - 1,
  ease: 'none',
  snap: 'frame',
  scrollTrigger: {
    trigger: scrollTrack,
    start: 'top top',
    end: () => `top+=${heroPx()}px top`,
    scrub: 0.55,
    onUpdate: () => drawFrame(Math.round(obj.frame))
  }
});
```

The first overlay (`.hero-overlay--static`) starts at `opacity: 1` so it's visible the instant the page paints (before frames load), and only plays the scale-out half of the animation.

## Mouse parallax

Two layers, two magnitudes, lerped via `requestAnimationFrame`:

```js
let tx=0, ty=0, sx=0, sy=0;
window.addEventListener('pointermove', e => {
  tx = (e.clientX / innerWidth  - 0.5) * 2;
  ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

const tick = () => {
  sx += (tx - sx) * 0.06;
  sy += (ty - sy) * 0.06;
  stageBg.style.transform = `translate3d(${sx*-6}px, ${sy*-6}px, 0) scale(1.03)`;
  deck.style.transform    = `translate3d(${sx*10}px, ${sy*10}px, 0)`;
  requestAnimationFrame(tick);
};
```

- Backdrop (`.stage__bg`) drifts opposite the cursor — feels like depth.
- Deck drifts **toward** the cursor — feels like a panel hovering above.
- 2D translate only — no `rotateX/Y` (those caused subtle clipping with `backdrop-filter`).
- Disabled on `pointer: coarse` and `prefers-reduced-motion: reduce`.
- Diff-gated: skips the style write when motion is sub-pixel.

## Solid modal cards (no fade)

Cards are **always opaque**. The animation is pure translate; no opacity fade, no scale change. This was a hard-won lesson — opacity tweens combined with `backdrop-filter` and overlapping ScrollTrigger ranges cause cards to render at low effective opacity. The conveyor + solid panels eliminates the entire class of bug.

```css
.card__panel {
  background: #2e3a26;             /* olive — same as loader, body, canvas fill */
  border: 1px solid var(--line-2);
  border-radius: 22px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  /* NO backdrop-filter — adds repaint cost during parallax + breaks stacking. */
}
```

## Hide the scrollbar (without breaking scroll)

```css
html, body {
  scrollbar-width: none;            /* Firefox */
  -ms-overflow-style: none;         /* old IE/Edge */
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;                    /* Webkit / Blink */
}
```

**Critical**: do NOT set `body { overflow-x: hidden }`. The CSS Overflow spec coerces `overflow-y: visible` → `auto` when one axis is `hidden`, which makes `<body>` itself a scroll container and breaks ScrollTrigger's window-scroll listener. Use `.stage { overflow: hidden }` instead.

## Mobile rules (critical for touch UX)

On `max-width: 820px`:

1. **No internal panel scroll** — `overflow-y: auto` on the panel hijacks touch gestures. Instead, let each card slot grow to fit its content (`height: auto; min-height: 100vh`) and let the body conveyor scroll handle everything.
2. **Strip height measured dynamically** — `stripPx()` returns `strip.offsetHeight` (not `N × innerHeight`). Track height recomputed on resize.
3. **Anchor links** target the actual measured card position: `heroPx + 0.5*innerHeight + cardEl.offsetTop + cardEl.offsetHeight/2` (centres the card in viewport).
4. **Nav becomes hamburger** with a green translucent dropdown (matches modal panels at 92% opacity).
5. **Mouse parallax disabled** via `matchMedia('(pointer: coarse), (max-width: 820px)')` early-return.

## Nav visibility logic

- Visible at scroll 0 (page load shows brand)
- Hidden during hero (scroll 30 → heroPx-60)
- Visible after hero (across all modal cards)
- Visible again if user scrolls back to top

```js
ScrollTrigger.create({
  trigger: scrollTrack,
  start: () => `top+=30px top`,
  end:   () => `top+=${Math.max(60, heroPx() - 60)}px top`,
  onEnter:     () => nav.classList.add('nav--hidden'),
  onLeave:     () => nav.classList.remove('nav--hidden'),
  onEnterBack: () => nav.classList.add('nav--hidden'),
  onLeaveBack: () => nav.classList.remove('nav--hidden')
});
```

## Reduced-motion fallback

Every visual effect (fixed stage, parallax, conveyor) reverts cleanly under `@media (prefers-reduced-motion: reduce)`:

```css
@media (prefers-reduced-motion: reduce) {
  .stage, .stage__bg, .deck, .deck__strip { position: relative; transform: none !important; }
  .card { width: 100%; height: auto; padding: var(--section-y) var(--gutter); }
  .card__panel { width: 100%; max-width: 1280px; min-height: auto; max-height: none;
                 background: transparent; border: 0; border-radius: 0; box-shadow: none; }
  .scroll-track { display: none; }
}
```

So motion-sensitive users get a normal stacked-section page with the same content.

## Build steps for a new site

1. Copy `demo/index.html`, `demo/style.css`, `demo/script.js` as the starting point.
2. Replace the brand name in:
   - `<title>` and meta description / OG / Twitter tags
   - All four JSON-LD `<script type="application/ld+json">` blocks (LocalBusiness, Organization, BreadcrumbList, FAQPage)
   - `<header class="nav">` logo
   - All references in card content
3. Replace contact info (phone, email) — search for `tel:` and `mailto:` and the FAQ JSON-LD.
4. Replace `frames/frame-001.png` … `frame-NNN.png` with your sequence and update `FRAME_COUNT` in script.js.
5. Replace gallery images in the `[data-card="work"]` card.
6. Replace `JamieM.jpg` (or your portrait) in the `[data-card="about"]` card.
7. Tune the design tokens at the top of style.css.
8. (Optional) Add or remove cards by adding `<article class="card" data-card="newId">` blocks and a matching string in the `CARD_IDS` array in script.js.

## Files in this skill

- `demo/index.html` — reference markup (with placeholder brand)
- `demo/style.css` — full stylesheet
- `demo/script.js` — full conveyor + parallax + nav logic
- `demo/frames/` — 61-frame hero sequence (JPG, ~16 MB total)
- `demo/gallery-*.svg` — placeholder gallery imagery
- `README.md` — installation and usage instructions
