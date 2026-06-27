// EasyRead — content script
//
// Injected on demand into the active tab. Grabs the user's selection (or the
// page's main article), opens a clean reader overlay, and reads it aloud
// word-by-word using the browser's built-in speech engine.
//
// Re-injection safety: the background script may run this file again on a tab
// where it already exists. In that case we just re-run start() rather than
// rebuilding the module or stacking event listeners.

(() => {
  if (window.__easyRead) {
    window.__easyRead.start();
    return;
  }

  const synth = window.speechSynthesis;

  // ---- State ------------------------------------------------------------
  let panel = null;       // overlay element
  let wordTokens = [];    // [{ start, end, el }] sorted by start, for highlighting
  let chunks = [];        // [{ text, offset }] sentence-sized pieces to speak
  let chunkIndex = 0;     // which sentence is currently being spoken
  let wordCursor = 0;     // index into wordTokens of the current word
  let isPaused = false;
  let activeWordEl = null;
  let voices = [];
  const settings = { rate: 1, voiceURI: null };

  // ---- Persisted settings ----------------------------------------------
  chrome.storage?.sync?.get(["rate", "voiceURI"], (s) => {
    if (s && typeof s.rate === "number") settings.rate = s.rate;
    if (s && s.voiceURI) settings.voiceURI = s.voiceURI;
  });
  function saveSettings() {
    chrome.storage?.sync?.set({ rate: settings.rate, voiceURI: settings.voiceURI });
  }

  // ---- Voices -----------------------------------------------------------
  function loadVoices() {
    voices = synth.getVoices();
  }
  loadVoices();
  if (typeof synth !== "undefined" && "onvoiceschanged" in synth) {
    synth.onvoiceschanged = () => {
      loadVoices();
      if (panel) fillVoiceSelect();
    };
  }

  function pickVoice() {
    if (settings.voiceURI) {
      const v = voices.find((x) => x.voiceURI === settings.voiceURI);
      if (v) return v;
    }
    const lang = (document.documentElement.lang || navigator.language || "en").slice(0, 2);
    return (
      voices.find((v) => v.lang.startsWith(lang) && v.localService) ||
      voices.find((v) => v.lang.startsWith(lang)) ||
      voices.find((v) => v.default) ||
      voices[0] ||
      null
    );
  }

  // ---- Text extraction --------------------------------------------------
  function getSelectionText() {
    const sel = window.getSelection();
    const t = sel ? sel.toString() : "";
    return t.trim().length > 1 ? t : "";
  }

  // Lightweight readability heuristic: prefer <article>, collect block text,
  // fall back to the container's innerText if there are no semantic blocks.
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
    if (text.replace(/\s/g, "").length < 200) {
      text = (root.innerText || "").trim();
    }
    return text;
  }

  function getText() {
    return getSelectionText() || extractArticle();
  }

  // ---- Tokenizing -------------------------------------------------------
  function tokenize(text) {
    const tokens = []; // { text, start, isWord }
    const re = /(\s+)|([^\s]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      tokens.push({ text: m[0], start: m.index, isWord: m[2] != null });
    }
    return tokens;
  }

  // Sentence-sized chunks avoid Chrome's long-utterance cutoff and keep
  // playback responsive. Each chunk records its character offset in the text.
  function sentenceChunks(text) {
    const out = [];
    const re = /[^.!?\n]+[.!?]*\n*|\n+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[0].trim().length === 0) continue;
      out.push({ text: m[0], offset: m.index });
    }
    if (out.length === 0 && text.trim()) out.push({ text, offset: 0 });
    return out;
  }

  // Binary search: index of the first word token covering/after a char index.
  function firstWordIndexAtChar(c) {
    let lo = 0;
    let hi = wordTokens.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (wordTokens[mid].end > c) {
        ans = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans;
  }

  // ---- Overlay ----------------------------------------------------------
  let readerEl = null;
  let voiceSelectEl = null;

  function fillVoiceSelect() {
    if (!voiceSelectEl) return;
    voiceSelectEl.innerHTML = "";
    voices.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelectEl.appendChild(opt);
    });
    const chosen = pickVoice();
    if (chosen) voiceSelectEl.value = chosen.voiceURI;
  }

  function buildPanel(text) {
    closePanel();

    panel = document.createElement("div");
    panel.id = "easyread-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "EasyRead reader");
    panel.innerHTML = `
      <div class="er-bar">
        <div class="er-title">EasyRead</div>
        <div class="er-controls">
          <button class="er-btn" id="er-playpause" title="Play / Pause (Space)" aria-label="Play or pause">⏸</button>
          <button class="er-btn" id="er-stop" title="Stop" aria-label="Stop">⏹</button>
          <label class="er-speed">Speed <span id="er-rate-val">1.0×</span>
            <input type="range" id="er-rate" min="0.5" max="2.5" step="0.1" value="1" aria-label="Reading speed">
          </label>
          <select class="er-voice" id="er-voice" title="Voice" aria-label="Voice"></select>
          <button class="er-btn er-close" id="er-close" title="Close (Esc)" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="er-reader" id="er-reader" tabindex="0"></div>
    `;
    document.documentElement.appendChild(panel);

    readerEl = panel.querySelector("#er-reader");

    // Render words as spans so each can be highlighted and clicked.
    const tokens = tokenize(text);
    wordTokens = [];
    const frag = document.createDocumentFragment();
    for (const tok of tokens) {
      if (tok.isWord) {
        const span = document.createElement("span");
        span.className = "er-word";
        span.textContent = tok.text; // textContent => page text can never inject HTML
        wordTokens.push({ start: tok.start, end: tok.start + tok.text.length, el: span });
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(tok.text));
      }
    }
    readerEl.appendChild(frag);

    // Click a word to jump there.
    readerEl.addEventListener("click", (e) => {
      const w = e.target.closest(".er-word");
      if (!w) return;
      const t = wordTokens.find((x) => x.el === w);
      if (t) jumpToChar(t.start);
    });

    voiceSelectEl = panel.querySelector("#er-voice");
    fillVoiceSelect();

    // Controls.
    panel.querySelector("#er-playpause").addEventListener("click", togglePlay);
    panel.querySelector("#er-stop").addEventListener("click", stopReading);
    panel.querySelector("#er-close").addEventListener("click", closePanel);

    const rate = panel.querySelector("#er-rate");
    rate.value = settings.rate;
    panel.querySelector("#er-rate-val").textContent = settings.rate.toFixed(1) + "×";
    rate.addEventListener("input", () => {
      settings.rate = parseFloat(rate.value);
      panel.querySelector("#er-rate-val").textContent = settings.rate.toFixed(1) + "×";
      saveSettings();
      restartCurrentChunk(); // apply immediately
    });

    voiceSelectEl.addEventListener("change", () => {
      settings.voiceURI = voiceSelectEl.value;
      saveSettings();
      restartCurrentChunk();
    });

    panel.addEventListener("keydown", (e) => {
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "Escape") { e.preventDefault(); closePanel(); }
    });
    readerEl.focus();
  }

  // ---- Highlighting -----------------------------------------------------
  function setActive(el) {
    if (activeWordEl === el) return;
    if (activeWordEl) activeWordEl.classList.remove("er-active");
    el.classList.add("er-active");
    activeWordEl = el;
    ensureVisible(el);
  }

  // Only scroll when the word is actually out of view (smooth-scrolling on
  // every single word is janky at speed).
  function ensureVisible(el) {
    if (!readerEl) return;
    const r = readerEl.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    if (e.top < r.top + 8 || e.bottom > r.bottom - 8) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function highlightAtChar(globalChar) {
    while (wordCursor < wordTokens.length - 1 && wordTokens[wordCursor].end <= globalChar) {
      wordCursor++;
    }
    const tok = wordTokens[wordCursor];
    if (tok) setActive(tok.el);
  }

  // ---- Speaking ---------------------------------------------------------
  function speakFromChunk(idx) {
    synth.cancel();
    chunkIndex = idx;
    isPaused = false;
    updatePlayIcon();
    speakNext();
  }

  function speakNext() {
    if (chunkIndex >= chunks.length) {
      if (activeWordEl) activeWordEl.classList.remove("er-active");
      activeWordEl = null;
      updatePlayIcon(true);
      return;
    }
    const chunk = chunks[chunkIndex];
    const u = new SpeechSynthesisUtterance(chunk.text);
    u.rate = settings.rate;
    const v = pickVoice();
    if (v) u.voice = v;

    u.onboundary = (e) => {
      if (e.name === "sentence") return;
      highlightAtChar(chunk.offset + (e.charIndex || 0));
    };
    u.onend = () => {
      if (isPaused) return;
      chunkIndex++;
      speakNext();
    };
    u.onerror = () => {
      chunkIndex++;
      speakNext();
    };
    synth.speak(u);
  }

  function restartCurrentChunk() {
    if (!panel || chunks.length === 0) return;
    wordCursor = firstWordIndexAtChar(chunks[chunkIndex]?.offset || 0);
    speakFromChunk(chunkIndex);
  }

  function jumpToChar(globalChar) {
    let idx = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].offset <= globalChar) idx = i;
      else break;
    }
    wordCursor = firstWordIndexAtChar(chunks[idx].offset);
    speakFromChunk(idx);
  }

  // ---- Controls ---------------------------------------------------------
  function togglePlay() {
    if (synth.speaking && !isPaused) {
      synth.pause();
      isPaused = true;
    } else if (isPaused) {
      synth.resume();
      isPaused = false;
    } else {
      speakFromChunk(0);
    }
    updatePlayIcon();
  }

  function stopReading() {
    synth.cancel();
    isPaused = false;
    chunkIndex = 0;
    wordCursor = 0;
    if (activeWordEl) activeWordEl.classList.remove("er-active");
    activeWordEl = null;
    updatePlayIcon(true);
  }

  function updatePlayIcon(stopped = false) {
    const btn = panel && panel.querySelector("#er-playpause");
    if (!btn) return;
    btn.textContent = stopped || isPaused || !synth.speaking ? "▶" : "⏸";
  }

  function closePanel() {
    synth.cancel();
    isPaused = false;
    if (panel) panel.remove();
    panel = null;
    readerEl = null;
    voiceSelectEl = null;
    wordTokens = [];
    chunks = [];
    chunkIndex = 0;
    wordCursor = 0;
    activeWordEl = null;
  }

  // ---- Entry point ------------------------------------------------------
  function start() {
    if (!("speechSynthesis" in window)) {
      alert("EasyRead: this browser doesn't support speech synthesis.");
      return;
    }
    const text = getText();
    if (!text || text.trim().length === 0) {
      alert("EasyRead: no readable text found on this page. Try selecting some text first.");
      return;
    }
    loadVoices();
    buildPanel(text);
    chunks = sentenceChunks(text);
    chunkIndex = 0;
    wordCursor = 0;
    speakFromChunk(0);
  }

  // Stop speech if the user navigates away.
  window.addEventListener("beforeunload", () => synth.cancel());

  // Expose a stable handle so re-injection just re-runs start().
  window.__easyRead = { start };
  start();
})();
