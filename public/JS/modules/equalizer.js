// ============================================================
// Equalizer Module
// Audio EQ engine, presets, and AI auto-tune
// ============================================================

import state from "./state.js";

const frequencies = [60, 170, 350, 1000, 3000, 10000];
const sliders = document.querySelectorAll(".vertical-slider");

export function initEqualizer() {
  const audioElement = document.getElementById("player");
  if (!audioElement || state.audioCtx) return;
  audioElement.crossOrigin = "anonymous";
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  state.audioCtx = new AudioContext();
  state.source = state.audioCtx.createMediaElementSource(audioElement);

  state.filters = frequencies.map((freq) => {
    const filter = state.audioCtx.createBiquadFilter();
    if (freq === 60) filter.type = "lowshelf";
    else if (freq === 10000) filter.type = "highshelf";
    else filter.type = "peaking";
    filter.frequency.value = freq;
    filter.Q.value = 1;
    filter.gain.value = 0;
    return filter;
  });

  state.source.connect(state.filters[0]);
  for (let i = 0; i < state.filters.length - 1; i++) {
    state.filters[i].connect(state.filters[i + 1]);
  }
  state.filters[state.filters.length - 1].connect(state.audioCtx.destination);
  console.log("🎛️ Equalizer Engine Started!");
}

function applySettings(values) {
  if (!state.audioCtx) initEqualizer();
  sliders.forEach((slider, index) => {
    slider.value = values[index];
    if (state.filters[index]) {
      state.filters[index].gain.setTargetAtTime(values[index], state.audioCtx.currentTime, 0.1);
    }
  });
}

const presets = {
  Custom: [0, 0, 0, 0, 0, 0],
  "Bass Boost": [10, 8, 3, 0, 0, 2],
  Vocal: [-2, -1, 3, 6, 4, 2],
  Rock: [5, 3, -2, 4, 6, 8],
};

export function initEqualizerEvents() {
  // Slider input
  sliders.forEach((slider, index) => {
    slider.addEventListener("input", (e) => {
      if (!state.audioCtx) initEqualizer();
      const value = parseFloat(e.target.value);
      if (state.filters[index]) {
        state.filters[index].gain.value = value;
      }
    });
  });

  // Presets
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const presetName = e.target.innerText;
      const values = presets[presetName];
      if (values) applySettings(values);
    });
  });

  // AI Auto-Tune
  document.getElementById("ai-eq-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("ai-eq-btn");
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-compact-disc fa-spin"></i> Analyzing...`;

    try {
      const res = await fetch(`/get-ai-eq?song=${encodeURIComponent(state.aiCurrentSong)}&artist=${encodeURIComponent(state.aiCurrentArtist)}`);
      const data = await res.json();
      if (data.success) {
        console.log(`🤖 AI Detected: ${data.genre}`, data.values);
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Tuned: ${data.genre}`;
        applySettings(data.values);
      } else {
        btn.innerHTML = "Failed";
      }
    } catch (err) {
      console.error(err);
      btn.innerHTML = "Error";
    }

    setTimeout(() => { btn.innerHTML = originalContent; }, 2000);
  });
}
