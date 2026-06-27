// EasyRead — content script (RSVP speed reader)
//
// Injected on demand into the active tab. Grabs the user's selection (or the
// page's main article) and presents it ONE MAGNIFIED WORD AT A TIME at a chosen
// words-per-minute pace (Rapid Serial Visual Presentation). A fixed red "optimal
// recognition point" keeps each word aligned so the eyes stay still.
//
// Re-injection safe: re-running this file just re-opens the reader.

(() => {
  if (window.__easyRead) {
    window.__easyRead.start();
    return;
  }

  // ---- State ------------------------------------------------------------
  let overlay = null;
  let displayEl = null;
  let progressEl = null;
  let counterEl = null;
  let wpmValEl = null;
  let playBtn = null;

  let words = [];        // array of word strings
  let idx = 0;           // current word index
  let playing = false;
  let timer = null;

  const settings = { wpm: 300 };

  chrome.storage?.sync?.get(["wpm"], (s) => {
    if (s && typeof s.wpm === "number") {
      settings.wpm = s.wpm;
      if (wpmValEl) setWpm(s.wpm);
    }
  });
  function saveSettings() {
    chrome.storage?.sync?.set({ wpm: settings.wpm });
  }

  // ---- Text extraction (shared heuristic) -------------------------------
  function getSelectionText() {
    const sel = window.getSelection();
    const t = sel ? sel.toString() : "";
    return t.trim().length > 1 ? t : "";
  }

  function extractArticle() {
    const root = document.querySelector("article") || document.body;
    const clone = root.cloneNode(true);
    clone
      .querySelectorAll("script,style,noscript,nav,header,footer,aside,form,button,svg,iframe")
      .forEach((n) => n.remove());
    const blocks = Array.from(clone.querySelectorAll("p,li,h1,h2,h3,blockquote"))
      .map((el) => el.innerText.trim())
      .filter(Boolean);
    let text = blocks.join("\n\n");
    if (text.replace(/\s/g, "").length < 200) text = (root.innerText || "").trim();
    return text;
  }

  function getText() {
    return getSelectionText() || extractArticle();
  }

  // Split into words. Very long tokens (e.g. URLs) are broken so they never
  // overflow the display.
  function toWords(text) {
    const raw = text.split(/\s+/).filter(Boolean);
    const out = [];
    for (const w of raw) {
      if (w.length <= 13) out.push(w);
      else for (let i = 0; i < w.length; i += 13) out.push(w.slice(i, i + 13));
    }
    return out;
  }

  // ---- Optimal Recognition Point (pivot letter) -------------------------
  function orpIndex(word) {
    const L = word.length;
    if (L <= 1) return 0;
    if (L <= 5) return 1;
    if (L <= 9) return 2;
    if (L <= 13) return 3;
    return 4;
  }

  function renderWord(w) {
    if (!displayEl) return;
    const p = orpIndex(w);
    const pre = w.slice(0, p);
    const piv = w.slice(p, p + 1);
    const post = w.slice(p + 1);

    const word = document.createElement("div");
    word.className = "er-rsvp-word";
    // Monospace + ch units => shifting the word left by (pre length + half the
    // pivot) lands the pivot's centre exactly on the fixed guide at 50%.
    word.style.left = "50%";
    word.style.transform = `translateX(-${pre.length + 0.5}ch)`;

    const s1 = document.createElement("span");
    s1.textContent = pre; // textContent => page text can't inject markup
    const s2 = document.createElement("span");
    s2.className = "er-orp";
    s2.textContent = piv;
    const s3 = document.createElement("span");
    s3.textContent = post;

    word.append(s1, s2, s3);
    displayEl.replaceChildren(word);
  }

  // ---- Pacing -----------------------------------------------------------
  // Base delay from WPM, with a little extra on long words and at punctuation
  // so sentences land naturally and comprehension holds.
  function delayFor(w) {
    let d = 60000 / settings.wpm;
    if (/[.!?]["')\]]?$/.test(w)) d *= 2.2;
    else if (/[,;:]["')\]]?$/.test(w)) d *= 1.5;
    if (w.length > 8) d *= 1.15;
    return d;
  }

  function tick() {
    if (idx >= words.length) {
      pause();
      idx = words.length;
      updateProgress();
      return;
    }
    renderWord(words[idx]);
    updateProgress();
    const d = delayFor(words[idx]);
    timer = setTimeout(() => {
      idx++;
      if (playing) tick();
    }, d);
  }

  // ---- Controls ---------------------------------------------------------
  function play() {
    if (idx >= words.length) idx = 0;
    if (playing) return;
    playing = true;
    updatePlayIcon();
    tick();
  }
  function pause() {
    playing = false;
    clearTimeout(timer);
    updatePlayIcon();
  }
  function toggle() {
    playing ? pause() : play();
  }
  function stepBy(n) {
    pause();
    idx = Math.min(words.length - 1, Math.max(0, idx + n));
    renderWord(words[idx]);
    updateProgress();
  }
  function restart() {
    pause();
    idx = 0;
    renderWord(words[0]);
    updateProgress();
  }
  function setWpm(v) {
    settings.wpm = Math.min(900, Math.max(100, Math.round(v)));
    if (wpmValEl) wpmValEl.textContent = settings.wpm + " wpm";
    const slider = overlay && overlay.querySelector("#er-wpm");
    if (slider) slider.value = settings.wpm;
  }

  function updatePlayIcon() {
    if (playBtn) playBtn.textContent = playing ? "⏸" : "▶";
  }
  function updateProgress() {
    const shown = Math.min(idx + 1, words.length);
    if (counterEl) counterEl.textContent = `${shown} / ${words.length}`;
    if (progressEl) progressEl.style.width = (shown / words.length) * 100 + "%";
  }

  // ---- Overlay ----------------------------------------------------------
  function buildOverlay() {
    closeOverlay();
    overlay = document.createElement("div");
    overlay.id = "easyread-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "EasyRead speed reader");
    overlay.innerHTML = `
      <div class="er-card">
        <button class="er-x" id="er-close" title="Close (Esc)" aria-label="Close">✕</button>
        <div class="er-stage">
          <div class="er-guide er-guide-top"></div>
          <div class="er-display" id="er-display" aria-live="polite"></div>
          <div class="er-guide er-guide-bottom"></div>
        </div>
        <div class="er-track"><div class="er-track-fill" id="er-progress"></div></div>
        <div class="er-controls">
          <button class="er-btn" id="er-restart" title="Restart">⏮</button>
          <button class="er-btn" id="er-back" title="Back (←)">◀</button>
          <button class="er-btn er-play" id="er-play" title="Play / Pause (Space)">▶</button>
          <button class="er-btn" id="er-fwd" title="Forward (→)">▶▶</button>
          <span class="er-counter" id="er-counter">0 / 0</span>
          <label class="er-wpm">
            <input type="range" id="er-wpm" min="100" max="900" step="25" value="300" aria-label="Words per minute">
            <span id="er-wpm-val">300 wpm</span>
          </label>
        </div>
      </div>
    `;
    document.documentElement.appendChild(overlay);

    displayEl = overlay.querySelector("#er-display");
    progressEl = overlay.querySelector("#er-progress");
    counterEl = overlay.querySelector("#er-counter");
    wpmValEl = overlay.querySelector("#er-wpm-val");
    playBtn = overlay.querySelector("#er-play");

    overlay.querySelector("#er-close").addEventListener("click", closeOverlay);
    overlay.querySelector("#er-restart").addEventListener("click", restart);
    overlay.querySelector("#er-back").addEventListener("click", () => stepBy(-1));
    overlay.querySelector("#er-fwd").addEventListener("click", () => stepBy(1));
    playBtn.addEventListener("click", toggle);

    const slider = overlay.querySelector("#er-wpm");
    slider.addEventListener("input", () => { setWpm(parseInt(slider.value, 10)); saveSettings(); });

    // Click the dim backdrop (outside the card) to close.
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });

    // Keyboard.
    overlay.tabIndex = -1;
    overlay.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "Space": e.preventDefault(); toggle(); break;
        case "Escape": e.preventDefault(); closeOverlay(); break;
        case "ArrowLeft": e.preventDefault(); stepBy(-1); break;
        case "ArrowRight": e.preventDefault(); stepBy(1); break;
        case "ArrowUp": e.preventDefault(); setWpm(settings.wpm + 25); saveSettings(); break;
        case "ArrowDown": e.preventDefault(); setWpm(settings.wpm - 25); saveSettings(); break;
      }
    });
    overlay.focus();

    setWpm(settings.wpm);
  }

  function closeOverlay() {
    pause();
    if (overlay) overlay.remove();
    overlay = displayEl = progressEl = counterEl = wpmValEl = playBtn = null;
    words = [];
    idx = 0;
  }

  // ---- Entry point ------------------------------------------------------
  function start() {
    const text = getText();
    if (!text || text.trim().length === 0) {
      alert("EasyRead: no readable text found. Try selecting some text first.");
      return;
    }
    buildOverlay();
    words = toWords(text);
    idx = 0;
    renderWord(words[0]);
    updateProgress();
    play(); // auto-start
  }

  window.addEventListener("beforeunload", closeOverlay);
  window.__easyRead = { start };
  start();
})();
