# Demo — Verdant Studio (placeholder)

A working replica of the production landscaping site this skill was extracted from. All brand and contact information is replaced with placeholders; the gallery imagery and 121-frame hero animation are real.

## Run locally

The site needs an HTTP origin (canvas image loads break under `file://`).

```bash
# from this folder
python -m http.server 8080
# or
npx serve -l 8080
```

Open http://localhost:8080.

## What you should see

1. Loading screen with spinner (panel-green background).
2. Hero garden image fades in with "Your garden, reimagined." headline.
3. Scroll → 121-frame disassembly animation, four hero text overlays scale through view.
4. Six modal cards (about, work, services, process, faq, contact) march up the screen as a continuous conveyor belt.
5. Mouse-tracked parallax on desktop; hamburger nav on mobile; back-to-top button after the hero.

## Replace placeholders with your brand

In `index.html`, search-and-replace:

| Find | Replace with |
|------|--------------|
| `Verdant Studio` | your company name |
| `+44 1234 567890` | your phone |
| `+441234567890` | your phone (no spaces, used in `tel:` links) |
| `hello@example.com` | your email |
| `verdantstudio.example` | your domain |
| `Studio Founder` | your name |
| `placeholder-portrait.svg` | your portrait image filename |
| `VS` (in `<span class="nav__logo-mark">`) | your initials |
| `Studio Demo` (in `<span class="nav__logo-name">`) | your tagline |

Replace gallery JPGs and the hero PNG sequence in `frames/` with your own assets.

See the parent `SKILL.md` for the full architecture explanation.
