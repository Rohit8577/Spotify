const frequencies = [60, 170, 350, 1000, 3000, 10000];

const presets = {
    Custom: [0, 0, 0, 0, 0, 0],
    "Bass Boost": [10, 8, 3, 0, 0, 2],
    Vocal: [-2, -1, 3, 6, 4, 2],
    Rock: [5, 3, -2, 4, 6, 8]
};

export function createEqualizer({ player, sliders }) {
    let audioCtx;
    let source;
    let filters = [];

    function initEqualizer() {
        if (!player || audioCtx) return;

        player.crossOrigin = "anonymous";

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        source = audioCtx.createMediaElementSource(player);

        filters = frequencies.map(freq => {
            const filter = audioCtx.createBiquadFilter();

            if (freq === 60) filter.type = "lowshelf";
            else if (freq === 10000) filter.type = "highshelf";
            else filter.type = "peaking";

            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            return filter;
        });

        source.connect(filters[0]);
        for (let index = 0; index < filters.length - 1; index += 1) {
            filters[index].connect(filters[index + 1]);
        }
        filters[filters.length - 1].connect(audioCtx.destination);
        console.log("Equalizer engine started");
    }

    function applySettings(values) {
        if (!audioCtx) initEqualizer();

        sliders.forEach((slider, index) => {
            slider.value = values[index];
            if (filters[index]) {
                filters[index].gain.setTargetAtTime(values[index], audioCtx.currentTime, 0.1);
            }
        });
    }

    function bindSliders() {
        sliders.forEach((slider, index) => {
            slider.addEventListener("input", event => {
                if (!audioCtx) initEqualizer();

                const value = parseFloat(event.target.value);
                if (filters[index]) {
                    filters[index].gain.value = value;
                }
            });
        });
    }

    function bindPresetButtons() {
        document.querySelectorAll(".preset-btn").forEach(button => {
            button.addEventListener("click", event => {
                document.querySelectorAll(".preset-btn").forEach(item => item.classList.remove("active"));
                event.target.classList.add("active");

                const presetName = event.target.innerText;
                const values = presets[presetName];

                if (values) {
                    applySettings(values);
                }
            });
        });
    }

    function bindAiButton(getCurrentSongMeta) {
        const button = document.getElementById("ai-eq-btn");
        if (!button) return;

        button.addEventListener("click", async () => {
            const originalContent = button.innerHTML;
            const { song = "", artist = "" } = getCurrentSongMeta();

            button.innerHTML = `<i class="fa-solid fa-compact-disc fa-spin"></i> Analyzing...`;

            try {
                const res = await fetch(`/get-ai-eq?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`);
                const data = await res.json();

                if (data.success) {
                    console.log(`AI detected: ${data.genre}`, data.values);
                    button.innerHTML = `<i class="fa-solid fa-check"></i> Tuned: ${data.genre}`;
                    applySettings(data.values);
                } else {
                    button.innerHTML = "Failed";
                }
            } catch (error) {
                console.error(error);
                button.innerHTML = "Error";
            }

            setTimeout(() => {
                button.innerHTML = originalContent;
            }, 2000);
        });
    }

    return {
        applySettings,
        bindAiButton,
        bindPresetButtons,
        bindSliders,
        initEqualizer
    };
}
