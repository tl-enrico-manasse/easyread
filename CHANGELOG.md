# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Import PDFs and EPUBs, not just page text.
- "Rewind on resume" and per-word progress saving for long articles.
- Light overlay theme and a Firefox build.

## [2.0.0] — 2026-06-27

Major redesign. EasyRead is now an **RSVP speed reader** rather than a
text-to-speech tool. (The product it was modeled on, ReadMaxx, is a visual
speed reader, not a read-aloud app.)

### Changed
- **Replaced text-to-speech with RSVP**: words are now flashed one at a time,
  magnified and centered, at a configurable WPM — no audio.
- Reworked the overlay into a focused, dimmed speed-reading view.

### Added
- Optimal recognition point: a red pivot letter anchored to a fixed center
  guide (monospace + `ch`-unit alignment) so the eyes stay still.
- WPM control (100–900) with smart micro-pauses on long words and at sentence
  boundaries; persisted via `chrome.storage`.
- Transport controls: play/pause, step back/forward, restart, progress bar, and
  a live word counter, with full keyboard support
  (Space, arrows, Esc).

### Removed
- `speechSynthesis` narration, voice picker, and word-boundary highlighting.

## [1.0.0] — 2026-06-27

### Added
- Initial release: read aloud the user's selection or the page article via the
  browser's built-in speech engine, with live word-by-word highlighting, a
  reader overlay, speed/voice controls, and three trigger paths.
- On-demand injection via `activeTab`; re-injection-safe content script.
- Page-derived text rendered with `textContent` only (XSS-safe).

[Unreleased]: https://github.com/tl-enrico-manasse/easyread/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/tl-enrico-manasse/easyread/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/tl-enrico-manasse/easyread/releases/tag/v1.0.0
