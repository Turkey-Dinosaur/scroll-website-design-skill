# scroll-website-design-skill

A Claude Code skill (and complete demo site) for building **single-viewport modal-deck websites** — pages where a fixed hero canvas stays as a backdrop while a vertical conveyor belt of solid-coloured modal cards translates upward 1:1 with body scroll. No visible scrollbar, no overlapping elements, mouse-tracked parallax, full mobile parity.

The skill is the distilled-pattern playbook (`SKILL.md`). The `demo/` folder is a fully-working reference site you can clone, run on `localhost`, and customise — it includes the full 121-frame hero animation and all gallery imagery from the production site this skill was extracted from.

## What you get

- **`SKILL.md`** — the reusable design-pattern guide. Loaded by Claude Code when you invoke the skill from any project, gives the model a complete blueprint of the architecture, choreography, and gotchas.
- **`demo/`** — a self-contained replica site. Open `demo/index.html` in a browser via `localhost` (e.g. `python -m http.server` from the `demo/` folder) and you should see exactly the same scroll experience as the production site — placeholder brand and contact info only.
- **121 hero frames** in `demo/frames/` (JPG, ~33 MB total).
- **Eight placeholder gallery SVGs** in `demo/`.
- **Reduced-motion fallback** that reverts to a normal stacked-section layout for users with `prefers-reduced-motion: reduce`.

## Prerequisites

| Dep | Required? | Notes |
|-----|-----------|-------|
| **Modern browser** | required | Chromium / Firefox / Safari current versions. Uses `backdrop-filter`, `clamp()`, ES2020 JS, `pointer-events`. |
| **GSAP 3.x + ScrollTrigger** | required | Loaded via CDN in `demo/index.html`. Source: <https://github.com/greensock/GSAP.git> |
| **Local web server** | required to run | The canvas frame loader needs an HTTP origin (`file://` breaks it). `python -m http.server`, `npx serve`, or any equivalent works. |
| **`taste-skill`** *(recommended)* | optional | Companion skill for premium UX/UI quality enforcement. Install: <https://github.com/Leonxlnx/taste-skill.git> |

## Install the skill

### As a Claude Code skill (recommended)

Clone into your Claude skills directory:

```bash
# macOS / Linux
git clone https://github.com/Turkey-Dinosaur/scroll-website-design-skill.git \
  ~/.claude/skills/scroll-website-design-skill

# Windows (PowerShell)
git clone https://github.com/Turkey-Dinosaur/scroll-website-design-skill.git `
  $HOME/.claude/skills/scroll-website-design-skill
```

Then in any Claude Code session, ask "build me a single-viewport modal-deck site" or any of the trigger phrases listed in `SKILL.md`. Claude will load the skill and follow the pattern.

### Alongside `taste-skill` (recommended companion)

```bash
git clone https://github.com/Leonxlnx/taste-skill.git \
  ~/.claude/skills/taste-skill
```

`taste-skill` enforces metric-based UI rules (typography, spacing, motion) and pairs naturally with the architecture this skill provides — `taste-skill` answers *what should it look like*, this skill answers *how does the scroll mechanism work*.

## Getting Started — run the demo locally

### Prerequisites

Install once per machine:

| Tool | Ubuntu / Debian | macOS | Windows |
|------|-----------------|-------|---------|
| Git | `sudo apt install git` | built-in / Xcode tools | <https://git-scm.com> |
| Python 3 (for the local server) | `sudo apt install python3` | built-in | `winget install Python.Python.3` |

(Any web server works — `npx serve`, `php -S`, VSCode Live Server, etc. — Python is just the most likely to already be installed.)

### Steps

```bash
# 1. Clone the repo (no LFS — frames ship as JPGs in regular git, ~33 MB).
git clone https://github.com/Turkey-Dinosaur/scroll-website-design-skill.git
cd scroll-website-design-skill/demo

