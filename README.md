# EasyRead ⚡

> A lightweight browser extension that **speed-reads** any selected text — or the whole article — by flashing **one magnified word at a time** at your chosen pace, with a fixed focus point so your eyes never move.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-6c4ad6)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/version-2.0.0-success)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![Vanilla JS](https://img.shields.io/badge/built%20with-vanilla%20JS-f7df1e)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-orange)

EasyRead uses **RSVP** (Rapid Serial Visual Presentation): instead of moving your
eyes across lines of text, it shows each word in the same spot, big and centered,
at a controlled words-per-minute speed. A red **optimal recognition point** keeps
each word aligned to a fixed guide so your gaze stays still — letting you read
faster with less eye fatigue. Works **offline, no account, no tracking**.

---

## ✨ Features

- **Reads selection or full article** — highlight text to read just that, or read the page's main content automatically.
- **One magnified word at a time** (RSVP), centered in a focused, distraction-free overlay.
- **Fixed focus point** — a red pivot letter (optimal recognition point) anchored to a center guide so your eyes don't dart around.
- **Adjustable speed** — 100–900 WPM, with smart micro-pauses on long words and at sentence boundaries for comprehension.
- **Full transport controls** — play/pause, step forward/back, restart, live progress bar and word counter.
- **Keyboard-driven** — `Space` play/pause, left/right step, up/down speed, `Esc` close.
- **Three ways to trigger** — toolbar button, right-click menu, or `Alt+R`.
- **Remembers your WPM** via `chrome.storage`.
- **Privacy-first** — `activeTab` only; the extension touches a page solely when you ask. No broad host permissions.

## 📦 Install (unpacked)

1. Download this repo: on GitHub click **Code -> Download ZIP**, then unzip. (Or `git clone https://github.com/tl-enrico-manasse/easyread.git`.)
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the **`src/`** folder.
5. Pin the EasyRead icon from the puzzle-piece menu (optional).

> Load the `src/` folder, **not** the repository root — `manifest.json` lives in `src/`.

## Usage

| Action | How |
| --- | --- |
| Speed-read selected text | Select text, then press `Alt+R` (or right-click, or click the toolbar icon) |
| Speed-read the whole article | Trigger EasyRead with nothing selected |
| Play / pause | `Space`, or the play/pause button |
| Step one word back / forward | left / right arrows, or the buttons |
| Faster / slower | up / down arrows, or the WPM slider |
| Restart | the restart button |
| Close | `Esc`, the close button, or click the dimmed background |

Reading starts automatically when the overlay opens. Keep your eyes on the red
letter — that's the whole trick.

## How it works

1. **Extract** — `content.js` reads your selection, or runs a lightweight readability heuristic to pull the page's main article text.
2. **Split** — the text is broken into words (very long tokens like URLs are chunked so they never overflow the display).
3. **Present** — words are shown one at a time via a self-correcting `setTimeout` loop. Each word's display time is `60000 / WPM`, nudged longer for long words and at punctuation.
4. **Anchor** — for each word an optimal recognition point is computed; using a monospace font and `ch` units, the word is shifted so that pivot letter lands exactly on the fixed center guide.

The content script is injected **on demand** by the background service worker via
`activeTab` + `chrome.scripting` — nothing runs on a page until you ask.

## Project structure

```
easyread/
├── src/                  # the extension (load THIS folder as unpacked)
│   ├── manifest.json     # MV3 manifest
│   ├── background.js     # service worker: triggers + on-demand injection
│   ├── content.js        # extraction, RSVP overlay, pacing, focus point
│   ├── content.css       # overlay styles
│   ├── popup.html        # toolbar popup
│   ├── popup.js          # popup logic
│   └── icons/            # 16 / 48 / 128 px icons
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## Browser support

| Browser | Status |
| --- | --- |
| Chrome / Chromium | Supported |
| Edge | Supported |
| Brave | Supported |
| Firefox | Needs a manifest tweak (`background.scripts`) — not yet packaged |

## Roadmap

- [ ] Import PDFs and EPUBs (not just page text), like dedicated speed-reader apps.
- [ ] "Rewind on resume" so pausing rewinds a couple of words for context.
- [ ] Per-word progress save, to resume a long article later.
- [ ] Light theme for the overlay.
- [ ] Firefox build.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs are welcome.

## License

[MIT](LICENSE) © Enrico Manasse
