# Contributing to EasyRead

Thanks for your interest in improving EasyRead! This is a small, dependency-free
project, so getting started is quick.

## Getting set up

1. Fork and clone the repo.
2. Load the extension unpacked:
   - Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `src/` folder.
3. Make your changes in `src/`.
4. After editing, click the **reload** ↻ icon on the extension card to apply changes, then test on a real page.

There is no build step — it's vanilla JS, HTML, and CSS.

## Project layout

The entire extension lives in `src/`. See the *Project structure* section of the
[README](README.md) for a file-by-file overview. The bulk of the logic is in
`src/content.js` (text extraction, the reader overlay, speech, and highlighting).

## Coding guidelines

- Keep it dependency-free and framework-free.
- 2-space indentation; semicolons; `const`/`let` (no `var`).
- Prefer clear names and short functions; comment the *why*, not the obvious.
- Never use `innerHTML` with page-derived text — use `textContent` /
  `createTextNode` (the overlay relies on this to stay XSS-safe).
- Match the existing style; no formatter is enforced, but Prettier defaults are a safe bet.

## Testing checklist (manual)

Before opening a PR, confirm on at least one news article and one long page:

- [ ] Reads a selection when text is selected.
- [ ] Reads the main article when nothing is selected.
- [ ] Word highlighting tracks the narration and auto-scrolls.
- [ ] Play / pause / stop, speed, and voice all work.
- [ ] Click-to-jump starts from the clicked word.
- [ ] Closing (✕ / `Esc`) stops speech and removes the overlay.

## Commit messages

Short, imperative summaries (e.g. `Fix scroll jitter at high speed`).
[Conventional Commits](https://www.conventionalcommits.org/) are welcome but not required.

## Reporting bugs

Open an issue with your browser + version, the page URL (if shareable), the
selected voice, and steps to reproduce. Highlighting issues are often
voice-specific (some voices don't emit `boundary` events), so the voice name helps.
