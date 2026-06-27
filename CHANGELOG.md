# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Natural AI voices via bring-your-own cloud key (Google Cloud / Azure / ElevenLabs).
- Optional AI summarize-then-read mode.
- Firefox build and PDF support.

## [1.0.0] — 2026-06-27

### Added
- Read aloud the user's selection, or auto-extract and read the page's main article.
- Live word-by-word highlighting synced to the speech engine's `boundary` events.
- Reader overlay with play/pause/stop, speed (0.5×–2.5×), and voice picker.
- Click-a-word-to-jump.
- Three trigger paths: toolbar popup, right-click menu, and `Alt+R` shortcut.
- Persisted speed/voice settings via `chrome.storage.sync`.
- Dark-mode-aware styling.

### Changed (vs. initial prototype)
- Switched from an always-on content script on `<all_urls>` to **on-demand
  injection** with the `activeTab` permission — smaller footprint, no background
  page access, stronger privacy.
- Content script is now **re-injection-safe** (re-running it re-triggers reading
  instead of stacking duplicate event listeners).

### Fixed
- Word-highlight lookup no longer degrades to O(n²) on long articles (binary
  search to position the cursor, then forward-only scanning).
- Auto-scroll now fires only when the active word is off-screen, removing
  scroll jitter at higher speeds.

### Security / robustness
- Page-derived text is rendered with `textContent` / `createTextNode` only, so
  untrusted page content cannot inject markup into the reader overlay.
- Added guards for browsers without `speechSynthesis` and for pages with no
  readable text.

[Unreleased]: https://github.com/YOUR_USERNAME/easyread/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR_USERNAME/easyread/releases/tag/v1.0.0
