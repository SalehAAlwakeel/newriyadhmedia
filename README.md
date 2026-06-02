# New Riyadh Media — Website

A minimal, elegant, animation-rich one-page site for the New Riyadh Media marketing agency.
The palette mirrors the brand mark: warm cream (`#f2ebd9`) and deep ink (`#0e0d0b`), paired with classic serif display type (Cormorant Garamond) and a clean sans (Inter).

## Features

- Cinematic preloader with animated count + monogram reveal
- Custom blend-mode cursor with hover-state morphing
- Lenis-powered smooth scrolling
- GSAP + ScrollTrigger word-by-word headline reveals
- Animated stat counters
- Infinite italic marquee strip
- Scroll-driven parallax on case-study imagery
- Hover-lit service rows (ink wipe)
- Subtle paper-grain overlay for tactility
- Fully responsive, with `prefers-reduced-motion` fallbacks

## Structure

```
new_riyadh_media/
├── index.html
├── styles.css
├── script.js
├── assets/
│   └── logo.png
└── README.md
```

## Run locally

The site is fully static. The fastest way:

1. Double-click `index.html` to open it directly in a browser, **or**
2. Serve with a tiny local server for best results:

```powershell
# from the project folder
python -m http.server 5173
# then open http://localhost:5173
```

or with Node:

```powershell
npx serve .
```

## Customizing

- Colors live as CSS custom properties at the top of `styles.css` (`--cream`, `--ink`, etc.).
- Headline copy and section text are in `index.html` (sections are commented).
- Replace the placeholder case-study tiles with real imagery by changing each `.case__img`'s background to a `url(...)` and removing the `--c1 / --c2` gradient.
- Swap `assets/logo.png` to update the favicon and brand mark.

## Browser support

Latest Chrome, Edge, Safari, and Firefox. Animations gracefully degrade on older
engines and fully disable when the user has reduced motion enabled.
