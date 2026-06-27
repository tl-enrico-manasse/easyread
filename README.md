# EasyRead 🔊

> A lightweight browser extension that reads any selected text — or the whole article — aloud, **word by word**, in a clean reader view.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-6c4ad6)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-success)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![Vanilla JS](https://img.shields.io/badge/built%20with-vanilla%20JS-f7df1e)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-orange)

EasyRead uses the browser's built-in speech engine (the Web Speech API), so it
works **offline, with no account, no API key, and no tracking**. Select text,
press a shortcut, and follow along as each word is highlighted in sync with the
narration.

---

## ✨ Features

- **Reads selection or full article** — highlight text to read just that, or read the page's main content automatically.
- **Live word-by-word highlighting** with smart auto-scroll.
- **Playback controls** — play / pause / stop, adjustable speed (0.5×–2.5×), and a voice picker.
- **Click-to-jump** — click any word in the reader to start from there.
- **Three ways to trigger** — toolbar button, right-click menu, or `Alt+R`.
- **Remembers your settings** (speed and voice) via `chrome.storage`.
- **Privacy-first** — uses the `activeTab` permission, so the extension only ever touches a page when you explicitly ask it to. No broad host permissions, no background page scraping.
- **Dark-mode aware.**

## 📦 Install (unpacked)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/easyread.git
   ```
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the **`src/`** folder inside this repo.
5. Pin the EasyRead icon from the puzzle-piece menu (optional).

> Load the `src/` folder, **not** the repository root — `manifest.json` lives in `src/`.

## ▶️ Usage

| Action | How |
| --- | --- |
| Read selected text | Select text, then press `Alt+R` (or right-click → *Read aloud with EasyRead*) |
| Read the whole article | Trigger EasyRead with nothing selected |
| Play / pause | Click ⏸ / ▶ or press `Space` |
| Stop | Click ⏹ |
| Change speed / voice | Use the controls in the reader bar |
| Jump to a word | Click any word in the reader |
| Close | Click ✕ or press `Esc` |

## 🧠 How it works

1. **Extract** — `content.js` reads your selection, or runs a lightweight readability heuristic to pull the page's main article text.
2. **Tokenize** — the text is split into word tokens, each remembering its character offset, and rendered as clickable `<span>`s.
3. **Speak** — the text is spoken in sentence-sized chunks via `speechSynthesis`. Sentence chunking sidesteps a long-standing Chrome cutoff on long utterances and keeps controls responsive.
4. **Highlight** — each `boundary` event the speech engine emits reports the character index being spoken; EasyRead maps that to the matching word span and highlights it.

The content script is injected **on demand** by the background service worker
using `activeTab` + `chrome.scripting` — nothing runs on a page until you ask.

## 🗂️ Project structure

```
easyread/
├── src/                  # the extension (load THIS folder as unpacked)
│   ├── manifest.json     # MV3 manifest
│   ├── background.js     # service worker: triggers + on-demand injection
│   ├── content.js        # extraction, reader overlay, TTS, highlighting
│   ├── content.css       # reader overlay styles
│   ├── popup.html        # toolbar popup
│   ├── popup.js          # popup logic
│   └── icons/            # 16 / 48 / 128 px icons
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## 🌐 Browser support

| Browser | Status |
| --- | --- |
| Chrome / Chromium | ✅ Supported |
| Edge | ✅ Supported |
| Brave | ✅ Supported |
| Firefox | ⚠️ Needs a manifest tweak (`background.scripts`) — not yet packaged |
| Safari | ⚠️ `onboundary` word events are unreliable; speech works, highlighting may not |

> **Note:** built-in voices are free and offline but sound robotic. Word
> highlighting depends on the voice emitting `boundary` events; most local
> voices do, some remote/cloud voices don't.

## 🛣️ Roadmap

- [ ] Natural AI voices (bring-your-own cloud key: Google Cloud, Azure, ElevenLabs) with audio playback + timing-driven highlighting.
- [ ] Optional **AI summarize-then-read** (send article to an LLM, read the summary).
- [ ] Firefox build.
- [ ] PDF support.

> The AI items above are the only place where concerns like prompt-injection
> hardening, model choice (GPT-5 / Claude / Gemini), and hallucination handling
> become relevant. The current build contains no LLM and makes no network calls,
> so those review categories don't apply to it yet.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs are welcome.

## 📄 License

[MIT](LICENSE) © Enrico Manasse
