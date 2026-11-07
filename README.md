# ROOTS.

**Where do you come from?**

**Live:** [abejit-singh.github.io/roots](https://abejit-singh.github.io/roots/)

ROOTS is a single-page, interactive family tree that grows downwards, like roots: you at the surface, and every generation of your family a layer deeper. Add the people you know, and see how far back your family goes, where it was born, how its lives overlapped with yours, and how many people it took to make you.

No backend, no build step, no dependencies to install. Everything runs client-side and saves to your browser's `localStorage`.

## Live features

- **Your root system.** Your family drawn as roots under the ground, five generations deep: parents, grandparents, great-grandparents and two more, 62 ancestors in all. Every person you add grows two new roots, their father and their mother, so the tree grows one generation at a time. Hover (or focus) anyone to light up the line that connects them to you.
- **Everyone's details.** Name, year of birth and of death (or still living), town and country of birth, and a short story, edited in a side panel (a bottom sheet on phones). The years are checked, so a parent can never be born after their child.
- **The generations behind you.** How many ancestors you've added in each generation, how far back your known family history goes, and your family's own average age gap between parents and children.
- **Origins.** Where your family was born, generation by generation, and the towns it comes from. Country names typed in Italian ("Italia", "Germania"…) are recognised too.
- **The numbers behind you.** A slider through up to 40 generations: how many ancestors there are in each, roughly when they were born, and why the number can't keep doubling forever.
- **Their lifetimes.** Every life in the tree on one timeline, next to yours, with how many of them overlapped with your own.
- **Who should I ask about?** A closing screen that suggests whose name, or whose story, to ask your family about next.
- **Save a copy.** Download your tree as a file, and load it again later or on another device.

All numbers are computed live from what you enter. Nothing is hardcoded or simulated.

## How the numbers are calculated

| Figure | Formula |
| --- | --- |
| Places in each generation | 2ⁿ ancestors n generations back: 2 parents, 4 grandparents, 8 great-grandparents… |
| People in total | 2ⁿ⁺¹ − 2 between you and generation n |
| Places in the tree | each person has a number: you are 1, and anyone's father is 2 × their number and their mother 2 × their number + 1 (the Ahnentafel numbering genealogists use). A number alone tells a person's generation, side of the family and exact relationship to you. |
| Years per generation | the average gap between a parent's year of birth and their child's, over every pair where both are known; 28 years when there are none (a common estimate). It can also be set with a slider. |
| Born around | your year of birth − generations back × years per generation |
| Family history | this year − the earliest year of birth in your tree |
| Overlapping lives | ancestors still living, or who died in or after your year of birth |

## Running it locally

No installation required.

1. Download `index.html`.
2. Open it in any modern browser (double-click, or drag it into a browser window).

An internet connection is used only to load Google Fonts (Inter, Space Grotesk, Fraunces, JetBrains Mono) on first load. Everything else works offline.

## Installing as an app (PWA)

ROOTS is a Progressive Web App. Once it's hosted over HTTPS (for example on GitHub Pages), you can install it like a native app, with its own icon (an "R." monogram matching the site's wordmark) and offline support.

- **On mobile:** open the site, then use your browser's "Add to Home Screen" option (Safari: Share → Add to Home Screen; Chrome: menu → Install app).
- **On desktop:** Chrome and Edge show an install icon in the address bar.

When you're online the page is always loaded fresh, so updates appear immediately. The saved copy is only used offline. The install prompt and offline mode only activate over HTTPS. Opening `index.html` directly from disk (`file://`) works for everything else.

## Privacy

ROOTS collects nothing and sends nothing to any server it controls. There is no backend at all.

- **What's stored:** the people you add (names, years, places and stories) and the years-per-generation setting. They are saved only in your browser's `localStorage`, under the key `roots_state_v1`.
- **Where it goes:** nowhere. It never leaves your device. There's no analytics, tracking, cookies or logging of any kind. "Save a copy" downloads a file to your own device; nothing is uploaded.
- **The one external request:** Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), to load the site's typefaces. Like any font or image load on any website, this exposes your IP address to Google as a normal side effect of the request. ROOTS itself doesn't send Google, or anyone, any of your data.
- **Security:** a Content Security Policy blocks any outside script or connection. All text you type is escaped before it is displayed, and saved data, and any file you load, is validated every time it is read.
- **Clearing your data:** use the reset button (bottom-left of the site) at any time.

A family tree holds information about other people too, some of them living. Keeping it on your own device, rather than on a server, is deliberate.

## Tech

Vanilla HTML, CSS and JavaScript in a single, fully commented file. No frameworks, no build tools, no external JavaScript. The tree is drawn directly as SVG.

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `manifest.json` | App name, colours and icons for installation |
| `service-worker.js` | Offline support and instant updates |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png` | App icons |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |

## Disclaimer

ROOTS is a personal record of what you enter. It is not a genealogical database or a historical source, and it doesn't check anything against outside records. "Born around" dates and generation lengths are estimates. The chart follows the classic pedigree layout, with a father's and a mother's place for each person.

## Copyright

© 2026 Abejit. All rights reserved.

This project is shared publicly on GitHub for portfolio purposes. No license is granted to copy, modify, redistribute or reuse this code or design. Please don't recreate this project. If you'd like to use any part of it, get in touch first.