# 2. Serve the demo over HTTP. The site MUST be served — opening
#    `index.html` directly via `file://` breaks the canvas frame loader.
python3 -m http.server 8080
# or:   npx serve -l 8080
# or:   php -S localhost:8080

# 3. Open http://localhost:8080 in a browser.
```

### What you should see

1. A green loading screen with a spinner — usually for under a second.
2. Hero garden image fades in with the headline "Your garden, reimagined."
3. Scrolling triggers a 121-frame disassembly animation while four headlines pass through view.
4. After the hero, six modal cards (about, work, services, process, faq, contact) slide up the screen in sequence as a conveyor belt.
5. Mouse parallax on desktop, hamburger nav on mobile, back-to-top button, no visible scrollbar.

### Troubleshooting

- **Site is stuck on "Loading the garden…"** A frame failed to fetch. Open DevTools → Network and look for a 404 on any `frames/frame-NNN.jpg`. The loader only blocks until frame 1 arrives, so a stuck loader means frame 1 itself is missing.
- **Conveyor doesn't move when scrolling.** Check the browser console for JS errors. Most commonly: GSAP CDN failed to load — verify network access to `cdn.jsdelivr.net`.
- **Frames look blocky / artefacted.** They're JPG q≈85 — high quality but you may want to swap in your own crisper sequence (see "Customise" below).
- **You cloned an older revision that referenced PNG frames.** Pull main (`git pull`) — the frame sequence was converted to JPG to cut the payload from ~386 MB to ~33 MB. If you need the original PNGs, `git checkout <pre-conversion-sha>`.

You should see:

1. A green loading screen with a spinner.
2. Hero garden image fades in with the headline "Your garden, reimagined."
3. Scrolling triggers a 121-frame disassembly animation while four headlines pass through view.
4. After the hero, six modal cards (about, work, services, process, faq, contact) slide up the screen in sequence as a conveyor belt.
5. Mouse parallax on desktop, hamburger nav on mobile, back-to-top button, no visible scrollbar.

## Customise for your own brand

The demo brand and contact info are placeholders. Search-and-replace these strings in `demo/index.html`:

| Find | Replace with |
|------|--------------|
| `Verdant Studio` | your company name |
| `+44 1234 567890` | your phone number |
| `hello@example.com` | your email |
| `verdantstudio.example` | your domain |
| `placeholder-portrait.svg` | your portrait image filename in `demo/about/` |

Replace the gallery images in `demo/` with your own (filename references are in the `[data-card="work"]` card). Replace the frame sequence in `demo/frames/` (any N-frame PNG sequence works — update `FRAME_COUNT` in `script.js`).

Detailed customisation steps are in `SKILL.md`.

## Architecture in 30 seconds

- `<body>` is the scroll container; only `.scroll-track` (an empty div sized in JS) generates body height.
- `.stage` is `position: fixed; inset: 0` — the only thing the user actually sees, ever.
- Inside the stage, `.deck__strip` is a vertical column of `.card` elements. A single GSAP `ScrollTrigger` translates the entire strip upward by exactly `strip.offsetHeight` pixels over `strip.offsetHeight` of body scroll, so cards march past the viewport at a 1:1 rate, never overlapping.
- The hero canvas + four scale-through-viewer text overlays own the first viewport of body scroll.
- Mouse parallax is a `requestAnimationFrame` loop writing `translate3d` to the bg + deck.
- Hidden scrollbar via `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` on both `<html>` and `<body>`.

Full architectural notes — including all the gotchas (don't set `overflow-x: hidden` on body, don't use `backdrop-filter` on the panels, don't use per-card animation timing math) — are in `SKILL.md`.

## License

MIT — see [LICENSE](LICENSE). The hero frame sequence and gallery images are licensed for use within this demo / skill only.

## Credits

Pattern extracted from a production landscaping website built collaboratively with Claude Code. Inspired by the "urban jungle" liquid-scroll design pattern.
